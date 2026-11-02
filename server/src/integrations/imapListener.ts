// Real IMAP Mailbox Listener & Reply Synchronization Service
import { ImapFlow } from 'imapflow';
import { simpleParser, ParsedMail } from 'mailparser';
import crypto from 'node:crypto';
import { db, dbQueries } from '../db/schema.js';
import { conversationEngine } from '../ai/conversationEngine.js';

export interface ImapSyncResult {
  success: boolean;
  messagesProcessed: number;
  matchedConversations: number;
  error?: string;
  lastUid?: number;
}

export class ImapListener {
  private isRunning: boolean = false;
  private pollIntervalMs: number = 30000; // 30 seconds default
  private timer: NodeJS.Timeout | null = null;
  private isSyncing: boolean = false;

  constructor() {
    const customInterval = process.env.INCOMING_EMAIL_POLL_INTERVAL_MS;
    if (customInterval) {
      const parsed = parseInt(customInterval, 10);
      if (!isNaN(parsed) && parsed >= 5000) {
        this.pollIntervalMs = parsed;
      }
    }
  }

  /**
   * Starts periodic polling for new incoming email replies
   */
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[IMAP Listener] Starting incoming mailbox listener (poll interval: ${this.pollIntervalMs / 1000}s)`);

    // Run initial sync after a short boot delay
    setTimeout(() => {
      this.syncInbox().catch((err) => {
        console.error('[IMAP Listener] Initial sync error:', err.message);
      });
    }, 3000);

    this.timer = setInterval(() => {
      this.syncInbox().catch((err) => {
        console.error('[IMAP Listener] Periodic sync error:', err.message);
      });
    }, this.pollIntervalMs);
  }

  /**
   * Stops periodic polling
   */
  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    console.log('[IMAP Listener] Incoming mailbox listener stopped.');
  }

  /**
   * Synchronizes incoming messages from IMAP INBOX
   */
  public async syncInbox(): Promise<ImapSyncResult> {
    if (this.isSyncing) {
      return { success: true, messagesProcessed: 0, matchedConversations: 0 };
    }

    const host = process.env.IMAP_HOST || 'imap.gmail.com';
    const port = parseInt(process.env.IMAP_PORT || '993', 10);
    const user = process.env.IMAP_USER || '';
    const pass = process.env.IMAP_PASS || '';

    if (!user || !pass) {
      return {
        success: false,
        messagesProcessed: 0,
        matchedConversations: 0,
        error: 'IMAP credentials not configured (IMAP_USER / IMAP_PASS missing)',
      };
    }

    this.isSyncing = true;
    const client = new ImapFlow({
      host,
      port,
      secure: process.env.IMAP_SECURE !== 'false',
      auth: { user, pass },
      logger: false,
    });

    // Prevent unhandled error event crash on socket ECONNRESET / network drops
    client.on('error', (err) => {
      console.warn('[IMAP Listener] Socket warning (handled):', err.message);
    });

    let processedCount = 0;
    let matchedCount = 0;

    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');

      try {
        const mailbox = client.mailbox;
        if (!mailbox) {
          throw new Error('Could not access INBOX mailbox.');
        }

        const checkpoint = dbQueries.getSyncCheckpoint('INBOX');
        const nextUid = mailbox.uidNext || 1;

        // Cold start protection: If no checkpoint exists or last_uid is 0,
        // initialize to the current highest UID so we do NOT ingest thousands of historical personal emails!
        if (!checkpoint || checkpoint.last_uid <= 0) {
          const initialUid = Math.max(1, nextUid - 1);
          console.log(`[IMAP Listener] Initializing INBOX checkpoint at UID ${initialUid} (cold start protection).`);
          dbQueries.updateSyncCheckpoint('INBOX', initialUid, 'idle');
          return {
            success: true,
            messagesProcessed: 0,
            matchedConversations: 0,
            lastUid: initialUid,
          };
        }

        const startUid = checkpoint.last_uid + 1;
        if (startUid > nextUid) {
          // No new messages
          dbQueries.updateSyncCheckpoint('INBOX', checkpoint.last_uid, 'idle');
          return {
            success: true,
            messagesProcessed: 0,
            matchedConversations: 0,
            lastUid: checkpoint.last_uid,
          };
        }

        console.log(`[IMAP Listener] Checking for new messages from UID ${startUid} to * (nextUid: ${nextUid})`);
        dbQueries.updateSyncCheckpoint('INBOX', checkpoint.last_uid, 'syncing');

        // Fetch new messages since checkpoint
        const messages = client.fetch(`${startUid}:*`, {
          uid: true,
          envelope: true,
          source: true,
        });

        let highestUid = checkpoint.last_uid;

        for await (const message of messages) {
          if (!message.uid) continue;
          if (message.uid <= checkpoint.last_uid) continue;
          if (message.uid > highestUid) {
            highestUid = message.uid;
          }

          processedCount++;

          // Parse full email structure using mailparser
          let parsed: ParsedMail | null = null;
          if (message.source) {
            try {
              parsed = await simpleParser(message.source);
            } catch (err: unknown) {
              console.error(`[IMAP Listener] Failed to parse message UID ${message.uid}:`, err);
            }
          }

          if (!parsed) continue;

          const senderEmail = parsed.from?.value[0]?.address?.toLowerCase() || '';
          const subject = parsed.subject || message.envelope?.subject || '(No Subject)';
          const textBody = this.extractCleanBody(parsed);
          const rawMessageId = parsed.messageId || '';
          const cleanMessageId = rawMessageId.replace(/^<|>$/g, '');

          // Extract threading headers
          const inReplyTo = parsed.inReplyTo ? String(parsed.inReplyTo).replace(/^<|>$/g, '') : undefined;
          let references: string[] = [];
          if (parsed.references) {
            if (Array.isArray(parsed.references)) {
              references = parsed.references.map((r) => String(r).replace(/^<|>$/g, ''));
            } else {
              references = [String(parsed.references).replace(/^<|>$/g, '')];
            }
          }

          const convIdHeader = parsed.headers.get('x-gmaps-conversation-id') as string | undefined;

          // Deduplication: Skip if message ID is already registered
          if (cleanMessageId) {
            const existing = db.prepare('SELECT id FROM messages WHERE provider_message_id LIKE ? OR provider_message_id = ?').get(`%${cleanMessageId}%`, cleanMessageId);
            if (existing) {
              continue;
            }
          }

          // Match inbound message to company/lead conversation
          const match = dbQueries.findConversationForInbound({
            senderEmail,
            inReplyTo,
            references,
            subject,
            conversationIdHeader: convIdHeader,
          });

          if (match) {
            matchedCount++;
            console.log(`[IMAP Listener] Matched incoming email to conversation ${match.conversationId} (Lead: ${match.leadId})`);

            const inboundMsgId = crypto.randomUUID();
            dbQueries.insertMessage({
              id: inboundMsgId,
              conversationId: match.conversationId,
              campaignId: match.campaignId || undefined,
              direction: 'inbound',
              senderIdentifier: senderEmail,
              recipientIdentifier: 'G-MAPS Inbound',
              channel: 'email',
              messageType: 'text',
              content: textBody,
              subject,
              providerMessageId: cleanMessageId || inboundMsgId,
              deliveryStatus: 'received',
              sentAt: parsed.date ? parsed.date.toISOString() : new Date().toISOString(),
            });

            // Trigger AI Conversation Engine for autonomous intent analysis and reply generation
            try {
              await conversationEngine.processInboundMessage(match.conversationId, textBody, inboundMsgId);
            } catch (aiErr: unknown) {
              console.error(`[IMAP Listener] AI processing failed for conversation ${match.conversationId}:`, aiErr);
            }
          } else {
            console.log(`[IMAP Listener] Inbound message from "${senderEmail}" with subject "${subject}" did not match any active outreach campaign. Ignored.`);
          }
        }

        // Record persistent checkpoint
        dbQueries.updateSyncCheckpoint('INBOX', highestUid, 'idle');

        return {
          success: true,
          messagesProcessed: processedCount,
          matchedConversations: matchedCount,
          lastUid: highestUid,
        };
      } finally {
        lock.release();
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('[IMAP Listener] Sync error:', errMsg);
      dbQueries.updateSyncCheckpoint('INBOX', 0, 'error', errMsg);
      return {
        success: false,
        messagesProcessed: processedCount,
        matchedConversations: matchedCount,
        error: errMsg,
      };
    } finally {
      try {
        await client.logout();
      } catch {
        // Ignore logout errors
      }
      this.isSyncing = false;
    }
  }

  /**
   * Cleans quotes, email signatures, and disclaimers to extract only the actual user reply
   */
  private extractCleanBody(parsed: ParsedMail): string {
    const rawText = parsed.text || '';
    if (!rawText.trim()) {
      // Fallback to strip HTML
      if (parsed.html) {
        return parsed.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      }
      return '(Empty message body)';
    }

    // Split lines and trim quoted responses (lines starting with '>', 'On ... wrote:', etc.)
    const lines = rawText.split(/\r?\n/);
    const cleanLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      // Stop or ignore if we hit standard email reply headers
      if (/^On\s.+wrote:$/i.test(trimmed)) break;
      if (/^-----Original Message-----/i.test(trimmed)) break;
      if (/^From:\s.+/i.test(trimmed) && cleanLines.length > 0) break;
      if (trimmed.startsWith('>')) continue;

      cleanLines.push(line);
    }

    const result = cleanLines.join('\n').trim();
    return result || rawText.trim();
  }
}

export const imapListener = new ImapListener();
