# G-MAPS INDUSTRIAL INTELLIGENCE: EXTERNAL INTEGRATIONS GUIDE

**Document Version:** 1.0.0  
**Scope:** Real-World External Provider Setup (Meta WhatsApp, SMTP Email, Gemini AI, Google Places)

---

## 1. Official Meta WhatsApp Business Platform Cloud API

G-MAPS integrates strictly with the **official Meta Cloud API (Graph API v21.0)**. Unofficial browser scrapers, WhatsApp Web automation, or personal number hijacking are prohibited.

### Required Prerequisites:
1. **Meta Business Account:** Created at [business.facebook.com](https://business.facebook.com/).
2. **Meta Developer App:** Created at [developers.facebook.com](https://developers.facebook.com/) under "Business" app type.
3. **WhatsApp Product Added:** Navigate to App Dashboard -> Add Products -> WhatsApp.

### Configuration Variables:
| Variable Name | Description | Where to Acquire |
|:---|:---|:---|
| `META_WA_ACCESS_TOKEN` | System User Permanent Token | Business Manager -> Users -> System Users -> Generate Token (`whatsapp_business_messaging`, `whatsapp_business_management`). |
| `META_WA_PHONE_NUMBER_ID` | Phone Number ID | Meta Developer App -> WhatsApp -> API Setup -> Phone Number ID. |
| `META_WA_BUSINESS_ACCOUNT_ID` | WhatsApp Business Account ID (WABA ID) | Meta Developer App -> WhatsApp -> API Setup -> WhatsApp Business Account ID. |
| `META_WA_WEBHOOK_VERIFY_TOKEN` | Secret Verification Token | Create a random string (e.g. `gmaps_sec_8932470129`) and enter it in Meta Webhook config. |

### Webhook Configuration:
- **Callback URL:** `https://your-domain.com/api/webhooks/whatsapp`
- **Verify Token:** Matching `META_WA_WEBHOOK_VERIFY_TOKEN`.
- **Subscribed Fields:** `messages`, `message_deliveries`, `message_reads`.

---

## 2. Production Email Provider (SMTP / IMAP / API)

Supports Google Workspace, Microsoft 365, GoDaddy, or transactional SMTP relays (SendGrid, Mailgun, Resend, Amazon SES).

### Recommended Google Workspace Setup:
1. Log in to your Google Account Admin Console.
2. Enable 2-Factor Authentication on the sending mailbox.
3. Generate a 16-character **App Password** (under Security -> 2-Step Verification -> App Passwords).
4. Configure in `.env`:
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-address@yourcompany.com
   SMTP_PASS=xxxx-xxxx-xxxx-xxxx
   SMTP_FROM="G-MAPS Industrial" <your-address@yourcompany.com>
   ```

---

## 3. Google Gemini AI API

Powers B2B lead intent classification, RAG retrieval against verified company knowledge, and AI Copilot response drafts.

### Setup:
1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Generate an API Key under your project.
3. Configure in `.env`:
   ```bash
   GEMINI_API_KEY=AIzaSy...
   ```
4. **Model Selection:** `gemini-2.5-flash` is used as the default fast, structured JSON model.

---

## 4. Google Places API (New)

Powers industrial manufacturing facility discovery, geodetic bounding box filtering, and place details extraction.

### Setup:
1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Enable **Places API (New)** on your project.
3. Create an API Key under APIs & Services -> Credentials.
4. Restrict key to "Places API (New)".
5. Configure in `.env`:
   ```bash
   GOOGLE_PLACES_API_KEY=AIzaSy...
   ```
6. **Security Hardening:** The API key is stored strictly on the backend server. The client browser never receives this key.
