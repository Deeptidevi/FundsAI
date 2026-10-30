// Real Email Provider Integration Adapter (SMTP / API)
import nodemailer from 'nodemailer';
import { dbQueries } from '../db/schema.js';
import { RecipientPolicy } from '../security/recipientPolicy.js';
export class EmailAdapter {
    transporter = null;
    configured = false;
    configError = null;
    constructor() {
        this.initTransporter();
    }
    /**
     * Initializes real SMTP transport from environment variables
     */
    initTransporter() {
        const host = process.env.SMTP_HOST || 'smtp.gmail.com';
        const port = parseInt(process.env.SMTP_PORT || '587', 10);
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;
        if (!host || !user || !pass) {
            this.configured = false;
            this.configError = 'SMTP configuration missing. Please set SMTP_USER and SMTP_PASS (Google App Password) in your .env file.';
            return;
        }
        try {
            this.transporter = nodemailer.createTransport({
                host,
                port,
                secure: port === 465,
                auth: {
                    user,
                    pass,
                },
            });
            this.configured = true;
            this.configError = null;
        }
        catch (err) {
            this.configured = false;
            this.configError = err instanceof Error ? err.message : String(err);
        }
    }
    /**
     * Checks configuration health
     */
    async checkHealth() {
        if (!this.configured) {
            this.initTransporter();
        }
        if (!this.configured || !this.transporter) {
            return {
                status: 'unconfigured',
                message: this.configError || 'Email credentials are not configured in environment variables.',
            };
        }
        try {
            await this.transporter.verify();
            return { status: 'healthy', message: 'SMTP connection verified successfully.' };
        }
        catch (err) {
            return {
                status: 'error',
                message: `SMTP verification failed: ${err instanceof Error ? err.message : String(err)}`,
            };
        }
    }
    /**
     * Sends an email via real SMTP provider with central recipient policy enforcement
     */
    async sendEmail(options) {
        // 1. Mandatory Central Recipient Policy Enforcement (Requirement Part 12)
        const policy = RecipientPolicy.validateOutgoingRecipient(options.to, options.leadCompanyName);
        if (!policy.allowed) {
            return {
                success: false,
                error: `Security Policy Blocker: ${policy.error || 'Recipient not authorized in current EMAIL_MODE.'}`,
                originalRecipient: options.to,
            };
        }
        const cleanOriginalTo = policy.originalRecipient;
        const effectiveTo = policy.effectiveRecipient;
        // 2. Suppression list check (against the actual intended company contact)
        if (!options.isTestMode && dbQueries.isSuppressed(cleanOriginalTo, 'email')) {
            return {
                success: false,
                error: `Recipient ${cleanOriginalTo} is on the suppression/opt-out list. Send blocked.`,
                originalRecipient: cleanOriginalTo,
            };
        }
        // 3. Global sending kill switch
        if (!options.isTestMode && process.env.GLOBAL_OUTREACH_KILL_SWITCH === 'true') {
            return {
                success: false,
                error: 'Global outreach kill switch is active. Production sends are paused.',
                originalRecipient: cleanOriginalTo,
            };
        }
        if (!options.isTestMode && process.env.EMAIL_OUTREACH_ENABLED === 'false') {
            return {
                success: false,
                error: 'Email channel is disabled in server configuration (EMAIL_OUTREACH_ENABLED=false).',
                originalRecipient: cleanOriginalTo,
            };
        }
        if (!this.configured) {
            this.initTransporter();
        }
        if (!this.configured || !this.transporter) {
            return {
                success: false,
                error: `Cannot send email: ${this.configError || 'Email provider not configured.'}`,
                originalRecipient: cleanOriginalTo,
            };
        }
        const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;
        // In test mode / simulation mode, clearly annotate the subject so the tester knows which company it represents
        let finalSubject = options.subject;
        if (policy.isTestMode) {
            if (policy.isRerouted) {
                finalSubject = `[TEST SIMULATION: ${options.leadCompanyName || cleanOriginalTo}] ${options.subject}`;
            }
            else {
                finalSubject = `[G-MAPS TEST] ${options.subject}`;
            }
        }
        // Assemble headers including threading headers (Message-ID, In-Reply-To, References)
        const customHeaders = {
            ...(options.headers || {}),
            'X-Mailer': 'G-MAPS Industrial Autonomous Outreach Agent v2.0',
        };
        if (options.conversationId) {
            customHeaders['X-Gmaps-Conversation-Id'] = options.conversationId;
        }
        if (policy.isRerouted) {
            customHeaders['X-Original-Recipient'] = cleanOriginalTo;
            if (options.leadCompanyName) {
                customHeaders['X-Simulation-Lead'] = options.leadCompanyName;
            }
        }
        if (options.inReplyTo) {
            customHeaders['In-Reply-To'] = options.inReplyTo;
        }
        if (options.references) {
            customHeaders['References'] = options.references;
        }
        try {
            const info = await this.transporter.sendMail({
                from: fromAddress,
                to: effectiveTo,
                replyTo: options.replyTo || fromAddress,
                subject: finalSubject,
                html: options.html,
                text: options.text,
                headers: customHeaders,
                inReplyTo: options.inReplyTo,
                references: options.references,
            });
            return {
                success: true,
                messageId: info.messageId,
                effectiveRecipient: effectiveTo,
                originalRecipient: cleanOriginalTo,
                isRerouted: policy.isRerouted,
                accepted: info.accepted || [effectiveTo],
                rejected: info.rejected || [],
                response: info.response,
            };
        }
        catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            return {
                success: false,
                effectiveRecipient: effectiveTo,
                originalRecipient: cleanOriginalTo,
                isRerouted: policy.isRerouted,
                error: `Provider send failure: ${errMsg}`,
            };
        }
    }
}
export const emailAdapter = new EmailAdapter();
