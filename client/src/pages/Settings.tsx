import React from 'react';
import {
  ShieldAlert,
  Lock,
  FileSpreadsheet,
  Key,
  Database,
  CheckCircle,
} from 'lucide-react';

export const Settings: React.FC = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white">System Settings & Production Guardrails</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Operational safeguards, environment isolation, and security compliance policies.
        </p>
      </div>

      {/* Security Policies Overview */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Lock size={18} className="text-emerald-400" />
          <span>Security & Architectural Hardening Implemented</span>
        </h3>

        <div className="space-y-3 text-xs text-slate-300">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <CheckCircle size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-white">Zero Client-Side Secret Leaks</div>
              <p className="text-slate-400 text-[11px] mt-0.5">
                All WhatsApp tokens, SMTP credentials, Google Places keys, and Gemini API keys reside exclusively on the server runtime. Zero tokens or secret values are passed to browser payloads.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <CheckCircle size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-white">CSV Formula Injection (DDE) Sanitization</div>
              <p className="text-slate-400 text-[11px] mt-0.5">
                All lead exports prefix suspicious formula characters (<code>=</code>, <code>+</code>, <code>-</code>, <code>@</code>) with a leading single quote to neutralize remote code execution attacks in Excel.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <CheckCircle size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-white">Strict Human Approval Gate for Outreach</div>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Uploading spreadsheet leads or saving discovered industrial venues never triggers automated production outreach. Enqueueing messages strictly requires human operator review.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <CheckCircle size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-white">DoT Indian Phone Numbering Plan Normalization</div>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Indian telecommunications rules strictly separate Mobile (6/7/8/9 series) from Landline STD city codes (11, 22, 33, 44, 80, 40, etc.) and Toll-Free (1800/1860).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Environment Config Guidance */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Key size={18} className="text-blue-400" />
          <span>Server Environment Configuration (.env)</span>
        </h3>
        <p className="text-xs text-slate-400">
          The backend reads configuration from the secure server environment file. A complete reference is provided in <code>.env.example</code>:
        </p>
        <pre className="p-4 rounded-xl bg-slate-950 text-slate-300 font-mono text-[11px] overflow-x-auto border border-slate-800">
{`# Server Runtime
PORT=3001
GLOBAL_OUTREACH_KILL_SWITCH=false
EMAIL_OUTREACH_ENABLED=true
WHATSAPP_OUTREACH_ENABLED=true

# Test Lab Isolation Allowlist
TEST_ALLOWLIST_EMAIL=your-verified-email@company.com
TEST_ALLOWLIST_PHONE=+919876543210

# AI Provider
GEMINI_API_KEY=your-gemini-api-key

# Email Provider (SMTP / API)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-account@company.com
SMTP_PASS=your-app-password
SMTP_FROM="G-MAPS Industrial" <your-account@company.com>

# Meta WhatsApp Business Cloud API
META_WA_ACCESS_TOKEN=your-meta-access-token
META_WA_PHONE_NUMBER_ID=your-phone-number-id
META_WA_WEBHOOK_VERIFY_TOKEN=your-custom-verify-token

# Google Places API (New)
GOOGLE_PLACES_API_KEY=your-google-places-key`}
        </pre>
      </div>
    </div>
  );
};
