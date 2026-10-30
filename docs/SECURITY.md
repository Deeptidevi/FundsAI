# G-MAPS INDUSTRIAL INTELLIGENCE: SECURITY & COMPLIANCE SPECIFICATION

**Document Version:** 1.0.0  
**Scope:** Secret Management, Injection Defenses, Opt-Out Compliance, Human Approval Gates

---

## 1. Secret Protection & API Key Isolation

- **Zero Client-Side Credentials:** All WhatsApp access tokens, SMTP credentials, Google Places keys, and Gemini API keys are held strictly in server environment memory (`process.env`).
- **Network Sanitization:** Health check endpoints (`/api/analytics/integrations-health`) only report status strings (`healthy`, `unconfigured`, `error`) and never return credentials, keys, or bearer tokens to the browser.
- **Git Protection:** `.env` is explicitly ignored by version control. `.env.example` contains only blank specification placeholders.

---

## 2. CSV / Spreadsheet Formula Injection (DDE) Mitigation

Spreadsheet software (Microsoft Excel, LibreOffice Calc, Google Sheets) interprets cells starting with `=`, `+`, `-`, `@`, `\t`, or `\r` as executable formulas, creating Remote Code Execution (RCE) vectors via malicious company names or addresses.

### Mitigation in `exportService.ts`:
Every string cell value exported via `/api/export/leads.csv` is sanitized:
```typescript
if (['=', '+', '-', '@', '\t', '\r'].some(char => trimmed.startsWith(char))) {
  return `'${str}`; // Escape with leading quote
}
```

---

## 3. Human Approval Gate (Zero Unintended Outreach)

- **Requirement Compliance:** "Uploading an Excel file must never automatically trigger production outreach."
- **Enforcement:** Ingesting spreadsheets via `/api/leads/import/execute` only creates leads in state `new` with campaign lead status `pending`.
- **Approval Verification:** Background job dispatching strictly requires an authenticated human call to `POST /api/campaigns/:id/approve`. Unapproved campaigns remain halted indefinitely.

---

## 4. Consent & Suppression List Compliance

- **Channel Opt-Out Enforcement:** Outbound email and WhatsApp adapters immediately check the `suppression_list` table before dispatching messages.
- **Automated Inbound Opt-Out Detection:** Inbound messages matching "STOP", "UNSUBSCRIBE", "CANCEL", or "OPT OUT" automatically register the sender's E.164 phone or lowercase email to `suppression_list` and transition conversation state to `opted_out`.
- **Global Kill Switch:** The server checks `GLOBAL_OUTREACH_KILL_SWITCH`. When set to `true`, all outbound production messaging halts instantly.
