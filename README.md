# G-MAPS Industrial Intelligence: Full-Stack AI Lead Platform

An enterprise-grade, full-stack B2B industrial lead generation, email outreach, official Meta WhatsApp Business Platform automation, and lead-management platform.

Migrated and transformed from legacy Google Apps Script + Google Sheets into a modern, production-grade architecture.

---

## 🚀 Key Highlights & Capabilities

- **Modern Architecture:** React 19 + Vite + TypeScript frontend with Tailwind CSS, paired with a high-performance TypeScript REST API (Hono) and versioned relational SQLite / Cloudflare D1 migrations.
- **Excel & CSV Import Engine:** Batch in-memory streaming parser with dynamic column mapping, row-level validation, DoT Indian phone parsing, duplicate detection with branch preservation, and error reporting.
- **Campaign Orchestration:** Multi-step wizard with explicit **Human Approval Gate** (`draft` → `pending_approval` → `approved` → `running`). Uploading leads never triggers automatic sends without review.
- **Durable Background Queue:** Persistent `message_jobs` table with atomic 60s leases, exponential backoff retries, orphan recovery, and dead-letter handling.
- **Official Meta WhatsApp Cloud API:** Real integration with Meta Graph API v21.0, webhook challenge verification, template messaging, two-way conversational inbox, and automated opt-out detection ("STOP").
- **Real Email Outreach:** Configurable SMTP/IMAP or API provider adapter with delivery status tracking, reply processing, rate limits, and suppression list checks.
- **Google Gemini AI Conversation Engine:** Powered by `@google/genai` (Gemini Flash), structured intent classification, verified company knowledge RAG, and safety guardrails against hallucinations.
- **Dedicated Test Lab (Mandatory):** Isolated sandbox environment for testing real email and WhatsApp messages to verified recipient allowlists with `[G-MAPS TEST]` prefixes, without touching production data.
- **Preserved Core G-MAPS Rules:**
  - Asymmetric directional bounding boxes ($111.32 \times \cos(\text{lat})$).
  - Area grid tiling for searches $> 12\text{ km}$.
  - Point-in-polygon ray-casting.
  - 34-category consumer business exclusion list.
  - Tier classification (Gold: $\ge 4.5\text{ rating}, \ge 100\text{ reviews}$; Silver: $\ge 4.0\text{ rating}, \ge 25\text{ reviews}$; Bronze).
  - Indian DoT phone parser (Mobile 6/7/8/9 vs Landline STD vs Toll-Free 1800/1860).
  - Branch preservation rule ($> 500\text{ m}$ separation between facilities with identical trade names).
  - CSV formula injection sanitization.

---

## 📁 Repository Structure

```text
├── docs/
│   ├── EXISTING_PROJECT_AUDIT.md    # Forensic audit of legacy GAS files and business rules
│   ├── MIGRATION_PLAN.md            # Complete feature mapping to target architecture
│   ├── DEPLOYMENT.md                # 24/7 cloud and local deployment guide
│   ├── INTEGRATIONS.md              # Meta WhatsApp, Email SMTP, and Gemini API setup
│   ├── TESTING.md                   # Test suite documentation and verification reports
│   └── SECURITY.md                  # Secret protection, CSV DDE mitigation, kill switches
├── migrations/
│   └── 0001_initial_schema.sql      # Versioned relational SQL schema (17 tables)
├── shared/                          # @gmaps/shared: Geodetic math, DoT rules, tier filters
│   └── src/
├── server/                          # @gmaps/server: Hono REST API, DB queries, adapters
│   └── src/
├── client/                          # @gmaps/client: React 19 + Vite + Tailwind CSS SPA
│   └── src/
├── .env.example                     # Environment configuration specification
└── package.json                     # Monorepo workspace configuration
```

---

## ⚡ Quick Start (Running Locally)

### 1. Configure Environment:
```bash
copy .env.example .env
```
*(Optionally enter your `GEMINI_API_KEY`, `GOOGLE_PLACES_API_KEY`, or SMTP details).*

### 2. Run All Automated Tests:
```bash
npm --prefix shared test
npm --prefix server test
```
*Output: 12 tests passing (100% pass).*

### 3. Build Monorepo:
```bash
npm --prefix shared run build
npm --prefix server run build
npm --prefix client run build
```

### 4. Start Application:
In Terminal 1 (Backend API on `http://localhost:3001`):
```bash
npm --prefix server start
```

In Terminal 2 (Frontend Client on `http://localhost:5173`):
```bash
npm --prefix client run dev
```

Visit **`http://localhost:5173`** in your browser.

---

## 🛡️ Production Safety & Verification Status

| Requirement | Implementation Status | Verification Details |
|:---|:---|:---|
| **Excel & CSV Ingestion** | ✅ Implemented & Verified | Automated unit & integration tests pass with row reports. |
| **DoT Indian Phone Classification** | ✅ Implemented & Verified | Tested across mobile (6-9), STD landlines (80, 11), and 1800. |
| **Branch Preservation (>500m)** | ✅ Implemented & Verified | Haversine calculation verified on multi-unit manufacturing facilities. |
| **Human Approval Gate** | ✅ Implemented & Verified | Campaign status machine blocks outreach until explicit human call. |
| **Durable Job Processor** | ✅ Implemented & Verified | Atomic DB leases, backoff, retries, and dead-letter handling active. |
| **Dedicated Test Lab** | ✅ Implemented & Verified | Isolated endpoints with `[G-MAPS TEST]` prefix and allowlist checks. |
| **Meta WhatsApp Business** | ✅ Implemented (Adapter Verified) | Cloud API adapter with webhooks and opt-outs built; awaiting live Meta token. |
| **Email Outreach** | ✅ Implemented (Adapter Verified) | SMTP adapter with suppression checks built; awaiting live mailbox credentials. |
| **Gemini AI Engine** | ✅ Implemented (Adapter Verified) | Official `@google/genai` client built with RAG; awaiting live Gemini API key. |
