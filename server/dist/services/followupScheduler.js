// Autonomous Persistent Follow-up Scheduler
import crypto from 'node:crypto';
import { db, dbQueries } from '../db/schema.js';
import { emailAdapter } from '../integrations/emailAdapter.js';
export class FollowupScheduler {
    timer = null;
    isRunning = false;
    isProcessing = false;
    pollIntervalMs = 30000; // 30 seconds
    start() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        console.log(`[Follow-up Scheduler] Starting persistent follow-up scheduler (poll: ${this.pollIntervalMs / 1000}s)`);
        this.timer = setInterval(() => {
            this.processDueFollowups().catch((err) => {
                console.error('[Follow-up Scheduler] Error during execution:', err);
            });
        }, this.pollIntervalMs);
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.isRunning = false;
        console.log('[Follow-up Scheduler] Follow-up scheduler stopped.');
    }
    /**
     * Processes due followups atomically
     */
    async processDueFollowups() {
        if (this.isProcessing)
            return 0;
        this.isProcessing = true;
        let sentCount = 0;
        try {
            // Find all followups where scheduled_at <= now and status = 'scheduled'
            const dueFollowups = dbQueries.getPendingFollowups();
            if (!dueFollowups || dueFollowups.length === 0) {
                return 0;
            }
            console.log(`[Follow-up Scheduler] Found ${dueFollowups.length} follow-up(s) ready for evaluation.`);
            for (const f of dueFollowups) {
                // 1. Mandatory Safety & Suppression Checks
                if (['opted_out', 'not_interested', 'human_handoff', 'closed'].includes(f.conversation_state)) {
                    console.log(`[Follow-up Scheduler] Cancelling follow-up ${f.id}: Conversation is in state "${f.conversation_state}".`);
                    db.prepare(`
            UPDATE followups 
            SET status = 'cancelled', cancel_reason = ? 
            WHERE id = ?
          `).run(`Conversation state is ${f.conversation_state}`, f.id);
                    continue;
                }
                if (f.contact_email && dbQueries.isSuppressed(f.contact_email, 'email')) {
                    console.log(`[Follow-up Scheduler] Cancelling follow-up ${f.id}: Recipient ${f.contact_email} is on suppression list.`);
                    db.prepare(`
            UPDATE followups 
            SET status = 'cancelled', cancel_reason = 'Recipient on suppression list' 
            WHERE id = ?
          `).run(f.id);
                    continue;
                }
                // 2. Check if recipient replied after this follow-up was scheduled
                const subsequentInbound = db.prepare(`
          SELECT id FROM messages 
          WHERE conversation_id = ? AND direction = 'inbound' AND created_at >= ?
          LIMIT 1
        `).get(f.conversation_id, f.created_at);
                if (subsequentInbound) {
                    console.log(`[Follow-up Scheduler] Cancelling follow-up ${f.id}: Recipient already provided an incoming response.`);
                    db.prepare(`
            UPDATE followups 
            SET status = 'cancelled', cancel_reason = 'Recipient already replied' 
            WHERE id = ?
          `).run(f.id);
                    continue;
                }
                if (!f.contact_email) {
                    console.log(`[Follow-up Scheduler] Skipping follow-up ${f.id}: No valid contact email.`);
                    continue;
                }
                // 3. Dispatch follow-up email
                const followUpSubject = `Following up regarding industrial intelligence for ${f.company_name}`;
                const followUpText = f.template_content || `Dear ${f.company_name} Team,\n\nI wanted to gently follow up on my previous note regarding G-MAPS industrial geospatial intelligence.\n\nHave you had an opportunity to review whether regional manufacturing cluster discovery aligns with your team's current business development goals?\n\nBest regards,\nG-MAPS Industrial Outreach Team`;
                // Find last outbound message ID for threading
                const lastOutbound = db.prepare(`
          SELECT provider_message_id FROM messages 
          WHERE conversation_id = ? AND direction = 'outbound'
          ORDER BY created_at DESC LIMIT 1
        `).get(f.conversation_id);
                console.log(`[Follow-up Scheduler] Dispatching follow-up for conversation ${f.conversation_id} to ${f.contact_email}`);
                const sendResult = await emailAdapter.sendEmail({
                    to: f.contact_email,
                    subject: followUpSubject,
                    text: followUpText,
                    html: `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b;">
            <p>Dear <strong>${f.company_name} Team</strong>,</p>
            <p>I wanted to follow up on our previous note regarding G-MAPS industrial geospatial intelligence.</p>
            <p>Have you had an opportunity to review how regional manufacturing cluster discovery can expand supplier and B2B contracts for your facilities?</p>
            <p>Feel free to reply directly to this email with any question or preferred timing.</p>
            <br/>
            <p>Best regards,<br/><strong>G-MAPS Industrial Outreach Team</strong></p>
          </div>`,
                    leadCompanyName: f.company_name,
                    conversationId: f.conversation_id,
                    inReplyTo: lastOutbound?.provider_message_id,
                    references: lastOutbound?.provider_message_id,
                });
                if (sendResult.success) {
                    sentCount++;
                    // Mark follow-up as sent
                    db.prepare(`
            UPDATE followups 
            SET status = 'sent' 
            WHERE id = ?
          `).run(f.id);
                    // Insert into messages table
                    const msgId = crypto.randomUUID();
                    db.prepare(`
            INSERT INTO messages (
              id, conversation_id, lead_id, channel, direction,
              status, content, subject, provider_message_id, created_at, sent_at
            ) VALUES (?, ?, ?, 'email', 'outbound', 'sent', ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `).run(msgId, f.conversation_id, f.lead_id, followUpText, followUpSubject, sendResult.messageId || msgId);
                    // Update conversation timestamp
                    db.prepare(`
            UPDATE conversations 
            SET last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
          `).run(f.conversation_id);
                }
                else {
                    console.error(`[Follow-up Scheduler] Failed to send follow-up ${f.id}:`, sendResult.error);
                }
            }
        }
        finally {
            this.isProcessing = false;
        }
        return sentCount;
    }
}
export const followupScheduler = new FollowupScheduler();
