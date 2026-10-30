// Official Meta WhatsApp Business Platform Cloud API Integration
import { db, dbQueries } from '../db/schema.js';

export interface WhatsAppSendOptions {
  to: string; // E.164 phone e.g. +919876543210
  type: 'text' | 'template';
  text?: string;
  templateName?: string;
  templateLanguage?: string;
  templateComponents?: unknown[];
  isTestMode?: boolean;
}

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  status?: string;
  error?: string;
}

export class WhatsAppAdapter {
  private apiVersion = 'v21.0';

  /**
   * Health check for Meta WhatsApp Cloud API credentials
   */
  public async checkHealth(): Promise<{ status: 'healthy' | 'unconfigured' | 'error'; message: string; details?: Record<string, unknown> }> {
    const token = process.env.META_WA_ACCESS_TOKEN;
    const phoneId = process.env.META_WA_PHONE_NUMBER_ID;

    if (!token || !phoneId) {
      return {
        status: 'unconfigured',
        message: 'Meta WhatsApp credentials missing (META_WA_ACCESS_TOKEN or META_WA_PHONE_NUMBER_ID not set).',
      };
    }

    try {
      // Query Meta Graph API for Phone Number details to verify token validity
      const res = await fetch(`https://graph.facebook.com/${this.apiVersion}/${phoneId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = (await res.json()) as Record<string, unknown>;

      if (!res.ok) {
        const errorMsg = (data.error as { message?: string })?.message || JSON.stringify(data);
        return {
          status: 'error',
          message: `Meta API verification failed: ${errorMsg}`,
          details: data,
        };
      }

      return {
        status: 'healthy',
        message: 'Meta WhatsApp Business Cloud API connected and verified.',
        details: {
          verifiedName: data.verified_name,
          displayPhoneNumber: data.display_phone_number,
          qualityRating: data.quality_rating,
        },
      };
    } catch (err: unknown) {
      return {
        status: 'error',
        message: `Network error verifying Meta credentials: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  /**
   * Dispatches outbound message through Meta Cloud API
   */
  public async sendMessage(options: WhatsAppSendOptions): Promise<WhatsAppSendResult> {
    const cleanTo = options.to.replace(/[^\d+]/g, '');

    // 1. Suppression check
    if (!options.isTestMode && dbQueries.isSuppressed(cleanTo, 'whatsapp')) {
      return {
        success: false,
        error: `Recipient ${cleanTo} has opted out or is suppressed. Outbound message blocked.`,
      };
    }

    // 2. Kill switches
    if (!options.isTestMode && process.env.GLOBAL_OUTREACH_KILL_SWITCH === 'true') {
      return {
        success: false,
        error: 'Global outreach kill switch is active. Outbound WhatsApp messages paused.',
      };
    }

    if (!options.isTestMode && process.env.WHATSAPP_OUTREACH_ENABLED === 'false') {
      return {
        success: false,
        error: 'WhatsApp channel is disabled in server configuration (WHATSAPP_OUTREACH_ENABLED=false).',
      };
    }

    const token = process.env.META_WA_ACCESS_TOKEN;
    const phoneId = process.env.META_WA_PHONE_NUMBER_ID;

    if (!token || !phoneId) {
      return {
        success: false,
        error: 'WhatsApp is not configured. Missing META_WA_ACCESS_TOKEN or META_WA_PHONE_NUMBER_ID.',
      };
    }

    // Strip leading '+' for Meta API recipient phone
    const recipientPhone = cleanTo.startsWith('+') ? cleanTo.substring(1) : cleanTo;

    const payload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipientPhone,
    };

    if (options.type === 'template') {
      if (!options.templateName) {
        return { success: false, error: 'templateName is required for template WhatsApp message.' };
      }
      payload.type = 'template';
      payload.template = {
        name: options.templateName,
        language: { code: options.templateLanguage || 'en_US' },
        components: options.templateComponents || [],
      };
    } else {
      if (!options.text) {
        return { success: false, error: 'text content is required for standard WhatsApp text message.' };
      }
      payload.type = 'text';
      payload.text = { body: options.text };
    }

    try {
      const res = await fetch(`https://graph.facebook.com/${this.apiVersion}/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as Record<string, unknown>;

      if (!res.ok) {
        const errObj = (data.error as { message?: string; code?: number }) || {};
        return {
          success: false,
          error: `Meta API error (${errObj.code || res.status}): ${errObj.message || JSON.stringify(data)}`,
        };
      }

      const messages = data.messages as Array<{ id: string }> | undefined;
      const messageId = messages && messages.length > 0 ? messages[0].id : undefined;

      return {
        success: true,
        messageId,
        status: 'sent',
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Failed to contact Meta WhatsApp API: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  /**
   * Verifies Webhook subscription challenge from Meta (GET request)
   */
  public verifyWebhookChallenge(query: { mode?: string; token?: string; challenge?: string }): { verified: boolean; challenge?: string } {
    const expectedToken = process.env.META_WA_WEBHOOK_VERIFY_TOKEN;
    if (query.mode === 'subscribe' && query.token && query.token === expectedToken) {
      return { verified: true, challenge: query.challenge };
    }
    return { verified: false };
  }

  /**
   * Processes incoming Webhook events from Meta (POST request)
   */
  public processWebhookPayload(payload: Record<string, unknown>): { processedEvents: number; errors: string[] } {
    const entryList = (payload.entry as Array<Record<string, unknown>>) || [];
    let processed = 0;
    const errors: string[] = [];

    for (const entry of entryList) {
      const changes = (entry.changes as Array<Record<string, unknown>>) || [];
      for (const change of changes) {
        const val = change.value as Record<string, unknown> | undefined;
        if (!val) continue;

        // 1. Process delivery / read statuses
        const statuses = (val.statuses as Array<Record<string, unknown>>) || [];
        for (const st of statuses) {
          const wamid = st.id as string;
          const status = st.status as string; // 'sent', 'delivered', 'read', 'failed'
          if (wamid && status) {
            db.prepare(`
              UPDATE messages 
              SET delivery_status = ?, delivered_at = CURRENT_TIMESTAMP 
              WHERE provider_message_id = ?
            `).run(status, wamid);
            processed++;
          }
        }

        // 2. Process incoming messages
        const incomingMessages = (val.messages as Array<Record<string, unknown>>) || [];
        for (const msg of incomingMessages) {
          const msgId = msg.id as string;
          const from = `+${msg.from as string}`;
          const textBody = (msg.text as { body?: string })?.body || '';

          // Deduplicate webhook event
          const existing = db.prepare('SELECT id FROM webhook_events WHERE event_id = ?').get(msgId);
          if (existing) continue;

          db.prepare(`
            INSERT INTO webhook_events (id, provider, event_id, event_type, payload, processed)
            VALUES (?, 'meta_whatsapp', ?, 'incoming_message', ?, 1)
          `).run(`evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, msgId, JSON.stringify(msg));

          // Check for opt-out request ("STOP", "UNSUBSCRIBE", "DON'T MESSAGE")
          const cleanText = textBody.trim().toUpperCase();
          if (['STOP', 'UNSUBSCRIBE', 'CANCEL', 'OPT OUT', 'OPTOUT'].includes(cleanText)) {
            dbQueries.addSuppression(from, 'whatsapp', 'opt_out');
          }

          // Link to existing conversation or create new thread
          let conv = db.prepare(`
            SELECT c.* FROM conversations c
            JOIN lead_contacts lc ON c.contact_id = lc.id
            WHERE lc.phone_e164 = ? AND c.channel = 'whatsapp'
          `).get(from) as { id: string } | undefined;

          if (!conv) {
            // Find lead by phone
            const contact = db.prepare('SELECT id, lead_id FROM lead_contacts WHERE phone_e164 = ?').get(from) as { id: string; lead_id: string } | undefined;
            if (contact) {
              const convId = `conv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
              db.prepare(`
                INSERT INTO conversations (id, lead_id, contact_id, channel, external_thread_id, state)
                VALUES (?, ?, ?, 'whatsapp', ?, 'engaged')
              `).run(convId, contact.lead_id, contact.id, from);
              conv = { id: convId };
            }
          }

          if (conv) {
            dbQueries.insertMessage({
              id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              conversationId: conv.id,
              direction: 'inbound',
              senderIdentifier: from,
              recipientIdentifier: (val.metadata as { display_phone_number?: string })?.display_phone_number || 'G-MAPS',
              channel: 'whatsapp',
              messageType: (msg.type as string) || 'text',
              content: textBody,
              providerMessageId: msgId,
              deliveryStatus: 'received',
            });
            processed++;
          }
        }
      }
    }

    return { processedEvents: processed, errors };
  }
}

export const whatsappAdapter = new WhatsAppAdapter();
