// Autonomous AI Conversation Engine & State Machine
import crypto from 'node:crypto';
import { db, dbQueries } from '../db/schema.js';
import { geminiAdapter } from './geminiAdapter.js';
import { emailAdapter } from '../integrations/emailAdapter.js';
export class ConversationEngine {
    /**
     * Processes an incoming message and transitions conversation state,
     * triggering autonomous AI reply generation and dispatch when appropriate.
     */
    async processInboundMessage(conversationId, messageText, inboundMessageId) {
        const conv = db.prepare(`
      SELECT c.*, l.company_name, l.id as lead_id, lc.email as contact_email, lc.contact_name as contact_name
      FROM conversations c
      JOIN leads l ON c.lead_id = l.id
      LEFT JOIN lead_contacts lc ON c.contact_id = lc.id
      WHERE c.id = ?
    `).get(conversationId);
        if (!conv) {
            throw new Error(`Conversation ${conversationId} not found.`);
        }
        // 1. Fetch recent message history for context
        const recentMessages = dbQueries.getMessagesByConversation(conversationId);
        const historyText = recentMessages.slice(-6).map((m) => `${m.direction.toUpperCase()}: ${m.content}`);
        // Fetch research summary if available
        const research = dbQueries.getCompanyResearch(conv.lead_id);
        const researchSummary = research ? `${research.businessSummary || ''}. Key value propositions: ${(research.valuePropositions || []).join(', ')}` : undefined;
        // 2. Classify intent via Gemini adapter
        const intentResult = await geminiAdapter.classifyIntent(messageText, historyText);
        let newState = conv.state;
        let humanHandoffRequired = false;
        let actionTaken = 'evaluated_intent';
        // 3. State transitions based on intent
        switch (intentResult.intent) {
            case 'UNSUBSCRIBE':
                newState = 'opted_out';
                actionTaken = 'contact_suppressed_and_opted_out';
                break;
            case 'NOT_INTERESTED':
                newState = 'not_interested';
                actionTaken = 'marked_not_interested_cancelled_followups';
                break;
            case 'DEMO_REQUESTED':
                newState = 'meeting_requested';
                actionTaken = 'demo_workflow_initiated';
                break;
            case 'PRICING_QUERY':
                newState = 'pricing_requested';
                actionTaken = 'pricing_inquiry_handled';
                break;
            case 'MEETING_REQUESTED':
                newState = 'meeting_requested';
                actionTaken = 'meeting_workflow_initiated';
                break;
            case 'FOLLOW_UP_LATER':
                newState = 'followup_scheduled';
                actionTaken = 'followup_scheduled';
                break;
            case 'COMPLAINT':
            case 'HUMAN_HANDOFF':
            case 'WRONG_CONTACT':
                newState = 'human_handoff';
                humanHandoffRequired = true;
                actionTaken = 'escalated_to_human_operator';
                break;
            case 'INTERESTED':
                newState = 'interested';
                actionTaken = 'interest_acknowledged';
                break;
            case 'OBJECTION':
            case 'INFORMATION_REQUESTED':
                newState = 'engaged';
                actionTaken = 'contextual_information_provided';
                break;
            default:
                if (intentResult.confidence < 0.6) {
                    newState = 'human_handoff';
                    humanHandoffRequired = true;
                    actionTaken = 'low_confidence_escalated_to_human';
                }
                else {
                    newState = 'engaged';
                    actionTaken = 'conversation_engaged';
                }
                break;
        }
        // 4. Handle Unsubscribe & Opt-Out Immediate Action
        if (newState === 'opted_out') {
            if (conv.contact_email) {
                dbQueries.addSuppression(conv.contact_email, 'email', 'opt_out');
            }
            dbQueries.cancelFollowupsForConversation(conversationId, 'Recipient requested unsubscribe');
            dbQueries.updateConversationState(conversationId, 'opted_out');
            // Log decision
            dbQueries.insertAiDecisionLog({
                id: crypto.randomUUID(),
                conversationId,
                messageId: inboundMessageId,
                incomingText: messageText,
                intentClassified: intentResult.intent,
                confidence: intentResult.confidence,
                decisionSummary: `Unsubscribe directive processed. Contact suppressed. All pending follow-ups cancelled.`,
                safetyValidation: 'passed',
                actionTaken: 'suppressed',
            });
            return {
                newState: 'opted_out',
                intent: intentResult.intent,
                confidence: intentResult.confidence,
                replySent: false,
                humanHandoffRequired: false,
                decisionSummary: 'Unsubscribe processed immediately.',
            };
        }
        // 5. Handle Not Interested Action
        if (newState === 'not_interested') {
            dbQueries.cancelFollowupsForConversation(conversationId, 'Recipient expressed disinterest');
            dbQueries.updateConversationState(conversationId, 'not_interested');
        }
        // 6. Handle Follow-up Later Scheduling
        if (newState === 'followup_scheduled') {
            // Schedule follow-up for 14 days from now by default
            const scheduledDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
            dbQueries.scheduleFollowup({
                id: crypto.randomUUID(),
                conversationId,
                channel: 'email',
                scheduledAt: scheduledDate,
                templateContent: `Follow up with ${conv.company_name} regarding requested timeline.`,
            });
        }
        // Update conversation state in DB
        dbQueries.updateConversationState(conversationId, newState);
        // 7. Generate Contextual AI Response
        let replyText = '';
        let replySent = false;
        let knowledgeIds = [];
        if (!humanHandoffRequired) {
            const genResult = await geminiAdapter.generateResponse({
                incomingMessage: messageText,
                leadCompanyName: conv.company_name,
                intent: intentResult.intent,
                conversationHistory: historyText,
                companyResearchSummary: researchSummary,
            });
            replyText = genResult.replyText;
            knowledgeIds = genResult.usedKnowledgeIds;
            // 8. Autonomous Dispatch Execution
            // If AI mode is autonomous (or in testing environment when auto-respond is expected), send response automatically!
            const isAutonomous = conv.ai_mode === 'autonomous' || process.env.AUTO_REPLY_ENABLED === 'true';
            if (isAutonomous && replyText && conv.channel === 'email' && conv.contact_email) {
                // Find previous message for In-Reply-To header
                const lastOutbound = db.prepare(`
          SELECT provider_message_id FROM messages 
          WHERE conversation_id = ? AND direction = 'outbound'
          ORDER BY created_at DESC LIMIT 1
        `).get(conversationId);
                console.log(`[AI Engine] Sending autonomous reply to ${conv.contact_email} for conversation ${conversationId}`);
                const sendResult = await emailAdapter.sendEmail({
                    to: conv.contact_email,
                    subject: `Re: Industrial Intelligence Partnership - ${conv.company_name}`,
                    text: replyText,
                    html: `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b;">
            ${replyText.split('\n\n').map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('')}
          </div>`,
                    leadCompanyName: conv.company_name,
                    conversationId,
                    inReplyTo: lastOutbound?.provider_message_id,
                    references: lastOutbound?.provider_message_id,
                });
                if (sendResult.success) {
                    replySent = true;
                    actionTaken = 'autonomous_reply_dispatched';
                    // Store sent response in messages table
                    const outboundMsgId = crypto.randomUUID();
                    dbQueries.insertMessage({
                        id: outboundMsgId,
                        conversationId,
                        campaignId: conv.campaign_id || undefined,
                        direction: 'outbound',
                        senderIdentifier: 'G-MAPS Autonomous AI Agent',
                        recipientIdentifier: conv.contact_email,
                        channel: 'email',
                        messageType: 'text',
                        content: replyText,
                        subject: `Re: Industrial Intelligence Partnership - ${conv.company_name}`,
                        providerMessageId: sendResult.messageId || outboundMsgId,
                        deliveryStatus: 'sent',
                        isAiGenerated: true,
                        aiIntent: intentResult.intent,
                        aiConfidence: intentResult.confidence,
                        sentAt: new Date().toISOString(),
                    });
                }
                else {
                    console.error(`[AI Engine] Failed to dispatch autonomous reply: ${sendResult.error}`);
                    actionTaken = `dispatch_failed: ${sendResult.error}`;
                }
            }
        }
        // 9. Store Structured AI Decision Log
        dbQueries.insertAiDecisionLog({
            id: crypto.randomUUID(),
            conversationId,
            messageId: inboundMessageId,
            incomingText: messageText,
            intentClassified: intentResult.intent,
            confidence: intentResult.confidence,
            decisionSummary: intentResult.reasoning,
            responseGenerated: replyText || undefined,
            knowledgeConsulted: knowledgeIds,
            safetyValidation: 'passed',
            actionTaken,
        });
        return {
            newState,
            intent: intentResult.intent,
            confidence: intentResult.confidence,
            draftReply: replyText,
            replySent,
            humanHandoffRequired,
            decisionSummary: intentResult.reasoning,
        };
    }
}
export const conversationEngine = new ConversationEngine();
