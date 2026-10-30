import { db } from './client.js';
export { db };
import {
  Lead,
  LeadContact,
  Campaign,
  Conversation,
  Message,
  CompanyKnowledgeItem,
  CompanyResearch,
  DashboardMetrics,
} from '@gmaps/shared';

export const dbQueries = {
  // --- METRICS ---
  getDashboardMetrics(): DashboardMetrics {
    const totalLeads = (db.prepare('SELECT COUNT(*) as count FROM leads').get() as { count: number }).count;
    const validLeads = (db.prepare("SELECT COUNT(*) as count FROM leads WHERE status != 'suppressed'").get() as { count: number }).count;
    const invalidLeads = (db.prepare('SELECT COUNT(*) as count FROM import_errors').get() as { count: number }).count;
    const duplicates = (db.prepare("SELECT COALESCE(SUM(duplicate_rows), 0) as count FROM import_jobs").get() as { count: number }).count;
    const eligibleLeads = (db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'new'").get() as { count: number }).count;
    const pendingApprovals = (db.prepare("SELECT COUNT(*) as count FROM campaigns WHERE status = 'pending_approval'").get() as { count: number }).count;

    const emailsSent = (db.prepare("SELECT COUNT(*) as count FROM messages WHERE channel = 'email' AND direction = 'outbound' AND delivery_status IN ('sent', 'delivered', 'read')").get() as { count: number }).count;
    const emailFailures = (db.prepare("SELECT COUNT(*) as count FROM messages WHERE channel = 'email' AND direction = 'outbound' AND delivery_status = 'failed'").get() as { count: number }).count;

    const whatsappSent = (db.prepare("SELECT COUNT(*) as count FROM messages WHERE channel = 'whatsapp' AND direction = 'outbound' AND delivery_status IN ('sent', 'delivered', 'read')").get() as { count: number }).count;
    const whatsappFailures = (db.prepare("SELECT COUNT(*) as count FROM messages WHERE channel = 'whatsapp' AND direction = 'outbound' AND delivery_status = 'failed'").get() as { count: number }).count;

    const repliesReceived = (db.prepare("SELECT COUNT(*) as count FROM messages WHERE direction = 'inbound'").get() as { count: number }).count;
    const interestedLeads = (db.prepare("SELECT COUNT(*) as count FROM conversations WHERE state = 'interested'").get() as { count: number }).count;
    const meetingsRequested = (db.prepare("SELECT COUNT(*) as count FROM conversations WHERE state = 'meeting_requested'").get() as { count: number }).count;
    const humanHandoffs = (db.prepare("SELECT COUNT(*) as count FROM conversations WHERE state = 'human_handoff'").get() as { count: number }).count;
    const optOuts = (db.prepare("SELECT COUNT(*) as count FROM suppression_list WHERE reason = 'opt_out'").get() as { count: number }).count;
    const pendingJobs = (db.prepare("SELECT COUNT(*) as count FROM message_jobs WHERE status IN ('pending', 'leased')").get() as { count: number }).count;

    return {
      totalLeads,
      validLeads,
      invalidLeads,
      duplicates,
      eligibleLeads,
      pendingApprovals,
      emailsSent,
      emailFailures,
      whatsappSent,
      whatsappFailures,
      repliesReceived,
      interestedLeads,
      meetingsRequested,
      humanHandoffs,
      optOuts,
      pendingJobs,
    };
  },

  // --- LEADS ---
  getLeads(limit = 100, offset = 0, filterStatus?: string, filterCity?: string, filterTier?: string) {
    let sql = 'SELECT * FROM leads WHERE 1=1';
    const params: (string | number)[] = [];

    if (filterStatus) {
      sql += ' AND status = ?';
      params.push(filterStatus);
    }
    if (filterCity) {
      sql += ' AND city = ?';
      params.push(filterCity);
    }
    if (filterTier) {
      sql += ' AND tier = ?';
      params.push(filterTier);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const leads = db.prepare(sql).all(...params) as Record<string, unknown>[];

    // Fetch primary contacts for each lead
    const contactStmt = db.prepare('SELECT * FROM lead_contacts WHERE lead_id = ?');
    return leads.map((lead) => {
      const contacts = contactStmt.all(lead.id) as LeadContact[];
      return {
        ...lead,
        contacts,
      };
    });
  },

  getLeadById(id: string) {
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!lead) return null;
    const contacts = db.prepare('SELECT * FROM lead_contacts WHERE lead_id = ?').all(id) as LeadContact[];
    const conversations = db.prepare('SELECT * FROM conversations WHERE lead_id = ?').all(id) as Conversation[];
    return {
      ...lead,
      contacts,
      conversations,
    };
  },

  insertLead(lead: Partial<Lead>) {
    const stmt = db.prepare(`
      INSERT INTO leads (
        id, place_id, company_name, primary_type, tier, rating, review_count,
        address, city, state, country, postal_code, latitude, longitude,
        website, google_maps_url, source, status, priority, notes, custom_fields
      ) VALUES (
        @id, @placeId, @companyName, @primaryType, @tier, @rating, @reviewCount,
        @address, @city, @state, @country, @postalCode, @latitude, @longitude,
        @website, @googleMapsUrl, @source, @status, @priority, @notes, @customFields
      )
    `);

    return stmt.run({
      id: lead.id,
      placeId: lead.placeId || null,
      companyName: lead.companyName,
      primaryType: lead.primaryType || null,
      tier: lead.tier || 'Unranked',
      rating: lead.rating || 0.0,
      reviewCount: lead.reviewCount || 0,
      address: lead.address || null,
      city: lead.city || null,
      state: lead.state || null,
      country: lead.country || 'India',
      postalCode: lead.postalCode || null,
      latitude: lead.latitude || null,
      longitude: lead.longitude || null,
      website: lead.website || null,
      googleMapsUrl: lead.googleMapsUrl || null,
      source: lead.source || 'manual_import',
      status: lead.status || 'new',
      priority: lead.priority || 'medium',
      notes: lead.notes || null,
      customFields: lead.customFields ? JSON.stringify(lead.customFields) : null,
    });
  },

  insertContact(contact: Partial<LeadContact>) {
    const stmt = db.prepare(`
      INSERT INTO lead_contacts (
        id, lead_id, contact_name, designation, email, phone_raw, phone_e164, phone_type, is_primary, is_verified
      ) VALUES (
        @id, @leadId, @contactName, @designation, @email, @phoneRaw, @phoneE164, @phoneType, @isPrimary, @isVerified
      )
    `);
    return stmt.run({
      id: contact.id,
      leadId: contact.leadId,
      contactName: contact.contactName || null,
      designation: contact.designation || null,
      email: contact.email ? contact.email.toLowerCase().trim() : null,
      phoneRaw: contact.phoneRaw || null,
      phoneE164: contact.phoneE164 || null,
      phoneType: contact.phoneType || 'Unknown',
      isPrimary: contact.isPrimary ? 1 : 0,
      isVerified: contact.isVerified ? 1 : 0,
    });
  },

  // --- SUPPRESSION & OPT-OUT ---
  isSuppressed(identifier: string, channel: 'email' | 'whatsapp'): boolean {
    const clean = identifier.toLowerCase().trim();
    const row = db.prepare(`
      SELECT id FROM suppression_list 
      WHERE identifier = ? AND (channel = ? OR channel = 'all')
    `).get(clean, channel);
    return !!row;
  },

  addSuppression(identifier: string, channel: 'email' | 'whatsapp' | 'all', reason: 'opt_out' | 'hard_bounce' | 'spam_complaint' | 'manual_block') {
    const clean = identifier.toLowerCase().trim();
    const id = `supp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    return db.prepare(`
      INSERT OR IGNORE INTO suppression_list (id, identifier, channel, reason)
      VALUES (?, ?, ?, ?)
    `).run(id, clean, channel, reason);
  },

  // --- CAMPAIGNS ---
  getCampaigns() {
    return db.prepare('SELECT * FROM campaigns ORDER BY created_at DESC').all() as Campaign[];
  },

  getCampaignById(id: string) {
    return db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id) as Campaign | undefined;
  },

  insertCampaign(campaign: Partial<Campaign>) {
    const stmt = db.prepare(`
      INSERT INTO campaigns (
        id, name, purpose, channels, status, target_criteria, email_subject, email_body_template,
        whatsapp_template_name, whatsapp_template_namespace, ai_personalization_rules, daily_send_limit, total_leads_targeted
      ) VALUES (
        @id, @name, @purpose, @channels, @status, @targetCriteria, @emailSubject, @emailBodyTemplate,
        @whatsappTemplateName, @whatsappTemplateNamespace, @aiPersonalizationRules, @dailySendLimit, @totalLeadsTargeted
      )
    `);
    return stmt.run({
      id: campaign.id,
      name: campaign.name,
      purpose: campaign.purpose || null,
      channels: JSON.stringify(campaign.channels || []),
      status: campaign.status || 'draft',
      targetCriteria: campaign.targetCriteria ? JSON.stringify(campaign.targetCriteria) : null,
      emailSubject: campaign.emailSubject || null,
      emailBodyTemplate: campaign.emailBodyTemplate || null,
      whatsappTemplateName: campaign.whatsappTemplateName || null,
      whatsappTemplateNamespace: campaign.whatsappTemplateNamespace || null,
      aiPersonalizationRules: campaign.aiPersonalizationRules ? JSON.stringify(campaign.aiPersonalizationRules) : null,
      dailySendLimit: campaign.dailySendLimit || 100,
      totalLeadsTargeted: campaign.totalLeadsTargeted || 0,
    });
  },

  updateCampaignStatus(id: string, status: string, approverId?: string) {
    if (status === 'approved') {
      return db.prepare(`
        UPDATE campaigns 
        SET status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(status, approverId || null, id);
    }
    return db.prepare(`
      UPDATE campaigns 
      SET status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(status, id);
  },

  // --- CONVERSATIONS & INBOX ---
  getConversations(channel?: string, state?: string) {
    let sql = `
      SELECT c.*, l.company_name, l.city, lc.contact_name, lc.email, lc.phone_e164
      FROM conversations c
      JOIN leads l ON c.lead_id = l.id
      LEFT JOIN lead_contacts lc ON c.contact_id = lc.id
      WHERE 1=1
    `;
    const params: string[] = [];
    if (channel) {
      sql += ' AND c.channel = ?';
      params.push(channel);
    }
    if (state) {
      sql += ' AND c.state = ?';
      params.push(state);
    }
    sql += ' ORDER BY c.last_message_at DESC, c.created_at DESC';
    return db.prepare(sql).all(...params);
  },

  getMessagesByConversation(conversationId: string) {
    return db.prepare(`
      SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC
    `).all(conversationId) as Message[];
  },

  insertMessage(msg: Partial<Message>) {
    const stmt = db.prepare(`
      INSERT INTO messages (
        id, conversation_id, campaign_id, direction, sender_identifier, recipient_identifier,
        channel, message_type, content, subject, provider_message_id, delivery_status,
        is_ai_generated, ai_intent, ai_confidence, error_details, sent_at
      ) VALUES (
        @id, @conversationId, @campaignId, @direction, @senderIdentifier, @recipientIdentifier,
        @channel, @messageType, @content, @subject, @providerMessageId, @deliveryStatus,
        @isAiGenerated, @aiIntent, @aiConfidence, @errorDetails, @sentAt
      )
    `);
    const res = stmt.run({
      id: msg.id,
      conversationId: msg.conversationId,
      campaignId: msg.campaignId || null,
      direction: msg.direction,
      senderIdentifier: msg.senderIdentifier,
      recipientIdentifier: msg.recipientIdentifier,
      channel: msg.channel,
      messageType: msg.messageType || 'text',
      content: msg.content,
      subject: msg.subject || null,
      providerMessageId: msg.providerMessageId || null,
      deliveryStatus: msg.deliveryStatus || 'queued',
      isAiGenerated: msg.isAiGenerated ? 1 : 0,
      aiIntent: msg.aiIntent || null,
      aiConfidence: msg.aiConfidence || null,
      errorDetails: msg.errorDetails || null,
      sentAt: msg.sentAt || null,
    });

    db.prepare(`
      UPDATE conversations 
      SET last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(msg.conversationId);

    return res;
  },

  // --- COMPANY KNOWLEDGE BASE ---
  getCompanyKnowledge(category?: string) {
    if (category) {
      return db.prepare('SELECT * FROM company_knowledge WHERE category = ? AND is_active = 1').all(category) as CompanyKnowledgeItem[];
    }
    return db.prepare('SELECT * FROM company_knowledge ORDER BY category ASC, created_at DESC').all() as CompanyKnowledgeItem[];
  },

  insertKnowledge(item: Partial<CompanyKnowledgeItem>) {
    const stmt = db.prepare(`
      INSERT INTO company_knowledge (id, category, title, content, is_active, verified_by)
      VALUES (@id, @category, @title, @content, @isActive, @verifiedBy)
    `);
    return stmt.run({
      id: item.id,
      category: item.category,
      title: item.title,
      content: item.content,
      isActive: item.isActive !== false ? 1 : 0,
      verifiedBy: item.verifiedBy || null,
    });
  },

  // --- TEST RUNS ---
  insertTestRun(run: {
    id: string;
    testType: string;
    recipient: string;
    inputPayload: Record<string, unknown>;
    outputResult?: Record<string, unknown>;
    status: 'passed' | 'failed' | 'running';
    errorDetails?: string;
  }) {
    const stmt = db.prepare(`
      INSERT INTO test_runs (id, test_type, recipient, input_payload, output_result, status, error_details)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      run.id,
      run.testType,
      run.recipient,
      JSON.stringify(run.inputPayload),
      run.outputResult ? JSON.stringify(run.outputResult) : null,
      run.status,
      run.errorDetails || null
    );
  },

  getTestRuns(limit = 50) {
    return db.prepare('SELECT * FROM test_runs ORDER BY created_at DESC LIMIT ?').all(limit);
  },

  // --- AUDIT LOGS ---
  insertAuditLog(log: {
    id: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    details?: Record<string, unknown>;
    userId?: string;
    ipAddress?: string;
  }) {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      log.id,
      log.userId || null,
      log.action,
      log.resourceType,
      log.resourceId || null,
      log.details ? JSON.stringify(log.details) : null,
      log.ipAddress || null
    );
  },

  // --- COMPANY RESEARCH ---
  saveCompanyResearch(research: {
    id: string;
    leadId: string;
    companyName: string;
    industry?: string;
    productsServices?: string;
    businessSummary?: string;
    valuePropositions: string[];
    sources: string[];
    verifiedFacts: Record<string, unknown>;
  }) {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO company_research (
        id, lead_id, company_name, industry, products_services, business_summary,
        value_propositions, sources, verified_facts, researched_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    return stmt.run(
      research.id,
      research.leadId,
      research.companyName,
      research.industry || null,
      research.productsServices || null,
      research.businessSummary || null,
      JSON.stringify(research.valuePropositions || []),
      JSON.stringify(research.sources || []),
      JSON.stringify(research.verifiedFacts || {})
    );
  },

  getCompanyResearch(leadId: string): CompanyResearch | null {
    const row = db.prepare('SELECT * FROM company_research WHERE lead_id = ? ORDER BY researched_at DESC LIMIT 1').get(leadId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      id: row.id as string,
      leadId: row.lead_id as string,
      companyName: row.company_name as string,
      industry: (row.industry as string) || undefined,
      productsServices: (row.products_services as string) || undefined,
      businessSummary: (row.business_summary as string) || undefined,
      valuePropositions: row.value_propositions ? JSON.parse(row.value_propositions as string) : [],
      sources: row.sources ? JSON.parse(row.sources as string) : [],
      verifiedFacts: row.verified_facts ? JSON.parse(row.verified_facts as string) : {},
      researchedAt: (row.researched_at as string) || new Date().toISOString(),
    };
  },

  // --- EMAIL DRAFTS ---
  saveEmailDraft(draft: {
    id: string;
    campaignId?: string;
    leadId: string;
    contactId?: string;
    subject: string;
    htmlContent: string;
    plainContent?: string;
    researchId?: string;
    status: string;
    aiModel?: string;
    confidence?: number;
  }) {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO email_drafts (
        id, campaign_id, lead_id, contact_id, subject, html_content,
        plain_content, research_id, status, ai_model, confidence, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    return stmt.run(
      draft.id,
      draft.campaignId || null,
      draft.leadId,
      draft.contactId || null,
      draft.subject,
      draft.htmlContent,
      draft.plainContent || null,
      draft.researchId || null,
      draft.status,
      draft.aiModel || null,
      draft.confidence || 0.95
    );
  },

  getEmailDrafts(campaignId: string) {
    return db.prepare(`
      SELECT ed.*, l.company_name, lc.email as contact_email
      FROM email_drafts ed
      JOIN leads l ON ed.lead_id = l.id
      LEFT JOIN lead_contacts lc ON ed.contact_id = lc.id
      WHERE ed.campaign_id = ?
      ORDER BY ed.created_at DESC
    `).all(campaignId);
  },

  updateEmailDraftStatus(id: string, status: string) {
    return db.prepare('UPDATE email_drafts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
  },

  // --- ACTION TOKENS (Interactive Email Click Responses) ---
  createActionToken(token: {
    token: string;
    conversationId: string;
    leadId: string;
    campaignId?: string;
    actionType: string;
    recipientEmail: string;
    expiresInHours?: number;
  }) {
    const expiresHours = token.expiresInHours || 168; // 7 days default
    const stmt = db.prepare(`
      INSERT INTO action_tokens (
        token, conversation_id, lead_id, campaign_id, action_type, recipient_email, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now', '+${expiresHours} hours'))
    `);
    return stmt.run(
      token.token,
      token.conversationId,
      token.leadId,
      token.campaignId || null,
      token.actionType,
      token.recipientEmail
    );
  },

  getActionToken(tokenStr: string) {
    return db.prepare(`
      SELECT * FROM action_tokens WHERE token = ?
    `).get(tokenStr) as Record<string, unknown> | undefined;
  },

  consumeActionToken(tokenStr: string, ip?: string, userAgent?: string) {
    return db.prepare(`
      UPDATE action_tokens
      SET is_used = 1, used_at = CURRENT_TIMESTAMP, user_ip = ?, user_agent = ?
      WHERE token = ?
    `).run(ip || null, userAgent || null, tokenStr);
  },

  // --- EMAIL SYNC CHECKPOINTS ---
  getSyncCheckpoint(mailbox: string) {
    return db.prepare('SELECT * FROM email_sync_checkpoints WHERE mailbox = ?').get(mailbox) as {
      mailbox: string;
      last_uid: number;
      last_synced_at: string;
      status: string;
      last_error?: string;
    } | undefined;
  },

  updateSyncCheckpoint(mailbox: string, lastUid: number, status = 'idle', lastError?: string) {
    const stmt = db.prepare(`
      INSERT INTO email_sync_checkpoints (mailbox, last_uid, last_synced_at, status, last_error)
      VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?)
      ON CONFLICT(mailbox) DO UPDATE SET
        last_uid = MAX(last_uid, excluded.last_uid),
        last_synced_at = CURRENT_TIMESTAMP,
        status = excluded.status,
        last_error = excluded.last_error
    `);
    return stmt.run(mailbox, lastUid, status, lastError || null);
  },

  // --- AI DECISION LOGS ---
  insertAiDecisionLog(log: {
    id: string;
    conversationId?: string;
    messageId?: string;
    incomingText?: string;
    intentClassified: string;
    confidence: number;
    decisionSummary: string;
    responseGenerated?: string;
    knowledgeConsulted?: string[];
    safetyValidation: string;
    actionTaken: string;
  }) {
    const stmt = db.prepare(`
      INSERT INTO ai_decision_logs (
        id, conversation_id, message_id, incoming_text, intent_classified,
        confidence, decision_summary, response_generated, knowledge_consulted,
        safety_validation, action_taken
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      log.id,
      log.conversationId || null,
      log.messageId || null,
      log.incomingText || null,
      log.intentClassified,
      log.confidence,
      log.decisionSummary,
      log.responseGenerated || null,
      log.knowledgeConsulted ? JSON.stringify(log.knowledgeConsulted) : null,
      log.safetyValidation,
      log.actionTaken
    );
  },

  getAiDecisionLogs(limit = 50) {
    return db.prepare(`
      SELECT ad.*, c.lead_id, l.company_name
      FROM ai_decision_logs ad
      LEFT JOIN conversations c ON ad.conversation_id = c.id
      LEFT JOIN leads l ON c.lead_id = l.id
      ORDER BY ad.created_at DESC
      LIMIT ?
    `).all(limit);
  },

  // --- INBOUND CONVERSATION MATCHING ---
  findConversationForInbound(params: {
    senderEmail: string;
    inReplyTo?: string;
    references?: string[];
    subject?: string;
    conversationIdHeader?: string;
  }): { conversationId: string; leadId: string; campaignId?: string } | null {
    // 1. Explicit conversation ID header in email
    if (params.conversationIdHeader) {
      const match = db.prepare('SELECT id, lead_id FROM conversations WHERE id = ?').get(params.conversationIdHeader) as { id: string; lead_id: string } | undefined;
      if (match) return { conversationId: match.id, leadId: match.lead_id };
    }

    // 2. Thread matching via In-Reply-To / References against provider_message_id
    const messageIdsToTest: string[] = [];
    if (params.inReplyTo) messageIdsToTest.push(params.inReplyTo.trim());
    if (params.references && params.references.length > 0) {
      messageIdsToTest.push(...params.references.map((r) => r.trim()));
    }

    for (const msgId of messageIdsToTest) {
      const cleanId = msgId.replace(/^<|>$/g, '');
      const prevMsg = db.prepare(`
        SELECT conversation_id, campaign_id FROM messages 
        WHERE provider_message_id LIKE ? OR provider_message_id = ?
        LIMIT 1
      `).get(`%${cleanId}%`, cleanId) as { conversation_id: string; campaign_id?: string } | undefined;

      if (prevMsg) {
        const conv = db.prepare('SELECT id, lead_id FROM conversations WHERE id = ?').get(prevMsg.conversation_id) as { id: string; lead_id: string } | undefined;
        if (conv) return { conversationId: conv.id, leadId: conv.lead_id, campaignId: prevMsg.campaign_id };
      }
    }

    // 3. Sender contact matching
    const contact = db.prepare(`
      SELECT lead_id FROM lead_contacts 
      WHERE LOWER(email) = LOWER(?)
      LIMIT 1
    `).get(params.senderEmail) as { lead_id: string } | undefined;

    if (contact) {
      const conv = db.prepare(`
        SELECT id FROM conversations 
        WHERE lead_id = ? AND channel = 'email'
        ORDER BY last_message_at DESC LIMIT 1
      `).get(contact.lead_id) as { id: string } | undefined;

      if (conv) return { conversationId: conv.id, leadId: contact.lead_id };
    }

    // 4. Fallback: match most recently contacted lead in TEST mode if sender is the test allowlisted mailbox
    const cleanSender = params.senderEmail.toLowerCase().trim();
    const testAllowed = (process.env.TEST_ALLOWLIST_EMAIL || '').toLowerCase().trim();
    if (cleanSender === testAllowed) {
      // Find the most recent active conversation where an email was dispatched
      const recentConv = db.prepare(`
        SELECT c.id, c.lead_id 
        FROM conversations c
        JOIN messages m ON m.conversation_id = c.id
        WHERE c.channel = 'email' AND m.direction = 'outbound'
        ORDER BY m.created_at DESC LIMIT 1
      `).get() as { id: string; lead_id: string } | undefined;

      if (recentConv) {
        return { conversationId: recentConv.id, leadId: recentConv.lead_id };
      }
    }

    return null;
  },

  updateConversationState(conversationId: string, state: string, aiMode?: string) {
    if (aiMode) {
      return db.prepare(`
        UPDATE conversations 
        SET state = ?, ai_mode = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(state, aiMode, conversationId);
    }
    return db.prepare(`
      UPDATE conversations 
      SET state = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(state, conversationId);
  },

  // --- AUTONOMOUS FOLLOW-UPS ---
  scheduleFollowup(followup: {
    id: string;
    conversationId: string;
    channel: 'email' | 'whatsapp';
    scheduledAt: string;
    templateContent?: string;
  }) {
    const stmt = db.prepare(`
      INSERT INTO followups (id, conversation_id, channel, scheduled_at, template_content, status)
      VALUES (?, ?, ?, ?, ?, 'scheduled')
    `);
    return stmt.run(
      followup.id,
      followup.conversationId,
      followup.channel,
      followup.scheduledAt,
      followup.templateContent || null
    );
  },

  cancelFollowupsForConversation(conversationId: string, reason: string) {
    return db.prepare(`
      UPDATE followups 
      SET status = 'cancelled', cancel_reason = ? 
      WHERE conversation_id = ? AND status = 'scheduled'
    `).run(reason, conversationId);
  },

  getPendingFollowups() {
    return db.prepare(`
      SELECT f.*, c.lead_id, c.contact_id, c.state as conversation_state, l.company_name, lc.email as contact_email
      FROM followups f
      JOIN conversations c ON f.conversation_id = c.id
      JOIN leads l ON c.lead_id = l.id
      LEFT JOIN lead_contacts lc ON c.contact_id = lc.id
      WHERE f.status = 'scheduled' AND datetime(f.scheduled_at) <= datetime('now')
    `).all();
  },
};

