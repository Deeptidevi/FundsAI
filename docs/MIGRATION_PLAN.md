# G-MAPS INDUSTRIAL INTELLIGENCE: MIGRATION PLAN & FEATURE MATRIX

**Document Version:** 1.0.0  
**Date:** 2026-10-29  
**Target Architecture:** Full-Stack AI Lead Automation Platform  
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS + Lucide Icons + Leaflet  
- **Backend:** Hono TypeScript REST API (compatible with Node.js & Cloudflare Workers)  
- **Database:** SQLite / Cloudflare D1 with Versioned SQL Migrations  
- **Job Engine:** Durable Queue & Scheduled Job Processor (Leases, Retries, Idempotency)  
- **AI Engine:** Google Gemini API (`@google/genai`) with Structured RAG & Guardrails  
- **Integrations:** Official Meta WhatsApp Business Platform Cloud API, Verified SMTP/IMAP & API Email  

---

## 1. Feature Migration Matrix

| Legacy GAS Feature | Legacy File | Target Module in New Architecture | Migration Status & Verification Plan |
|:---|:---|:---|:---|
| **Geodetic Coordinate Math & Bounding Boxes** | `SearchService.gs` | `shared/src/geo/geodetic.ts` | **Migrated**: Unit-tested for lat/lng curvature calculations. |
| **Area Grid Tiling (>12 km)** | `SearchService.gs` | `shared/src/geo/tiling.ts` | **Migrated**: Unit-tested for overlapping tile generation without coordinate gaps. |
| **Polygon Ray-Casting Algorithm** | `SearchService.gs` | `shared/src/geo/polygon.ts` | **Migrated**: Tested against boundary coordinates. |
| **Industrial Business Filtering & Consumer Exclusion** | `CompanyService.gs`, `Config.gs` | `shared/src/rules/industrialFilter.ts` | **Migrated**: Preserves 34 exclusion categories and industrial keyword classification. |
| **Multi-Tier Classification (Gold / Silver / Bronze)** | `CompanyService.gs` | `shared/src/rules/tierClassification.ts` | **Migrated**: Standardized tier assignment based on ratings and review counts. |
| **Branch Preservation Rule (>500m separation)** | `CompanyService.gs` | `shared/src/rules/deduplication.ts` | **Migrated**: Verifies multi-branch preservation with Haversine formula. |
| **Indian Phone Parser (DoT Mobile vs Landline STD)** | `PhoneService.gs` | `shared/src/rules/phoneParser.ts` | **Migrated**: Validates Indian STD circles, mobile prefixes (6,7,8,9), and E.164 normalization. |
| **Google Places API (New) Client** | `PlacesService.gs` | `server/src/services/placesService.ts` | **Migrated**: Secured server-side calls, key isolation, field mask optimization. |
| **Data Persistence & Concurrency** | `SpreadsheetService.gs` (Sheets) | `server/src/db/` (SQLite / Cloudflare D1) | **Replaced**: Versioned relational SQL schema with constraints and foreign keys. |
| **Export Engine (CSV, Excel XML, JSON)** | `ExportService.gs` | `server/src/services/exportService.ts` | **Migrated & Hardened**: Formula injection sanitization preserved and expanded. |
| **Interactive Map & Layers** | `Index.html`, `Scripts.html` | `client/src/components/map/IndustrialMap.tsx` | **Migrated**: Modern Leaflet + React integration with custom layer controls. |
| **Lead Management Dashboard & CRM** | `Index.html`, `Scripts.html` | `client/src/pages/Leads.tsx`, `client/src/pages/LeadDetail.tsx` | **Modernized**: Full filtering, sorting, drawer views, contact timeline, note tracking. |

---

## 2. Newly Implemented Enterprise Modules

| New Capability | Destination Module | Implementation Architecture |
|:---|:---|:---|
| **Excel & CSV Import Engine** | `server/src/services/importService.ts`, `client/src/pages/Import.tsx` | Streaming parser, column mapping, row validation, duplicate check, batch DB write. |
| **Campaign State Machine & Orchestrator** | `server/src/services/campaignService.ts`, `client/src/pages/Campaigns.tsx` | State machine: `draft` -> `validating` -> `pending_approval` -> `approved` -> `queued` -> `running` -> `completed`. |
| **Human Approval Gate** | `server/src/routes/campaigns.ts` | Strict server-side verification: Uploading leads NEVER triggers sends without approval. |
| **Durable Job Processor** | `server/src/jobs/jobWorker.ts` | Persistent DB queue, leases, exponential backoff, maximum retries, dead-letter state. |
| **Email Outreach Adapter** | `server/src/integrations/emailAdapter.ts` | Real SMTP / Resend API sender, reply tracking, rate-limiting, thread tracking. |
| **Meta WhatsApp Business Platform** | `server/src/integrations/whatsappAdapter.ts`, `server/src/routes/webhooks.ts` | Official Cloud API: Webhook verification, template messaging, incoming message handling, opt-out. |
| **AI Conversation Engine (Gemini)** | `server/src/ai/geminiAdapter.ts`, `server/src/ai/conversationEngine.ts` | Google `@google/genai` SDK, structured intent classification, RAG against Company Knowledge. |
| **Company Knowledge Base** | `server/src/routes/knowledge.ts`, `client/src/pages/Knowledge.tsx` | Verified business info, products, approved pricing rules, prohibited claims. |
| **Unified Omnichannel Inbox** | `server/src/routes/inbox.ts`, `client/src/pages/Inbox.tsx` | Integrated WhatsApp and Email timeline, AI draft responses, human takeover. |
| **Dedicated Test Lab** | `server/src/routes/testLab.ts`, `client/src/pages/TestLab.tsx` | Isolated sandbox: Test email to verified address (`[G-MAPS TEST]`), WhatsApp test mode, AI sandbox. |
| **Security & Authentication** | `server/src/middleware/auth.ts`, `server/src/security/` | Server-side auth, RBAC, input validation (Zod), CSRF protection, sanitized exports. |

---

## 3. Directory Layout of the Target Project

```text
d:\Desktop\G-MAPS DATA\
├── docs/
│   ├── EXISTING_PROJECT_AUDIT.md
│   ├── MIGRATION_PLAN.md
│   ├── DEPLOYMENT.md
│   ├── INTEGRATIONS.md
│   ├── TESTING.md
│   └── SECURITY.md
├── migrations/
│   └── 0001_initial_schema.sql
├── shared/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── types/
│       ├── geo/
│       │   ├── geodetic.ts
│       │   ├── tiling.ts
│       │   └── polygon.ts
│       └── rules/
│           ├── phoneParser.ts
│           ├── tierClassification.ts
│           ├── industrialFilter.ts
│           └── deduplication.ts
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       ├── db/
│       │   ├── schema.ts
│       │   └── client.ts
│       ├── ai/
│       │   ├── geminiAdapter.ts
│       │   └── conversationEngine.ts
│       ├── integrations/
│       │   ├── emailAdapter.ts
│       │   └── whatsappAdapter.ts
│       ├── services/
│       │   ├── importService.ts
│       │   ├── campaignService.ts
│       │   ├── exportService.ts
│       │   └── placesService.ts
│       ├── jobs/
│       │   └── jobWorker.ts
│       └── routes/
│           ├── auth.ts
│           ├── leads.ts
│           ├── campaigns.ts
│           ├── inbox.ts
│           ├── knowledge.ts
│           ├── testLab.ts
│           ├── webhooks.ts
│           └── analytics.ts
├── client/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Sidebar.tsx
│       │   │   └── Header.tsx
│       │   ├── map/
│       │   │   └── IndustrialMap.tsx
│       │   └── common/
│       └── pages/
│           ├── Dashboard.tsx
│           ├── IndustrialSearch.tsx
│           ├── Leads.tsx
│           ├── Import.tsx
│           ├── Campaigns.tsx
│           ├── CampaignWizard.tsx
│           ├── Inbox.tsx
│           ├── Knowledge.tsx
│           ├── TestLab.tsx
│           ├── Integrations.tsx
│           └── Settings.tsx
├── .env.example
└── README.md
```
