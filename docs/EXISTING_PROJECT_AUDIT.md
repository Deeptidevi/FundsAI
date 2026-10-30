# G-MAPS INDUSTRIAL INTELLIGENCE: EXISTING PROJECT FORENSIC AUDIT

**Document Version:** 1.0.0  
**Audit Date:** 2026-10-29  
**Auditor:** Principal Software Architect & Forensic Reviewer  
**Repository:** G-MAPS Industrial Intelligence  

---

## 1. Actual Project Architecture

The existing legacy codebase is a monolithic **Google Apps Script (GAS) + Google Sheets** application coupled with an embedded HTML/CSS/JavaScript client running inside Google Apps Script (`HtmlService.createTemplateFromFile`).

### Legacy Component Topology:
1. **Frontend Presentation (`Index.html`, `Styles.html`, `Scripts.html`):**
   - Single-Page Application (SPA) rendered inside an iframe via Google Apps Script Web App.
   - Leaflet.js (v1.9.4) for interactive mapping and geographic bounding box visualization.
   - FontAwesome (v6.4.0) and Google Fonts (Inter) for UI elements.
   - Client-side state managed via vanilla JavaScript window globals (`currentResults`, `searchHistory`, `activeFilters`, `mapLayers`).
   - Communication with the backend executes via asynchronous `google.script.run.withSuccessHandler(...).withFailureHandler(...)`.
2. **Backend Services (`Code.gs`, `SearchService.gs`, `PlacesService.gs`, `CompanyService.gs`, `PhoneService.gs`, `SpreadsheetService.gs`, `ExportService.gs`, `Config.gs`):**
   - Execution context: Google V8 runtime in Google Apps Script.
   - Primary External Dependency: Google Places API (New) (`https://places.googleapis.com/v1/places:searchText` and `:searchNearby`).
   - Geocoding Fallbacks: Google Geocoding API (`Maps.newGeocoder()`), Photon API (`photon.komoot.io`), and OpenStreetMap Nominatim (`nominatim.openstreetmap.org`).
3. **Database & Storage Layer (`SpreadsheetService.gs`):**
   - Google Spreadsheet acting as the primary operational database.
   - Tabs: `Leads`, `Search_History`, `Industrial_Zones`, `Audit_Log`, `Config`.
   - Atomic writes simulated using Google Apps Script `LockService.getScriptLock()`.
4. **Standalone Local Preview System (`build_preview.ps1`, `serve_preview.ps1`, `preview.html`):**
   - Offline / local compilation pipeline that merges `Index.html`, `Styles.html`, and `Scripts.html` into a single standalone bundle (`preview.html`).
   - Mocks `google.script.run` in browser localStorage to simulate Google Sheets persistence without requiring a live Google Apps Script deployment.

---

## 2. Existing Files and Responsibilities

| File Path | Lines / Size | Primary Responsibility |
|:---|:---|:---|
| `Code.gs` | ~560 lines (20 KB) | Main entry points (`doGet`, `doPost`), API request dispatcher, Google Sheets initialization, user permissions. |
| `Config.gs` | ~340 lines (11 KB) | Central configuration constants, API endpoints, quota limits, field masks, consumer exclusion lists (34 categories), industrial keyword dictionaries. |
| `SearchService.gs` | ~750 lines (26 KB) | Geodetic math (lat/lng degree distance calculations), directional bounding boxes, geographic grid tiling (>12 km), spatial polygon ray-casting. |
| `PlacesService.gs` | ~680 lines (23 KB) | Google Places API (New) client, field mask optimization, pagination token handling, fallback geocoder waterfall (Google -> Photon -> Nominatim -> Curated Lookup). |
| `CompanyService.gs` | ~580 lines (19 KB) | Tier classification (Gold, Silver, Bronze), branch-preservation deduplication (>500m separation), industrial business filtering vs. consumer exclusion. |
| `PhoneService.gs` | ~380 lines (13 KB) | Indian Department of Telecommunications (DoT) National Numbering Plan parser, Mobile (6/7/8/9) vs Landline STD vs Toll-Free, E.164 normalization. |
| `SpreadsheetService.gs`| ~1,020 lines (36 KB) | Google Sheets CRUD operations, schema verification, batch row writing, `LockService` concurrency control, formula protection. |
| `ExportService.gs` | ~540 lines (20 KB) | Data transformation and export generation: CSV, Excel-compatible XML, JSON, and Google Drive sheet exports with formula injection defense. |
| `Index.html` | ~1,600 lines (61 KB) | HTML template, modal dialogs, search control bar, filter chips, lead data tables, drawer components. |
| `Styles.html` | ~1,300 lines (47 KB) | Responsive CSS layout, dark/light theme tokens, typography, data grid styling, Leaflet map styling overrides. |
| `Scripts.html` | ~4,200 lines (150 KB) | Client-side application controller, state management, map rendering, export triggers, search progress monitoring, DOM reconciliation. |
| `build_preview.ps1`| ~1,100 lines (55 KB) | PowerShell compiler to generate offline `preview.html` with mocked backend bridges. |
| `serve_preview.ps1`| ~80 lines (3 KB) | Local HTTP daemon in PowerShell for serving `preview.html` on port 8085. |

---

## 3. Existing Functional Features

1. **Geographic Search Engine:**
   - Coordinate-based radial search with asymmetric directional bounding boxes (North, South, East, West bias).
   - Automatic grid tiling when search radius exceeds 12 km to overcome Google Places API 60-result hard pagination limit.
   - Point-in-polygon ray-casting algorithm for custom industrial estate boundary filtering.
2. **Industrial Filtering & Lead Qualification:**
   - 34-category consumer business exclusion list (e.g., bakeries, clothing stores, beauty salons, schools).
   - Industrial verification regex against primary types, secondary types, and business descriptions.
   - Landmark and industrial estate gate exclusion (removing non-operating infrastructure entries).
3. **Multi-Factor Deduplication & Branch Preservation:**
   - Level 1: Google Place ID exact match.
   - Level 2: Normalized Indian E.164 phone number match.
   - Level 3: Spatial duplicate review.
   - **Branch Preservation Rule:** If two businesses share the same trade name but are separated by $> 500\text{ meters}$, both are preserved as legitimate operational branches (e.g., Plant 1 vs. Plant 2).
4. **Indian Phone Classification (DoT Compliance):**
   - Normalizes raw phone strings (`+91`, `0`, spaces, dashes) to clean 10-digit national numbers or 12-digit E.164.
   - Validates Indian telecom circles (STD codes for Tier 1, 2, 3 cities).
   - Flags Mobile vs. Landline vs. Toll-Free (1800/1860).
5. **Business Tier Classification:**
   - **Gold Tier:** Rating $\ge 4.5$ and Review Count $\ge 100$.
   - **Silver Tier:** Rating $\ge 4.0$ and Review Count $\ge 25$.
   - **Bronze Tier:** Rating $< 4.0$ or Review Count $< 25$ or unrated.
6. **Multi-Format Export Engine:**
   - Sanitized CSV, Excel-compatible XML, and structured JSON.
   - Formula-injection mitigation (prefixing `=`, `+`, `-`, `@` with single quotes `'`).
7. **CRM Lead Management (Legacy):**
   - Lead stages (`New`, `Contacted`, `Qualified`, `Proposal`, `Won`, `Lost`).
   - Priority levels (`High`, `Medium`, `Low`).
   - Direct click-to-WhatsApp (`https://wa.me/91...`) and click-to-call (`tel:...`) links.

---

## 4. Existing Business Rules & Formulas

### Geodetic Math (`SearchService.gs`):
- Distance per degree latitude:
  $$\Delta \text{lat} = \frac{\text{radius (km)}}{111.32}$$
- Distance per degree longitude (cos-corrected for Earth curvature):
  $$\Delta \text{lng} = \frac{\text{radius (km)}}{111.32 \times \cos\left(\text{lat} \times \frac{\pi}{180}\right)}$$
- Grid Tiling Step: Overlapping grid cells generated with a $15\%$ overlap factor to prevent perimeter loss between adjacent tiles.

### Spatial Distance Formula (Haversine Approximation):
$$d = 2R \cdot \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$
where $R = 6,371\text{ km}$. Used for the 500m branch-preservation threshold.

---

## 5. Existing Database / Sheet Schemas

The legacy sheet `Leads` had the following column structure:
1. `Lead ID` (UUID / timestamp-based)
2. `Place ID` (Google Places unique identifier)
3. `Company Name`
4. `Primary Type`
5. `Tier` (`Gold`, `Silver`, `Bronze`)
6. `Rating` (Float, 0.0 - 5.0)
7. `Review Count` (Integer)
8. `Address`
9. `City`
10. `State`
11. `Postal Code`
12. `Latitude`
13. `Longitude`
14. `Phone Raw`
15. `Phone Formatted` (E.164)
16. `Phone Type` (`Mobile`, `Landline`, `TollFree`, `Unknown`)
17. `Website`
18. `Google Maps URL`
19. `CRM Status` (`New`, `Contacted`, `In_Discussion`, etc.)
20. `Priority` (`High`, `Medium`, `Low`)
21. `Notes`
22. `Discovered Date` (ISO-8601)
23. `Last Updated` (ISO-8601)

---

## 6. Security Risks & Defects in Existing System

1. **Google Apps Script Limitations:**
   - 6-minute maximum script execution timeout (causes severe truncation and failures on large scans).
   - Inability to handle durable background jobs, leading to unrecoverable data loss when browser tabs are closed.
   - Lack of true relational constraints and concurrency transactions (relies on fragile `LockService`).
2. **API Key Security:**
   - In legacy Apps Script, client code or script properties can accidentally expose Google Places API keys if not strictly routed through server handlers.
3. **No Automated Inbound Outreach / Follow-up:**
   - WhatsApp outreach was strictly a client-side link (`wa.me`) requiring manual human clicking.
   - Zero AI-driven inbound reply processing or campaign state machine.
4. **Scalability Ceiling:**
   - Google Sheets begins degrading and slowing down severely after ~5,000 to 10,000 rows with heavy script reads.

---

## 7. Migration Readiness & Feature Disposition

- **Migrate to New Core:** Geodetic math, tiling, branch-preservation, DoT phone normalization, tier classification, industrial exclusion filters, export sanitization.
- **Replace Completely:** Google Apps Script backend -> TypeScript + Hono REST API. Google Sheets -> SQLite / Cloudflare D1 Relational Database with versioned migrations.
- **Newly Implement:** Excel/CSV import engine with column mapping, Campaign orchestration state machine, Email outreach adapter, Meta WhatsApp Cloud API integration, Gemini AI conversation engine with company knowledge RAG, Dedicated Test Lab.
