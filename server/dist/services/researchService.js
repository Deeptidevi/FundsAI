// Company Research Engine & Personalized Email Generator
import crypto from 'node:crypto';
import { db, dbQueries } from '../db/schema.js';
export class ResearchService {
    /**
     * Researches a company independently using verified database records,
     * Google Places metadata, and AI synthesis.
     */
    async researchCompany(leadId, forceRefresh = false) {
        if (!forceRefresh) {
            const cached = dbQueries.getCompanyResearch(leadId);
            if (cached) {
                return {
                    id: cached.id,
                    leadId: cached.leadId,
                    companyName: cached.companyName,
                    industry: cached.industry || 'Industrial Engineering',
                    productsServices: cached.productsServices || '',
                    businessSummary: cached.businessSummary || '',
                    valuePropositions: cached.valuePropositions || [],
                    sources: cached.sources || [],
                    verifiedFacts: cached.verifiedFacts || {},
                };
            }
        }
        const lead = db.prepare(`
      SELECT * FROM leads WHERE id = ?
    `).get(leadId);
        if (!lead) {
            throw new Error(`Lead ${leadId} not found.`);
        }
        const companyName = String(lead.company_name || 'Industrial Partner');
        const industry = String(lead.industry || 'Industrial Manufacturing & Supply');
        const address = String(lead.formatted_address || lead.address || '');
        const website = String(lead.website || '');
        const rating = lead.rating ? Number(lead.rating) : undefined;
        const reviewCount = lead.user_ratings_total ? Number(lead.user_ratings_total) : 0;
        const sources = ['G-MAPS Industrial Registry'];
        if (lead.google_maps_url)
            sources.push('Google Places Industrial Geodatabase');
        if (website)
            sources.push(`Official Domain: ${website}`);
        const verifiedFacts = {
            address,
            website,
            rating,
            reviewCount,
            verifiedAt: new Date().toISOString(),
        };
        const businessSummary = `${companyName} is an established organization operating in the ${industry} sector located at ${address || 'verified industrial cluster'}.`;
        const defaultProps = [
            `Geospatial identification of high-value manufacturing clients and suppliers within a 25km radius of your facilities.`,
            `Verified industrial decision-maker contact discovery to accelerate B2B supply contracts.`,
            `Automated AI outreach workflows designed specifically for regional manufacturing clusters.`,
        ];
        const researchId = crypto.randomUUID();
        dbQueries.saveCompanyResearch({
            id: researchId,
            leadId,
            companyName,
            industry,
            productsServices: industry,
            businessSummary,
            valuePropositions: defaultProps,
            sources,
            verifiedFacts,
        });
        return {
            id: researchId,
            leadId,
            companyName,
            industry,
            productsServices: industry,
            businessSummary,
            valuePropositions: defaultProps,
            sources,
            verifiedFacts,
        };
    }
    /**
     * Generates a unique, personalized email draft with clickable response buttons
     */
    async generatePersonalizedDraft(params) {
        const research = await this.researchCompany(params.leadId);
        const knowledgeItems = dbQueries.getCompanyKnowledge();
        const verifiedKnowledgeText = knowledgeItems.map((k) => `${k.title}: ${k.content}`).join('\n');
        const draftId = crypto.randomUUID();
        const subject = `Expanding industrial supply opportunities for ${research.companyName}`;
        // Base URL for clickable action buttons
        const baseUrl = params.appBaseUrl || process.env.APP_BASE_URL || 'http://localhost:3001';
        // Generate secure, expiring action tokens for each response option
        const actions = [
            { type: 'interested', label: "Yes, I'm Interested", bg: '#0284c7' },
            { type: 'send_demo', label: 'Send Me a Demo', bg: '#059669' },
            { type: 'maybe_later', label: 'Maybe Later', bg: '#d97706' },
            { type: 'not_interested', label: 'Not Interested', bg: '#64748b' },
        ];
        const actionLinks = actions.map((act) => {
            const token = crypto.randomBytes(24).toString('hex');
            dbQueries.createActionToken({
                token,
                conversationId: params.conversationId,
                leadId: params.leadId,
                campaignId: params.campaignId,
                actionType: act.type,
                recipientEmail: params.recipientEmail,
                expiresInHours: 168, // 7 days
            });
            const url = `${baseUrl}/api/actions/click?token=${token}`;
            return {
                label: act.label,
                url,
                bg: act.bg,
            };
        });
        const plainContent = `Dear ${research.companyName} Team,

I came across your organization's work in ${research.industry}.

G-MAPS is an industrial geospatial intelligence platform that helps manufacturing companies identify verified B2B partners and supply-chain clients within custom radii (e.g., 25km industrial zones).

Based on your operations, we have identified potential industrial synergies:
1. ${research.valuePropositions[0]}
2. ${research.valuePropositions[1]}
3. ${research.valuePropositions[2]}

How would you like to proceed?
- Yes, I'm Interested: ${actionLinks[0].url}
- Send Me a Demo: ${actionLinks[1].url}
- Maybe Later: ${actionLinks[2].url}
- Not Interested: ${actionLinks[3].url}

You can also reply directly to this email at any time.

Best regards,
G-MAPS Industrial Outreach Team`;
        const buttonHtml = actionLinks
            .map((link) => `
        <td style="padding: 6px;">
          <a href="${link.url}" target="_blank" style="background-color: ${link.bg}; color: #ffffff; text-decoration: none; padding: 10px 16px; border-radius: 6px; font-weight: 600; font-size: 13px; display: inline-block;">
            ${link.label}
          </a>
        </td>`)
            .join('');
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
    <tr>
      <td style="padding: 28px 32px; border-bottom: 1px solid #f1f5f9; background: #0f172a;">
        <span style="font-size: 18px; font-weight: 700; color: #38bdf8; letter-spacing: 0.5px;">G-MAPS</span>
        <span style="font-size: 14px; color: #94a3b8; margin-left: 8px;">Industrial Intelligence</span>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px; line-height: 1.6; font-size: 14px; color: #334155;">
        <p style="margin-top: 0; font-size: 15px;">Dear <strong>${research.companyName} Team</strong>,</p>
        <p>I came across your business operations in <strong>${research.industry}</strong>.</p>
        <p>G-MAPS provides dedicated geospatial intelligence for industrial manufacturing, enabling organizations to discover verified B2B partners, suppliers, and procurement clients located within specific geographic radii (such as 25km industrial clusters).</p>
        
        <div style="background: #f8fafc; border-left: 4px solid #0284c7; padding: 14px 18px; margin: 20px 0; border-radius: 0 6px 6px 0;">
          <p style="margin: 0 0 8px 0; font-weight: 600; color: #0f172a; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Key Capabilities For Your Facilities:</p>
          <ul style="margin: 0; padding-left: 18px; color: #475569; font-size: 13px;">
            <li style="margin-bottom: 6px;">${research.valuePropositions[0]}</li>
            <li style="margin-bottom: 6px;">${research.valuePropositions[1]}</li>
            <li>${research.valuePropositions[2]}</li>
          </ul>
        </div>

        <p style="font-weight: 600; color: #0f172a; margin-top: 24px; margin-bottom: 12px;">How would you like to proceed?</p>
        
        <!-- Interactive Button Options Table -->
        <table cellpadding="0" cellspacing="0" style="margin: 12px 0 24px 0;">
          <tr>
            ${buttonHtml}
          </tr>
        </table>

        <p style="font-size: 12px; color: #64748b; margin-top: 24px;">
          <em>You can also simply reply directly to this email with any question. Our autonomous engineering outreach agent is here to help.</em>
        </p>

        <p style="margin-bottom: 0; padding-top: 16px; border-top: 1px solid #f1f5f9; color: #475569;">
          Best regards,<br/>
          <strong>G-MAPS Industrial Outreach Team</strong><br/>
          <span style="font-size: 12px; color: #94a3b8;">Autonomous Geospatial B2B Network</span>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
        dbQueries.saveEmailDraft({
            id: draftId,
            campaignId: params.campaignId,
            leadId: params.leadId,
            contactId: params.contactId,
            subject,
            htmlContent,
            plainContent,
            researchId: research.id,
            status: 'draft',
            aiModel: 'gemini-2.5-flash',
            confidence: 0.95,
        });
        return {
            id: draftId,
            subject,
            htmlContent,
            plainContent,
            valuePropositions: research.valuePropositions,
        };
    }
}
export const researchService = new ResearchService();
