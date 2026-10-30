// Campaign Orchestration Service with Multi-Step Approval and Validation
import { db, dbQueries } from '../db/schema.js';
import { jobWorker } from '../jobs/jobWorker.js';
import { Campaign, OutreachChannel } from '@gmaps/shared';

export interface CreateCampaignDTO {
  name: string;
  purpose?: string;
  channels: OutreachChannel[];
  emailSubject?: string;
  emailBodyTemplate?: string;
  whatsappTemplateName?: string;
  whatsappTemplateNamespace?: string;
  dailySendLimit?: number;
  leadIds: string[];
}

export interface CampaignPreviewResult {
  campaignId: string;
  samplePreviews: Array<{
    leadId: string;
    companyName: string;
    recipient: string;
    channel: OutreachChannel;
    renderedSubject?: string;
    renderedContent: string;
    isSuppressed: boolean;
  }>;
  totalEligible: number;
  totalSuppressed: number;
}

export class CampaignService {
  /**
   * Creates a draft campaign and links targeted leads
   */
  public createDraftCampaign(data: CreateCampaignDTO): { campaignId: string; totalTargeted: number } {
    const campaignId = `cmp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    dbQueries.insertCampaign({
      id: campaignId,
      name: data.name,
      purpose: data.purpose,
      channels: data.channels,
      status: 'draft',
      emailSubject: data.emailSubject,
      emailBodyTemplate: data.emailBodyTemplate,
      whatsappTemplateName: data.whatsappTemplateName,
      whatsappTemplateNamespace: data.whatsappTemplateNamespace,
      dailySendLimit: data.dailySendLimit || 100,
      totalLeadsTargeted: data.leadIds.length,
    });

    const linkStmt = db.prepare(`
      INSERT OR IGNORE INTO campaign_leads (id, campaign_id, lead_id, contact_id, status)
      VALUES (?, ?, ?, ?, 'pending')
    `);

    let linkedCount = 0;
    const linkTx = db.transaction(() => {
      for (const leadId of data.leadIds) {
        const contact = db.prepare('SELECT id FROM lead_contacts WHERE lead_id = ? AND is_primary = 1').get(leadId) as { id: string } | undefined;
        linkStmt.run(`cpl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, campaignId, leadId, contact?.id || null);
        linkedCount++;
      }
    });

    linkTx();

    return { campaignId, totalTargeted: linkedCount };
  }

  /**
   * Generates message previews and validates recipient eligibility
   */
  public generatePreview(campaignId: string): CampaignPreviewResult {
    const campaign = dbQueries.getCampaignById(campaignId);
    if (!campaign) throw new Error(`Campaign ${campaignId} not found.`);

    const leads = db.prepare(`
      SELECT l.*, lc.id as contact_id, lc.contact_name, lc.email, lc.phone_e164
      FROM campaign_leads cl
      JOIN leads l ON cl.lead_id = l.id
      LEFT JOIN lead_contacts lc ON l.id = lc.lead_id AND lc.is_primary = 1
      WHERE cl.campaign_id = ?
    `).all(campaignId) as Array<{
      id: string;
      company_name: string;
      city?: string;
      contact_id?: string;
      contact_name?: string;
      email?: string;
      phone_e164?: string;
    }>;

    const samplePreviews: CampaignPreviewResult['samplePreviews'] = [];
    let totalEligible = 0;
    let totalSuppressed = 0;

    const channels: OutreachChannel[] = typeof campaign.channels === 'string' ? JSON.parse(campaign.channels) : campaign.channels;

    for (const lead of leads) {
      for (const ch of channels) {
        const recipient = ch === 'email' ? lead.email : lead.phone_e164;
        if (!recipient) continue;

        const isSuppressed = dbQueries.isSuppressed(recipient, ch);
        if (isSuppressed) {
          totalSuppressed++;
        } else {
          totalEligible++;
        }

        // Render preview with lead variables
        const rawSubject = (campaign as unknown as Record<string, string>).email_subject || campaign.emailSubject || '';
        const rawContent = (campaign as unknown as Record<string, string>).email_body_template || campaign.emailBodyTemplate || '';

        let renderedSubject = rawSubject.replace(/{{company_name}}/g, lead.company_name);
        let renderedContent = rawContent
          .replace(/{{company_name}}/g, lead.company_name)
          .replace(/{{contact_name}}/g, lead.contact_name || 'Engineering Team')
          .replace(/{{city}}/g, lead.city || 'your region');

        if (samplePreviews.length < 5) {
          samplePreviews.push({
            leadId: lead.id,
            companyName: lead.company_name,
            recipient,
            channel: ch,
            renderedSubject: ch === 'email' ? renderedSubject : undefined,
            renderedContent,
            isSuppressed,
          });
        }
      }
    }

    return {
      campaignId,
      samplePreviews,
      totalEligible,
      totalSuppressed,
    };
  }

  /**
   * Explicit Human Approval Gate.
   * Uploading spreadsheets NEVER triggers outreach automatically.
   * Production outreach can ONLY be enqueued after this explicit approval method is called.
   */
  public approveAndEnqueueCampaign(campaignId: string, approverId?: string): { enqueuedJobs: number } {
    const campaign = dbQueries.getCampaignById(campaignId);
    if (!campaign) throw new Error(`Campaign ${campaignId} not found.`);

    // 1. Mark campaign approved
    dbQueries.updateCampaignStatus(campaignId, 'approved', approverId);

    // 2. Fetch targeted leads and prepare durable jobs
    const targets = db.prepare(`
      SELECT l.*, lc.id as contact_id, lc.contact_name, lc.email, lc.phone_e164
      FROM campaign_leads cl
      JOIN leads l ON cl.lead_id = l.id
      LEFT JOIN lead_contacts lc ON l.id = lc.lead_id AND lc.is_primary = 1
      WHERE cl.campaign_id = ? AND cl.status = 'pending'
    `).all(campaignId) as Array<{
      id: string;
      company_name: string;
      city?: string;
      contact_id?: string;
      contact_name?: string;
      email?: string;
      phone_e164?: string;
    }>;

    const channels: OutreachChannel[] = typeof campaign.channels === 'string' ? JSON.parse(campaign.channels) : campaign.channels;
    let enqueuedJobs = 0;

    for (const lead of targets) {
      for (const ch of channels) {
        const recipient = ch === 'email' ? lead.email : lead.phone_e164;
        if (!recipient) continue;

        // Skip suppressed
        if (dbQueries.isSuppressed(recipient, ch)) continue;

        // Render template variables
        const rawSubject = (campaign as unknown as Record<string, string>).email_subject || campaign.emailSubject || '';
        const rawContent = (campaign as unknown as Record<string, string>).email_body_template || campaign.emailBodyTemplate || '';

        let content = rawContent
          .replace(/{{company_name}}/g, lead.company_name)
          .replace(/{{contact_name}}/g, lead.contact_name || 'Engineering Team')
          .replace(/{{city}}/g, lead.city || 'your region');

        let subject = rawSubject.replace(/{{company_name}}/g, lead.company_name);

        const idempotencyKey = `cmp-${campaignId}-${lead.id}-${ch}`;
        jobWorker.enqueueJob(
          ch === 'email' ? 'send_email' : 'send_whatsapp',
          {
            campaignId,
            leadId: lead.id,
            contactId: lead.contact_id,
            channel: ch,
            recipient,
            subject: ch === 'email' ? subject : undefined,
            content,
            templateName: ch === 'whatsapp' ? campaign.whatsappTemplateName || undefined : undefined,
          },
          idempotencyKey
        );

        enqueuedJobs++;
      }
    }

    // Set status to running
    dbQueries.updateCampaignStatus(campaignId, 'running');

    return { enqueuedJobs };
  }

  public pauseCampaign(campaignId: string): void {
    dbQueries.updateCampaignStatus(campaignId, 'paused');
  }

  public resumeCampaign(campaignId: string): void {
    dbQueries.updateCampaignStatus(campaignId, 'running');
  }

  public cancelCampaign(campaignId: string): void {
    dbQueries.updateCampaignStatus(campaignId, 'cancelled');
  }
}

export const campaignService = new CampaignService();
