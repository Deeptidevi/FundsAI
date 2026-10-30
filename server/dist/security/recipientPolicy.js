// Server-Enforced Recipient Policy & Test Isolation (Requirement Part 12)
// Strictly guards all outbound email dispatches against contacting real customer addresses.
export class RecipientPolicy {
    static isTestMode() {
        const mode = (process.env.EMAIL_MODE || 'TEST').toUpperCase();
        return mode !== 'PRODUCTION';
    }
    static getAllowedTestRecipients() {
        const list = [];
        if (process.env.TEST_ALLOWLIST_EMAIL) {
            list.push(process.env.TEST_ALLOWLIST_EMAIL.toLowerCase().trim());
        }
        if (process.env.TEST_MAILBOX) {
            list.push(process.env.TEST_MAILBOX.toLowerCase().trim());
        }
        if (process.env.TEST_ALLOWED_RECIPIENTS) {
            const parts = process.env.TEST_ALLOWED_RECIPIENTS.split(',').map((s) => s.toLowerCase().trim());
            list.push(...parts);
        }
        // Default fallback to configured sender/test mailbox if present
        if (process.env.SMTP_USER) {
            list.push(process.env.SMTP_USER.toLowerCase().trim());
        }
        return Array.from(new Set(list.filter(Boolean)));
    }
    /**
     * Enforces central recipient policy before ANY outgoing email can be dispatched.
     * In TEST MODE (default):
     * - Real customer addresses are NEVER contacted.
     * - Messages are strictly routed to the authorized test mailbox with simulation metadata.
     * - If no test mailbox is configured, dispatch is hard-rejected.
     */
    static validateOutgoingRecipient(targetRecipient, leadCompanyName) {
        const cleanTarget = (targetRecipient || '').toLowerCase().trim();
        const isTest = this.isTestMode();
        const allowedList = this.getAllowedTestRecipients();
        if (!cleanTarget) {
            return {
                allowed: false,
                effectiveRecipient: '',
                originalRecipient: '',
                isTestMode: isTest,
                isRerouted: false,
                error: 'Recipient email address is missing or empty.',
            };
        }
        // In PRODUCTION mode (only if explicitly configured as EMAIL_MODE=PRODUCTION)
        if (!isTest) {
            return {
                allowed: true,
                effectiveRecipient: cleanTarget,
                originalRecipient: cleanTarget,
                isTestMode: false,
                isRerouted: false,
            };
        }
        // --- TEST MODE ENFORCEMENT ---
        if (allowedList.length === 0) {
            return {
                allowed: false,
                effectiveRecipient: '',
                originalRecipient: cleanTarget,
                isTestMode: true,
                isRerouted: false,
                error: 'Security Blocker: TEST MODE is active but no TEST_ALLOWLIST_EMAIL or TEST_MAILBOX is configured in server .env.',
            };
        }
        // Direct match with authorized test mailbox
        if (allowedList.includes(cleanTarget)) {
            return {
                allowed: true,
                effectiveRecipient: cleanTarget,
                originalRecipient: cleanTarget,
                isTestMode: true,
                isRerouted: false,
            };
        }
        // If target is an external company address:
        // Strictly reroute to primary test mailbox with simulation metadata so the real customer is NEVER emailed.
        const primaryTestMailbox = allowedList[0];
        return {
            allowed: true,
            effectiveRecipient: primaryTestMailbox,
            originalRecipient: cleanTarget,
            isTestMode: true,
            isRerouted: true,
        };
    }
}
