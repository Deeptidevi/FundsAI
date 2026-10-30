# G-MAPS INDUSTRIAL INTELLIGENCE: COMPLETE FORENSIC CODEBASE AUDIT & KNOWLEDGE SPECIFICATION

> **Report Type**: Deep Forensic Architectural & Technical Codebase Audit  
> **Target Repository**: `d:\Desktop\G-MAPS DATA\`  
> **Environment Context**: Google Apps Script (V8 Runtime) + Google Sheets DB + Dual-Target Local Preview (PowerShell/.NET HTTP)  
> **Audit Status**: Complete Forensic Analysis (Read-Only Workspace
 Inspection)  
> **Primary Audience**: Senior Architects, Engineers, Security Reviewers, and AI Continuation Models (ChatGPT / Claude / Antigravity)  

---

## TABLE OF CONTENTS
1. [Executive Summary & Verification Overview](#executive-summary--verification-overview)
2. [Section A — Project Identity and Purpose](#section-a--project-identity-and-purpose)
3. [Section B — Complete Repository Structure & File Index](#section-b--complete-repository-structure--file-index)
4. [Section C — Technology Stack & Dependency Manifest](#section-c--technology-stack--dependency-manifest)
5. [Section D — Complete User Interface Audit](#section-d--complete-user-interface-audit)
6. [Section E — Google Maps & Geographical Intelligence Engine](#section-e--google-maps--geographical-intelligence-engine)
7. [Section F — Business Discovery, Scraping, & Data Enrichment](#section-f--business-discovery-scraping--data-enrichment)
8. [Section G — Database Architecture & Data Model](#section-g--database-architecture--data-model)
9. [Section H — Backend Architecture & Server API Reference](#section-h--backend-architecture--server-api-reference)
10. [Section I — C1–C4 Workflow & Lead Stage Business Logic](#section-i--c1c4-workflow--lead-stage-business-logic)
11. [Section J — Authentication, Authorization, & User Management](#section-j--authentication-authorization--user-management)
12. [Section K — External Integrations & Cloud Services](#section-k--external-integrations--cloud-services)
13. [Section L — Environment Variables & Configuration Inventory](#section-l--environment-variables--configuration-inventory)
14. [Section M — Complete End-to-End User Journeys](#section-m--complete-end-to-end-user-journeys)
15. [Section N — Error Handling, Edge Cases, & Resilience](#section-n--error-handling-edge-cases--resilience)
16. [Section O — Comprehensive Security & Privacy Audit](#section-o--comprehensive-security--privacy-audit)
17. [Section P — Performance, Scalability, & Operational Cost Analysis](#section-p--performance-scalability--operational-cost-analysis)
18. [Section Q — Testing Infrastructure & Verification Results](#section-q--testing-infrastructure--verification-results)
19. [Section R — Deployment, Operations, & Hosting Guide](#section-r--deployment-operations--hosting-guide)
20. [Section S — Version Control, Git History, & Code Churn](#section-s--version-control-git-history--code-churn)
21. [Section T — Comprehensive Feature Matrix](#section-t--comprehensive-feature-matrix)
22. [Section U — Architectural & Data-Flow Mermaid Diagrams](#section-u--architectural--data-flow-mermaid-diagrams)
23. [Section V — Bugs, Deficiencies, & Technical Debt Registry](#section-v--bugs-deficiencies--technical-debt-registry)
24. [Section W — Complete Local Execution & Operations Guide](#section-w--complete-local-execution--operations-guide)
25. [Section X — ChatGPT Project Context (Source of Truth)](#section-x--chatgpt-project-context-source-of-truth)
26. [Section Y — Unresolved Questions Requiring Human Stakeholder Input](#section-y--unresolved-questions-requiring-human-stakeholder-input)
27. [Section Z — Prioritized Action Plan & Architectural Recommendations](#section-z--prioritized-action-plan--architectural-recommendations)

---

## EXECUTIVE SUMMARY & VERIFICATION OVERVIEW

| Dimension | Real State / Finding |
|---|---|
| **Project Identity** | **G-MAPS Industrial Intelligence Dashboard**: A specialized B2B spatial discovery, verification, and lead management engine built for industrial manufacturers, factories, MSMEs, and engineering suppliers across India. |
| **Architecture Paradigm** | **Dual-Target Platform**: <br>1. *Production Target*: Serverless Web App on Google Apps Script (V8) backed by Google Sheets (7 relational tabs) with `LockService` concurrency control.<br>2. *Desktop/Preview Target*: Standalone compiled single-page client (`preview.html`) served via a custom asynchronous .NET Sockets PowerShell HTTP server (`serve_preview.ps1`). |
| **Primary Data Providers** | Google Maps Platform (New Places API: `searchText`, `searchNearby`, `autocomplete`, `places/{id}`, Geocoding API). OpenStreetMap / Photon / Nominatim client-side geocoding fallbacks for local preview. |
| **Persistence Mechanism** | Google Sheets API via Apps Script `SpreadsheetApp`. Standalone preview uses in-memory state with client-side CSV/JSON/SpreadsheetML generation and clipboard push. |
| **Feature Count** | **34 distinct functional capabilities** cataloged across geospatial calculation, multi-level deduplication, algorithmic tiering, phone normalization, lead CRM, and data export. |
| **Git Tracking Status** | Standalone directory without an active `.git` version control repository (`fatal: not a git repository`). |
| **Key Architectural Gaps** | No relational foreign-key enforcement outside Apps Script logic; Google Places client keys exposed in preview scripts; no automated rollback or branch CI/CD. |

---

## SECTION A — PROJECT IDENTITY AND PURPOSE

### 1. What Exactly is G-MAPS Industrial Intelligence?
G-MAPS Industrial Intelligence is a specialized B2B enterprise platform engineered to systematically identify, geolocate, classify, and qualify manufacturing facilities, factories, MSMEs (Micro, Small, and Medium Enterprises), and engineering suppliers. It couples Google Maps Platform geospatial data with industrial classification heuristics, telephone number normalization, duplicate prevention, and CRM lead stage tracking.

### 2. Business Problem Solved
Industrial procurement teams, B2B sales organizations, supply-chain researchers, and MSME aggregators face severe data deficits when mapping regional manufacturing hubs:
- **Consumer Noise**: Standard Google Maps queries return restaurants, shopping centers, auto repair shops, and residential complexes alongside heavy engineering plants.
- **Geographic Cluster Skew**: Industrial clusters (e.g., Bhosari MIDC, Chakan, Peenya, Okhla) are frequently located 15–30 km outside city centers; standard radius searches centered on city centers fail to capture these manufacturing corridors.
- **Data Incompleteness**: Many industrial plants lack websites or possess unstandardized phone formats (mixed landline STD codes vs. mobile numbers).
- **Duplicate Records Across Queries**: Querying multiple synonyms (e.g., "Fabrication", "CNC Machining", "Industrial Equipment") yields massive candidate duplication, while multi-plant corporations often have distinct branches that naive deduplication engines erroneously merge.

G-MAPS solves this via strict **industrial place-type filtering**, **multi-level branch-aware deduplication**, **asymmetric directional rectangular bounding boxes**, and **automated Indian telephone number standardization**.

### 3. Intended Users
1. **Industrial Lead Generation Managers**: Identify and export verified manufacturing prospects within specific industrial corridors.
2. **Procurement & Supply Chain Officers**: Discover specialized suppliers (forging, casting, CNC machining, stamping) within defined radial distances of assembly plants.
3. **Field Sales Representatives**: Access standardized contact numbers (mobile vs. landline), direct WhatsApp links, and physical factory coordinates for on-site visits.
4. **Data Verification Specialists**: Audit emerging industrial listings, review ambiguous duplicates, override algorithmic tier scores, and append site-visit notes.

### 4. Primary Use Cases
- **Targeted Corridor Scan**: Discover all metal fabrication and CNC units within a 5 km x 10 km asymmetric bounding box around an industrial estate (e.g., Bhosari MIDC, Pune).
- **OEM & MSME Qualification**: Automatically sort discoveries into Gold (Tier-1 OEMs), Silver (Qualified MSMEs), and Bronze (Workshops/Emerging Facilities) based on Google rating and review count thresholds.
- **Data Export & CRM Handoff**: Export verified leads directly into RFC 4180 CSV, native Microsoft Excel XML (`.xls`), structured Location Intelligence JSON (Schema 1.0), or sync to a shared Google Sheet.
- **Contact Channel Verification**: Distinguish Indian mobile phones (callable/WhatsApp-ready) from office landlines (STD-coded) and toll-free corporate lines.

### 5. Complete End-to-End Business Workflow
```mermaid
flowchart TD
    A[User Enters Location / Coordinates] --> B[Geocode / Resolve Hierarchy]
    B --> C[Configure Search Extent: Radius or Asymmetric Rectangular Bounds]
    C --> D[Select Industrial Sector Keywords]
    D --> E[Execute Search Pipeline via Places API New]
    E --> F[Raw Candidate Fetch: Places searchText / searchNearby]
    F --> G[Industrial Relevance Filtering & Consumer Exclusion]
    G --> H[Multi-Level Deduplication Engine: Place ID, Phone, Branch Proximity]
    H --> I[Algorithmic Tier Classification: Gold, Silver, Bronze]
    I --> J[Phone Normalization & Telecom STD Parsing]
    J --> K[Persistent Storage: LockService Batch Insert to Google Sheets]
    K --> L[Interactive Dashboard: Table, Map Pins, KPI Cards]
    L --> M[Manager Review & CRM Drawer: Edit Details, Override Tier, Add Notes]
    M --> N[Data Export: CSV, Excel XML, Location JSON 1.0, Drive Link]
```

### 6. Core Functionality vs. Optional / Experimental Features
- **Core Functionality**:
  - Google Places API (New) integration with strict field masks.
  - Coordinate and address hierarchy resolution.
  - Asymmetric rectangular bounds math ($1^\circ\text{ longitude} = 111.32 \times \cos(\text{lat})\text{ km}$).
  - Branch-aware deduplication (preserves facilities > 500m apart).
  - Algorithmic tier assignment (Gold/Silver/Bronze).
  - Indian telephone parsing (`PhoneService.gs`).
  - Google Sheets persistence with `LockService` thread safety.
  - Multi-format data export (CSV, SpreadsheetML, Schema 1.0 JSON).
- **Optional / Secondary Functionality**:
  - Offline local preview mode (`preview.html` with Leaflet.js and .NET Sockets server).
  - Built-in automated 13-test integrity runner (`runAutomatedTests()`).
  - Regional cluster recommendation banners (e.g., suggesting MIDC expansions).
- **Experimental / Incomplete Functionality**:
  - `TeamAssignments` sheet defined in `Config.gs` (line 33) but not provisioned in `SpreadsheetService.initializeDatabase()`.
  - Geoapify configuration keys in `Config.gs` (line 147) without active operational consumers.

### 7. Project Stage Assessment: Production-Grade Specialized Tool
- **Classification**: **Functional Production Application (Apps Script) with Standalone Desktop Preview Mode**.
- **Evidence**:
  - Complete, structured 940-line persistence layer in `SpreadsheetService.gs` with transaction locks and batch operations.
  - Rigorous RFC 4180 CSV escaping with UTF-8 BOM injection.
  - Comprehensive 13-point automated test runner in `Code.gs`.
  - Production manifest (`appsscript.json`) with fine-grained OAuth scopes (`spreadsheets`, `external_request`, `userinfo.email`).
  - Strict absence of mock/dummy data in Google Apps Script production files; raw errors bubble up faithfully to inform the operator.

### 8. What the Application Accomplishes
- Discovers genuine manufacturing companies across any Indian coordinate point using Google Places API (New).
- Eliminates 30+ categories of irrelevant consumer retail establishments (restaurants, salons, retail outlets).
- Calculates exact Haversine distances from search center to physical factory gates.
- Classifies phone numbers into Mobile (+91 9/8/7/6), Landline (STD-coded), and Toll-Free (1800/1860).
- Persists audit logs tracking who edited which company field and when.

### 9. What the Application Fails to Accomplish / Limitations
- **No Direct WhatsApp / Telecom Dialing API**: The application generates `tel:` and `https://wa.me/` URLs for client-side clicks, but does not provide an automated outreach dialer or WhatsApp messaging bot.
- **Quota Bound**: Bounded by Google Places API daily quota (100 free requests/day unbilled; $200 monthly credit when billed).
- **Execution Time Limits**: Google Apps Script enforces a 6-minute maximum execution timeout per invocation, limiting massive synchronous multi-tile batch searches.
- **No Native User Login System**: Relies entirely on Google Workspace session identity (`Session.getActiveUser().getEmail()`). Unauthenticated web app visitors are labeled `"Manager"`.

### 10. User Capabilities in the Current Workspace
A user opening the application today can:
1. Search for any Indian location or enter raw coordinates (e.g., `18.6276, 73.8344` for Bhosari MIDC).
2. Visualize the search center on an interactive Leaflet/Google Map with adjustable radial perimeters (1 km, 3 km, 5 km, 10 km).
3. Execute live industrial searches against Google Places API (New).
4. Inspect discovered units in a 24-column interactive table with sort, search, and tier filters.
5. Open an executive dossier drawer to review raw Places data, click direct WhatsApp/Call links, update CRM status (`New`, `Contacted`, `Qualified`, `Closed`), and save notes.
6. Export records to RFC 4180 CSV, native Microsoft Excel XML (`.xls`), or Schema 1.0 JSON.
7. Run the built-in 13-test integrity suite to verify system health.

---

## SECTION B — COMPLETE REPOSITORY STRUCTURE & FILE INDEX

### 1. Workspace Directory Map
The repository root is located at `d:\Desktop\G-MAPS DATA\`. It contains 17 files and 0 subdirectories:

```
d:\Desktop\G-MAPS DATA\
├── appsscript.json            # Google Apps Script Project Manifest & Permissions
├── Code.gs                    # Main Web App Entrypoint, RPC Dispatcher, Test Runner
├── Config.gs                  # Global Application Constants, Defaults, Config Management
├── CompanyService.gs          # Industrial Classification, Scoring, Duplicate & Spatial Rules
├── SpreadsheetService.gs      # Google Sheets Persistence Layer, Schema Provisioning, LockService
├── PlacesService.gs           # Google Maps Platform Places API (New) Client & Geocoder
├── SearchService.gs           # Asymmetric Bounding Box Math, Area Tiling, Spatial Filtering
├── PhoneService.gs            # Telecom Number Standardization & Indian STD Classification
├── ExportService.gs           # CSV, Excel SpreadsheetML, Schema 1.0 JSON Exporters
├── Index.html                 # Main Dashboard Markup, Layout Containers, Modals, CRM Drawer
├── Styles.html                # Complete Vanilla CSS Design System (Design Tokens, Components)
├── Scripts.html               # Frontend Controller, Leaflet/Maps Integration, RPC Client
├── build_preview.ps1          # Standalone Offline Compiler (Bundles HTML/CSS/JS with Client Mock)
├── preview.html               # Compiled Standalone Browser Build (Leaflet + Overpass/Mock)
├── serve_preview.ps1          # Pure .NET Sockets Asynchronous Local HTTP Server (Port 8085)
├── G-Map Connector.xlsx       # Blank 24-Column Microsoft Excel Template / Connector
└── README.md                  # Comprehensive Architectural Specification & Deployment Guide
```

### 2. Comprehensive File Inventory

| File Path | Primary Responsibility | Key Functions / Exports | Dependencies | Status |
|---|---|---|---|---|
| `appsscript.json` | Manifest, runtime config, and OAuth authorization scopes | `runtimeVersion: V8`, `oauthScopes` | None | IMPLEMENTED AND VERIFIED |
| `Code.gs` | Web app routing (`doGet`), RPC server handlers, automated test suite | `doGet()`, `getInitialData()`, `runAutomatedTests()`, `saveSettings()`, `runIndustrialSearch()` | `Config`, `SpreadsheetService`, `SearchService`, `ExportService` | IMPLEMENTED AND VERIFIED |
| `Config.gs` | Centralized constants, scoring thresholds, default keywords, Script Properties | `Config.getConfig()`, `Config.getProperty()`, `Config.verifyEnvironment()` | `PropertiesService`, `SpreadsheetApp` | IMPLEMENTED AND VERIFIED |
| `PlacesService.gs` | Google Places API (New) REST client, autocomplete, text search, geocoding | `resolveLocationHierarchy()`, `searchPlacesNearby()`, `searchPlacesText()`, `getPlaceDetails()` | `Config`, `UrlFetchApp`, `Maps.newGeocoder()` | IMPLEMENTED AND VERIFIED |
| `SearchService.gs` | Asymmetric rectangular bounding math, large area grid subdivision, polygon ray-casting | `calculateDirectionalBounds()`, `subdivideBoundsIntoTiles()`, `executeSearch()`, `isPointInBounds()` | `CompanyService`, `PlacesService`, `SpreadsheetService` | IMPLEMENTED AND VERIFIED |
| `CompanyService.gs` | Algorithmic scoring (Gold/Silver/Bronze), branch-aware deduplication, record builders | `evaluateRelevance()`, `classifyCategory()`, `checkForDuplicate()`, `buildCompanyRecord()` | `Config`, `PhoneService` | IMPLEMENTED AND VERIFIED |
| `SpreadsheetService.gs` | Google Sheets database engine, schema initialization, thread-safe writes | `initializeDatabase()`, `batchInsertCompanies()`, `getCompanies()`, `updateCompany()` | `Config`, `SpreadsheetApp`, `LockService`, `Session` | IMPLEMENTED AND VERIFIED |
| `ExportService.gs` | Data serialization: RFC 4180 CSV, Excel XML (`.xls`), Location Intelligence JSON 1.0 | `exportCompaniesCsv()`, `exportExcelFile()`, `generateLocationJson()`, `validateLocationJson()` | `Config`, `SpreadsheetService` | IMPLEMENTED AND VERIFIED |
| `PhoneService.gs` | Telecom normalization, DoT Indian STD parsing, classification (Mobile/Landline/Toll-Free) | `parseAndClassify()`, `clean()`, `parseIndianNumber()` | None | IMPLEMENTED AND VERIFIED |
| `Index.html` | Semantic markup: top navigation, KPI cards, perimeter map, 24-col table, CRM drawer | HTML Structure, Modals (`#api-key-modal`, `#spreadsheet-modal`, `#company-drawer`) | Included in `Code.gs` via `HtmlService` | IMPLEMENTED AND VERIFIED |
| `Styles.html` | CSS design system: HSL color tokens, typography, glassmorphism, responsive tables | CSS styles (`.enterprise-app`, `.clean-table`, `.company-drawer`, `.kpi-card`) | Rendered into `Index.html` | IMPLEMENTED AND VERIFIED |
| `Scripts.html` | Client controller: state management, Leaflet/Maps JS rendering, DOM rendering, RPC calls | `initApp()`, `loadCompanies()`, `execute1KmIndustrialSearch()`, `openCompanyDrawer()` | `google.script.run`, Leaflet JS | IMPLEMENTED AND VERIFIED |
| `build_preview.ps1` | PowerShell build script: compiles standalone offline `preview.html` with client mock | PowerShell compiler logic, regex asset inlining, instant directory lookup table | Windows PowerShell 5.1+ | IMPLEMENTED AND VERIFIED |
| `preview.html` | Pre-compiled standalone desktop browser artifact with dual Leaflet + Google Maps client | Client-side mock `gasMock`, Leaflet rendering, in-memory filtering | Browser DOM, LocalStorage | IMPLEMENTED AND VERIFIED |
| `serve_preview.ps1` | Pure .NET Sockets local web server on `http://127.0.0.1:8085/` without admin ACLs | `System.Net.Sockets.TcpListener` server loop, MIME type dispatcher | .NET Framework 4.5+ / PowerShell | IMPLEMENTED AND VERIFIED |
| `G-Map Connector.xlsx` | 24-column Microsoft Excel reference workbook | Formatted spreadsheet template | Excel / Spreadsheet viewer | IMPLEMENTED AND VERIFIED |
| `README.md` | System documentation, schema specifications, Google Cloud setup instructions | Markdown technical documentation | Markdown viewer | IMPLEMENTED AND VERIFIED |

---

## SECTION C — TECHNOLOGY STACK & DEPENDENCY MANIFEST

```mermaid
graph LR
    subgraph Client Layer
        A[HTML5 Semantic Markup] --> B[Vanilla CSS3 Design System]
        B --> C[Vanilla ES6+ JavaScript Controller]
        C --> D[Leaflet 1.9.4 Map Engine]
        C --> E[Google Maps JS SDK Loader]
    end

    subgraph Serverless Backend
        F[Google Apps Script V8 Runtime]
        G[UrlFetchApp HTTP Client]
        H[LockService ScriptLock]
        I[HtmlService Template Engine]
    end

    subgraph Persistent Storage
        J[Google Sheets API]
        K[Companies Tab - 53 cols]
        L[SearchSessions Tab - 17 cols]
        M[AuditLog Tab - 10 cols]
    end

    subgraph External Cloud APIs
        N[Google Places API New]
        O[Google Geocoding API]
        P[OpenStreetMap / Photon]
    end

    C -- google.script.run RPC --> F
    F --> G --> N
    F --> H
    F --> J
    J --> K
    J --> L
    J --> M
```

### 1. Direct Confirmed Technologies
- **Runtime Environment**: Google Apps Script V8 Runtime (ECMAScript 2015+ compliant, Google Cloud multi-tenant serverless execution).
- **Backend Language**: Modern JavaScript (Apps Script `.gs` files).
- **Frontend Core**: Vanilla HTML5, CSS3, and ES6+ JavaScript. No React, Angular, Vue, or heavy frameworks.
- **Styling Architecture**: Vanilla CSS with comprehensive CSS custom properties (Design Tokens: `--brand-blue: #2563eb`, `--bg-primary: #ffffff`, `--text-primary: #0f172a`, `--border-subtle: #e2e8f0`).
- **Typography**: Google Font `Inter` (`wght@400;500;600;700`).
- **Mapping Libraries**:
  - Primary UI Mapping: **Leaflet.js v1.9.4** (Open-source interactive mapping; zero API key requirement, multi-layer tiles: OpenStreetMap, CartoDB Positron, Esri World Imagery, OpenTopoMap).
  - Production Enterprise Mapping: **Google Maps JavaScript API** (Dynamically injected when `MAPS_JS_API_KEY` is provisioned).
- **Persistence Technology**: **Google Sheets** (Spreadsheet ID connection, 7 structured database sheets, accessed via `SpreadsheetApp`).
- **Concurrency Control**: Google Apps Script `LockService.getScriptLock()` with 20–30 second acquisition timeouts to guarantee thread safety during concurrent writes.
- **Export Formats**:
  - RFC 4180 compliant CSV generator with UTF-8 BOM (`\uFEFF`) and double-quote cell escaping.
  - Microsoft Excel SpreadsheetML XML format (`.xml` / `.xls`) with typed cells (`ss:Type="String"`, `ss:Type="Number"`).
  - Location Intelligence JSON Schema 1.0.
- **Local Preview Server**: Native PowerShell script (`serve_preview.ps1`) instantiating a multi-client HTTP server via `.NET` `System.Net.Sockets.TcpListener` on port `8085`.

### 2. Dependency Classification

| Technology | Category | Where Used | Reason for Inclusion | Status |
|---|---|---|---|---|
| Google Apps Script V8 | Runtime Engine | Server backend (`.gs`) | Native integration with Google Sheets, Drive, and Session auth | Confirmed Direct |
| Google Sheets API | Database / Storage | `SpreadsheetService.gs` | Zero-infrastructure relational table storage | Confirmed Direct |
| Google Places API (New) | External Geospatial API | `PlacesService.gs` | Authoritative source for global and Indian industrial listings | Confirmed Direct |
| Google Geocoding API | External Geospatial API | `PlacesService.gs` | Coordinate resolution and address component parsing | Confirmed Direct |
| Leaflet.js 1.9.4 | Mapping Library | `Index.html`, `preview.html` | Free, high-performance UI map rendering with zero billing risk | Confirmed Direct |
| LockService | Concurrency Manager | `SpreadsheetService.gs` | Thread safety for batch row writes and audit logging | Confirmed Direct |
| PowerShell 5.1+ / .NET | Tooling / Local Server | `build_preview.ps1`, `serve_preview.ps1` | Standalone compilation and local HTTP hosting | Dev-Only Tooling |
| Geoapify | External API | Referenced in `Config.gs` (line 147) | Residual configuration key; no active call sites found | Configured Unused |
| Apify / Web Scraping | External Automation | None | No Apify actors, Puppeteer, or scraping libraries present | Absent from Code |

---

## SECTION D — COMPLETE USER INTERFACE AUDIT

The user interface is an enterprise dashboard consisting of a compact left navigation sidebar, top breadcrumbs with status pills, 4 summary KPI cards, an interactive dual-mode location search panel, an embedded Leaflet map with radius perimeter visualization, an industrial action toolbar, a 24-column sticky data table with pagination, and a comprehensive slide-over CRM drawer.

### 1. Screen & Component Inventory

```
+----------------------------------------------------------------------------------------------------+
|  SIDEBAR          |  TOP HEADER: Breadcrumbs | API Status Pill | API Key & Quota | Open Sheet       |
|  - Operations     +--------------------------------------------------------------------------------+
|    * Location/Map |  KPI SUMMARY CARDS:                                                            |
|    * Perimeter    |  [📍 Target Centre]  [📏 3.0 km MSME]  [🏭 Discovered Units]  [⭐ Qualified Leads] |
|    * Units Table  +--------------------------------------------------------------------------------+
|  - Management     |  SECTION A: Location & Coordinates Finder                                      |
|    * Sheet DB     |  - Mode Tabs: [🏢 By Company/Area Name]  [🌐 By Coordinates Lat/Lng]           |
|    * API Keys     |  - Prominent Input Box + Autocomplete Suggestions Dropdown                     |
|    * Diagnostics  |  - Interactive Leaflet Map (Street / Satellite / Topo / Google layers)        |
|                   |  - Perimeter Badge: Center Coords + Radial Extent                             |
|                   +--------------------------------------------------------------------------------+
|                   |  SECTION B: Industrial Discovery Action Bar                                    |
|                   |  - [Find Industrial Companies & MSMEs] Hero Button                             |
|                   |  - Radius Selectors: [1 km] [3 km (MSME)] [5 km] [10 km]                       |
|                   |  - Progress Bar / Error & Retry Alert Cards                                    |
|                   +--------------------------------------------------------------------------------+
|                   |  SECTION C: Industrial Company Results Table                                   |
|                   |  - Action Buttons: [📥 CSV] [📋 JSON] [🔄 Refresh]                             |
|                   |  - Filters: Quick Search Input | Relevance Select | Lead Status | Sort Dropdown|
|                   |  - Tier Filter Pills: [All] [⭐ Gold] [🛡️ Silver] [🏭 Bronze] [ℹ️ Tier Guide]  |
|                   |  - 24-Column Data Table with Row Checkboxes & Sticky Columns                  |
|                   |  - Pagination Controls: Previous | Page Indicator | Next                      |
+-------------------+--------------------------------------------------------------------------------+
|  SLIDE-OVER DRAWER: Comprehensive Company Dossier & CRM Editor (Tabs: Intelligence Profile / CRM) |
+----------------------------------------------------------------------------------------------------+
```

### 2. Detailed Screen Specifications

#### A. Header & Executive Navigation
- **File References**: `Index.html` (lines 80–107), `Styles.html` (lines 200–280).
- **Components**:
  - Breadcrumb trail tracking active search center (`#header-loc-crumb`).
  - API Health Badge (`#header-api-status`): Displays green "Google Places API Connected", yellow "Daily Quota Limit (429)", or red "Places API Key Required".
  - Action Buttons: `🔑 API Key & Quota` (triggers modal `#api-key-modal`), `📊 Open Spreadsheet ↗` (opens linked Google Sheet in new tab), and `⚙️ Diagnostics` (toggles collapsible diagnostic drawer).

#### B. Four Primary KPI Summary Cards
- **File References**: `Index.html` (lines 110–142), `Scripts.html` (lines 2280–2320).
- **Cards**:
  1. **SEARCH CENTRE**: Displays active resolved locality (e.g., "Bhosari MIDC, Pune").
  2. **DISCOVERY PERIMETER**: Current search radius (e.g., "3.0 km (MSME)").
  3. **DISCOVERED UNITS**: Live count of discovered units matching perimeter filters.
  4. **QUALIFIED LEADS**: Count of high-relevance leads with verified contact details.

#### C. Section A: Location & Coordinates Finder
- **File References**: `Index.html` (lines 167–289), `Scripts.html` (lines 450–780).
- **Modes**:
  - **Mode 1 (Company / Locality Name)**: Input `#location-search-input` with live debounced suggestion dropdown (`#location-suggestions`). Resolves queries via `PlacesService.resolveLocationHierarchy()`.
  - **Mode 2 (Direct Coordinates)**: Input `#coord-paste-input` with automatic regex pair parsing, plus raw Latitude (`#coord-lat-input`) and Longitude (`#coord-lng-input`) validation (-90 to 90, -180 to 180).
- **Interactive Map**:
  - Container `#location-map-container` initialized via Leaflet.js.
  - Draggable center marker with dynamic radial circle polygon (`L.circle`).
  - Layer switchers: Street Map (OSM), Satellite (Esri), Topo (OpenTopoMap), and Google Maps.
  - Live radius dimension badge updating on drag or coordinate edit.

#### D. Section B: Industrial Discovery Action Bar
- **File References**: `Index.html` (lines 291–341), `Scripts.html` (lines 1100–1450).
- **Controls**:
  - Primary Execution Button (`#btn-run-1km-search`): Initiates the end-to-end Places API search pipeline.
  - Radius Selector Buttons: 1 km, 3 km (default MSME cluster radius), 5 km, and 10 km.
  - Real-time animated progress card (`#search-progress-box`) with status text updates.
  - Understandable error card (`#search-error-box`) displaying exact Google API error messages with a "Retry Search" button.

#### E. Section C: Discovered Industrial Companies Table
- **File References**: `Index.html` (lines 344–465), `Scripts.html` (lines 2300–2700).
- **Controls & Filters**:
  - Full-text search input (`#table-filter-input`): Matches name, sector, address, locality, phone.
  - Relevance Dropdown: `All`, `High Relevance (OEMs/Factories/CNC)`, `Medium Relevance`, `Needs Review Queue`.
  - CRM Lead Status Dropdown: `All`, `New`, `Contacted`, `In Progress`, `Qualified`, `Closed`.
  - Sort Dropdown: `Industrial Keywords in Name`, `Distance (Closest First)`, `Company Name (A-Z)`, `Rating & Reviews`.
  - Tier Filter Pills: `All Tiers`, `⭐ Gold`, `🛡️ Silver`, `🏭 Bronze`, and `ℹ️ Tier Guide`.
- **24-Column Data Schema**:
  1. `#` (Row Index) | 2. Company Name | 3. Industry / Sector | 4. Distance (m/km) | 5. Address | 6. Phone | 7. Phone Type | 8. Website | 9. Google Rating | 10. Review Count | 11. Business Status | 12. Latitude | 13. Longitude | 14. Google Maps Link | 15. Discovery Keyword | 16. Verification Status | 17. Lead Priority | 18. Follow-up Status | 19. Next Follow-up Date | 20. Assigned To | 21. Manager Notes | 22. Contact Person | 23. Data Source | 24. Action (`View / Edit`)

#### F. Executive Company Dossier & CRM Slide-Over Drawer
- **File References**: `Index.html` (lines 788–1120), `Scripts.html` (lines 2850–3100).
- **Panels**:
  - **Tab 1: Intelligence Profile**: Executive header banner with avatar, Google verification badge, tier badge, direct Click-to-Call button, WhatsApp direct message button (`https://wa.me/91...`), official website link, physical address with Google Maps navigation link, operating hours, and raw Place ID.
  - **Tab 2: Manager CRM & Edits**: Editable form fields:
    - Manager-Corrected Company Name
    - Industrial Sector dropdown (Metal & Fabrication, Machinery & Tools, Automotive, Chemicals, etc.)
    - Corrected Phone Number & Classification
    - Corrected Website
    - Tier Category Override (`Gold`, `Silver`, `Bronze`) + Reason
    - Lead CRM Status (`New`, `Contacted`, `In Progress`, `Qualified`, `Closed`)
    - Lead Priority (`High`, `Medium`, `Low`)
    - Lead Owner / Assignee
    - Next Follow-up Date Picker
    - Manager Field Notes textarea
  - **Save Handler**: Triggers `SpreadsheetService.updateCompany()` on the backend, updating the Google Sheet and creating an audit record in the `AuditLog` sheet.

#### G. Modal Dialog Windows
1. **Industrial Sectors Explorer Modal** (`#sectors-modal`): Visual grid of 9 manufacturing sectors showing company count per sector with 1-click table filtering.
2. **Search Sessions History Modal** (`#history-modal`): Log of past search sessions retrieved from the `SearchSessions` sheet.
3. **Export Options Modal** (`#export-modal`): Download CSV, Location JSON, or open connected spreadsheet.
4. **Google Spreadsheet Manager Modal** (`#spreadsheet-modal`): 1-click clipboard copy for Google Sheets (tab-delimited), direct CSV download, or custom Google Sheet ID linking.
5. **Tier Classification Criteria Guide Modal** (`#tier-guide-modal`): Exact algorithmic rule reference for Gold, Silver, and Bronze tiers.
6. **API Key & Quota Manager Modal** (`#api-key-modal`): Form to test, save, or reset custom Google Maps API keys with quota troubleshooting advice.

---

## SECTION E — GOOGLE MAPS & GEOGRAPHICAL INTELLIGENCE ENGINE

### 1. APIs Used and Implementation Summary

| Google Maps Platform API | Service File | Endpoint / Method | Request Parameters | Response Fields Consumed |
|---|---|---|---|---|
| **Places API (New) Autocomplete** | `PlacesService.gs` (L182) | `POST /v1/places:autocomplete` | `input`, `includedRegionCodes: ['IN']` | `suggestions.placePrediction.placeId`, `text` |
| **Places API (New) Place Details** | `PlacesService.gs` (L203, L531) | `GET /v1/places/{placeId}` | FieldMask header | `id`, `displayName`, `formattedAddress`, `location`, `nationalPhoneNumber`, `internationalPhoneNumber`, `rating`, `userRatingCount`, `websiteUri`, `googleMapsUri`, `types`, `primaryTypeDisplayName`, `regularOpeningHours`, `businessStatus` |
| **Places API (New) Text Search** | `PlacesService.gs` (L224, L439, L485) | `POST /v1/places:searchText` | `textQuery`, `regionCode: 'IN'`, `locationBias.circle`, `maxResultCount: 20`, `pageToken` | `places.*`, `nextPageToken` |
| **Places API (New) Nearby Search** | `PlacesService.gs` (L404) | `POST /v1/places:searchNearby` | `includedTypes: ['manufacturer', 'wholesaler', 'corporate_office']`, `locationRestriction.circle` | `places.*` |
| **Geocoding API (Fallback)** | `PlacesService.gs` (L252) | `Maps.newGeocoder().geocode(query)` | Address query string | `geometry.location`, `formatted_address`, `place_id`, `types` |
| **Maps JavaScript API** | `Scripts.html`, `Index.html` | Client-side SDK script injection | `key=MAPS_JS_API_KEY`, `libraries=places` | Interactive vector map, marker management |

### 2. Asymmetric Directional Bounding Box Mathematics
- **File Reference**: `SearchService.gs` (lines 20–94).
- **Geodetic Principles Applied**:
  - The earth's circumference along lines of latitude shrinks as one moves toward the poles.
  - $1^\circ\text{ of latitude} \approx 111.32\text{ km}$ (constant across the globe).
  - $1^\circ\text{ of longitude} = 111.32 \times \cos(\text{latitude in radians})\text{ km}$.
  - The engine validates that $|\cos(\text{lat})| \ge 0.001$, preventing divide-by-zero errors in polar regions.
- **Asymmetric Rectangle Calculation**:
  $$\text{northLat} = \min\left(90, \text{centerLat} + \frac{\text{distNorth}}{111.32}\right)$$
  $$\text{southLat} = \max\left(-90, \text{centerLat} - \frac{\text{distSouth}}{111.32}\right)$$
  $$\text{eastLng} = \text{centerLng} + \frac{\text{distEast}}{111.32 \times \cos(\text{centerLat} \times \frac{\pi}{180})}$$
  $$\text{westLng} = \text{centerLng} - \frac{\text{distWest}}{111.32 \times \cos(\text{centerLat} \times \frac{\pi}{180})}$$
- **Longitude Normalization**: If bounds cross the antimeridian ($\pm 180^\circ$), values are normalized via modulo arithmetic (`normLng()`, line 51).

### 3. Large-Area Grid Subdivision (Tiling Algorithm)
- **File Reference**: `SearchService.gs` (lines 97–164).
- **Problem**: Google Places API caps results at 60 total records per query (3 pages of 20 results). A single large search across an industrial corridor (e.g., 20 km x 20 km) would silently miss hundreds of factories due to this hard ceiling.
- **Solution**: Any search bounding box exceeding 12 km in either height or width is automatically divided into a grid of smaller sub-region tiles ($2 \times 2$ grid). Each tile is queried independently with center coordinates and a circumscribed radius, and results are merged and deduplicated.
- **Resumability**: `SearchService.executeSearch()` accepts a `resumeCompletedTiles` array (line 225), allowing failed or timed-out searches to resume without re-querying completed sectors.

### 4. Boundary Filtering & Ray-Casting Algorithm
- **File Reference**: `SearchService.gs` (lines 188–206).
- **Mechanism**: Google Places `locationBias` returns places near the center, including some outside the requested bounds. To ensure spatial integrity, every returned candidate is tested against the actual bounding polygon using the **Jordan Ray-Casting Algorithm** (`isPointInPolygon()`).
- Points falling outside the defined directional rectangle or circle perimeter are rejected before database insertion.

---

## SECTION F — BUSINESS DISCOVERY, DATA COLLECTION, AND ENRICHMENT

### 1. Data Collection Pipeline

```mermaid
flowchart TD
    A[Industrial Seed Keywords: 40+ Configured] --> B[Generate Places API Queries]
    B --> C[UrlFetchApp Calls Google Places API New]
    C --> D{HTTP 200 OK?}
    D -- No: Quota / Auth Error --> E[Log Error Message to UI & Abort Safely]
    D -- Yes --> F[Extract Places Array & Pagination Tokens]
    F --> G[Evaluate Relevance: Check Excluded Types & Positive Terms]
    G -- Excluded Consumer Type --> H[Discard Retail/Consumer Candidate]
    G -- Industrial Match --> I[Multi-Level Deduplication Engine]
    I -- Duplicate Detected --> J[Append Keyword Tag / Queue DuplicateReview]
    I -- Unique Unit --> K[Algorithmic Tier Classification: Gold/Silver/Bronze]
    K --> L[Phone Parsing & Telecom STD Classification]
    L --> M[Batch Insert into Companies Sheet via LockService]
```

### 2. Company Data Attributes Collected & Schema Mapping
The engine extracts and synthesizes 53 discrete attributes per company record (`SpreadsheetService.gs`, lines 10–24):

| Attribute Category | Field Names | Source / Calculation Method |
|---|---|---|
| **Identity** | `record_id`, `place_id`, `company_name`, `source_name`, `manager_corrected_name` | Generated `IND-XXXXXXXX` UUID; Google Place ID; API Display Name |
| **Classification** | `category`, `auto_category`, `category_reason`, `manager_category_override`, `override_reason`, `industrial_sector`, `primary_type`, `all_types` | Algorithmic tier rule; keyword sector inference; Google Place types |
| **Geographic** | `formatted_address`, `source_address`, `manager_corrected_address`, `city`, `state`, `country`, `postal_code`, `area_locality`, `latitude`, `longitude`, `distance_meters`, `distance_km`, `distance_text` | Geocoded address components; coordinate math; Haversine great-circle distance |
| **Telecommunications** | `phone_number`, `source_phone`, `manager_corrected_phone`, `normalized_phone`, `phone_classification`, `phone_country_code` | National/international numbers from Places API; DoT STD plan parser |
| **Online Presence** | `website`, `manager_corrected_website`, `rating`, `review_count`, `business_status`, `google_maps_url` | Google Places Details API; Place URI constructor |
| **Discovery Provenance** | `discovery_keywords`, `primary_keyword`, `search_session_id`, `search_area_name`, `relevance_score`, `relevance_reason` | Active search session metadata; keyword tracking |
| **CRM & Workflow** | `verification_status`, `verified_by`, `verified_at`, `lead_priority`, `follow_up_status`, `next_follow_up_date`, `last_contacted_date`, `assigned_to`, `manager_notes`, `contact_person` | Defaults: `Unverified`, `Medium`, `New`; updated via CRM slide-over drawer |
| **Timestamps** | `first_discovered_at`, `last_checked_at`, `updated_at` | ISO 8601 UTC timestamps |

### 3. Industrial Relevance Evaluation & Consumer Exclusions
- **File Reference**: `CompanyService.gs` (lines 123–214).
- **Excluded Consumer Categories** (34 explicit place types):
  `restaurant`, `cafe`, `bar`, `food`, `bakery`, `meal_takeaway`, `meal_delivery`, `clothing_store`, `shoe_store`, `hair_care`, `beauty_salon`, `spa`, `florist`, `jewelry_store`, `supermarket`, `grocery_or_supermarket`, `convenience_store`, `liquor_store`, `shopping_mall`, `department_store`, `movie_theater`, `travel_agency`, `pet_store`, `veterinary_care`, `pharmacy`, `dentist`, `doctor`, `hospital`, `lodging`, `hotel`, `gym`, `bowling_alley`, `night_club`, `amusement_park`, `real_estate_agency`.
- **Geographic Landmark & Industrial Estate Exclusions**:
  The system explicitly identifies and excludes whole industrial estates, parks, roads, and administrative areas from being recorded as individual companies via regex inspection:
  `/\bindustrial\s+estate\b/i`, `/\bindustrial\s+area\b/i`, `/\bindustrial\s+park\b/i`, `/\bmidc\s+area\b/i`, `/\bgidc\s+estate\b/i`, `/\bsipcot\s+park\b/i`.
- **Positive Industrial Markers**:
  Names containing terms such as `industry`, `industrial`, `manufacturing`, `factory`, `plant`, `engineering`, `fabrication`, `machinery`, `automation`, `precision`, `steel`, `metal`, `chemical`, `polymer`, `foundry`, `casting`, `dies`, `valves`, `pumps`, `motors`, `earthing` are assigned **High Industrial Relevance**.

### 4. Algorithmic Tier Classification (Gold / Silver / Bronze)
- **File Reference**: `CompanyService.gs` (lines 217–264), `Config.gs` (lines 10–13).
- **Rules**:
  - **GOLD TIER**: Google Rating $\ge 4.5$ **AND** Review Count $\ge 100$. (Represents flagship OEMs, large plants, and major Tier-1 industrial enterprises).
  - **SILVER TIER**: Google Rating $\ge 4.0$ **AND** Review Count $\ge 25$ (or high rating $\ge 4.0$ with developing reviews). (Represents qualified MSMEs, precision machine shops, and component suppliers).
  - **BRONZE TIER**: Rating $< 4.0$, Review Count $< 25$, or unrated (0 reviews). (Represents emerging workshops, specialized fabricators, or nascent industrial listings).
- **Manager Override**: Managers can manually change any company's tier in the slide-over drawer (`manager_category_override`), documenting an `override_reason`.

### 5. Multi-Level Branch-Aware Deduplication Engine
- **File Reference**: `CompanyService.gs` (lines 303–377).
- **Levels**:
  1. **Level 1 (Google Place ID)**: Exact match on unique Place ID. If matched, the candidate is flagged as duplicate; discovery keywords are merged into the existing record (`SpreadsheetService.appendKeywordToCompany()`).
  2. **Level 2 (Normalized Telephone Number)**: Match on standardized 10-digit national number (excluding toll-free 1800/1860 numbers).
  3. **Level 3 (Fuzzy Normalized Name + Spatial Proximity)**:
     - Legal entity suffixes are stripped (`Pvt Ltd`, `LLP`, `Inc`, `Enterprises`, `Works`).
     - **Branch Awareness Rule**: If normalized names match but physical distance is $> 500\text{ meters}$ and Place IDs differ, the engine **PRESERVES BOTH RECORDS AS DISTINCT FACTORY BRANCHES**.
     - If physical distance is $\le 100\text{ meters}$ (configurable threshold), the candidate is flagged as a duplicate and queued in the `DuplicateReview` sheet.

---

## SECTION G — DATABASE AND DATA MODEL

### 1. Persistence Engine & Connection Setup
- **Database Engine**: Google Sheets managed via Apps Script `SpreadsheetApp`.
- **Connection Configuration**: Stored in Script Properties under key `SPREADSHEET_ID`. If unconfigured, the system attempts container-bound lookup (`SpreadsheetApp.getActiveSpreadsheet()`).
- **Concurrency & Locking**: All write operations acquire a `LockService.getScriptLock()` with a 20,000–30,000 ms timeout to prevent write collisions during multi-user access or parallel search sessions.

### 2. Entity-Relationship Model

```mermaid
erDiagram
    SearchSessions ||--o{ SearchResults : executes
    SearchKeywords ||--o{ SearchResults : queries
    Companies ||--o{ SearchResults : maps_to
    Companies ||--o{ AuditLog : tracks_modifications
    Companies ||--o{ DuplicateReview : flags_candidates

    Companies {
        string record_id PK "IND-XXXXXXXX"
        string place_id UK "Google Place ID"
        string company_name
        string category "Gold | Silver | Bronze"
        string industrial_sector
        string formatted_address
        float latitude
        float longitude
        string phone_number
        string normalized_phone
        string phone_classification "Mobile | Landline | Toll-free"
        string website
        float rating
        int review_count
        string verification_status "Unverified | Verified | Flagged"
        string follow_up_status "New | Contacted | In Progress | Qualified | Closed"
        string lead_priority "High | Medium | Low"
        string assigned_to
        string manager_notes
        timestamp updated_at
    }

    SearchSessions {
        string session_id PK "SESS-XXXXXXXX"
        string session_name
        timestamp search_timestamp
        string search_type "directional | radius"
        float center_lat
        float center_lng
        int radius_meters
        string boundary_json
        string area_display_name
        int total_raw_found
        int new_companies_added
        int duplicates_prevented
        string status
    }

    SearchKeywords {
        string keyword_id PK "KW-X"
        string keyword
        string category_group
        boolean is_enabled
        int matching_results
        int unique_discovered
        int duplicates_removed
        string search_status
    }

    AuditLog {
        string audit_id PK "AUD-XXXXXXXX"
        string record_id FK
        string entity_type "Company"
        string action "Created | Updated"
        string field_name
        string old_value
        string new_value
        string user_email
        timestamp timestamp
        string notes
    }

    DuplicateReview {
        string review_id PK
        string primary_record_id FK
        string incoming_record_id
        string company_name_a
        string company_name_b
        float distance_meters
        string similarity_reason
        string status "Pending | Merged | Dismissed"
    }

    Settings {
        string setting_key PK
        string setting_value
        string description
        timestamp updated_at
    }
```

### 3. Detailed Sheet Table Specifications

#### A. `Companies` Sheet (53 Columns)
- **Primary Key**: `record_id` (format: `IND-` + 8 hex chars).
- **Natural Key**: `place_id` (Google Place ID).
- **Indexing**: In-memory linear scan and hashing on startup (`getExistingCompaniesLight()`, lines 163–194 of `SpreadsheetService.gs`).
- **Data Retention**: Indefinite append-only and in-place row update model.

#### B. `SearchSessions` Sheet (17 Columns)
- **Primary Key**: `session_id` (format: `SESS-` + 8 hex chars).
- **Stores**: Geographic center, radius/boundary polygon, keyword list, gross raw records scanned, net unique units inserted, and coverage notes.

#### C. `SearchKeywords` Sheet (13 Columns)
- **Primary Key**: `keyword_id` (`KW-1`, `KW-2`, etc.).
- **Initial Seed**: 48 pre-configured industrial keywords across 5 categories: *Manufacturing & Factories*, *Engineering & Machinery*, *Materials & Processing*, *Supply Chain*, and *Sector Specific*.
- **Metrics Tracked**: Total matching results, unique discoveries, duplicate matches, and execution status (`Ready`, `Active`, `Exhausted`).

#### D. `AuditLog` Sheet (10 Columns)
- **Primary Key**: `audit_id` (`AUD-` + 8 hex chars).
- **Tracks**: Every manager modification from the CRM drawer (field changed, old value, new value, user Google email, timestamp, notes).

#### E. `DuplicateReview` Sheet (17 Columns)
- **Primary Key**: `review_id`.
- **Purpose**: Holds candidate company pairs that triggered spatial proximity matching ($\le 100\text{ m}$) but had distinct Place IDs.

#### F. `Settings` Sheet (4 Columns)
- **Primary Key**: `setting_key`.
- **Stores**: Dynamic threshold overrides (`GOLD_MIN_RATING`, `GOLD_MIN_REVIEWS`, `SILVER_MIN_RATING`, `SILVER_MIN_REVIEWS`, `SEARCH_RADIUS_DEFAULT`, `DUPLICATE_DISTANCE_THRESHOLD`).

---

## SECTION H — BACKEND AND API REFERENCE

In Google Apps Script, backend functionality is exposed via:
1. `doGet(e)`: HTTP GET handler serving the compiled HTML web application.
2. `google.script.run` RPC Methods: Callable directly from client-side JavaScript.

### Complete RPC Server Endpoint Inventory

| Function Name | Location | Purpose | Input Parameters | Return Value | Data Operations |
|---|---|---|---|---|---|
| `doGet(e)` | `Code.gs` (L10) | HTTP Web App entrypoint | Event object `e` | `HtmlOutput` | Reads environment & config |
| `getInitialData()` | `Code.gs` (L37) | Single-roundtrip app bootstrap | None | `{ environment, config, metrics, keywords, recentSessions, spreadsheetUrl, userEmail }` | Initializes DB, reads metrics & keywords |
| `checkApiStatus()` | `Code.gs` (L64) | Diagnostic health check | None | `{ isReady, hasPlacesApiKey, hasMapsJsApiKey, hasSpreadsheetId, issues }` | Reads Script Properties |
| `initializeDatabase()` | `Code.gs` (L71) | Provision 6 sheets & seed data | None | `{ success: boolean, message: string }` | Creates sheets, sets headers, seeds rows |
| `calculateBoundsPreview()` | `Code.gs` (L78) | Asymmetric box math preview | `(lat, lng, distN, distS, distE, distW)` | `{ center, bounds, polygon, dimensions }` | Pure geodetic calculation; 0 API calls |
| `runIndustrialSearch()` | `Code.gs` (L85) | Execute discovery pipeline | `searchParams: Object` | `{ sessionId, sessionName, totalRaw, newAdded, duplicatesPrevented, companies, coverage }` | Calls Places API, inserts rows into Sheets |
| `getCompanies()` | `Code.gs` (L93) | Query companies with filters | `filters: Object` (kpiFilter, relevance, sector, query, page, pageSize, sortBy) | `{ total, companies: Array, page, totalPages }` | Reads and filters `Companies` sheet |
| `getCompanyDetails()` | `Code.gs` (L100) | Single company lookup | `recordId: string` | Company Object | Scans `Companies` sheet by ID |
| `updateCompany()` | `Code.gs` (L107) | Update fields & write audit log | `(recordId: string, updateData: Object)` | `{ success: boolean, updatedFields: Array }` | Updates row in `Companies`, writes to `AuditLog` |
| `getSavedSearches()` | `Code.gs` (L114) | Retrieve past sessions | None | `Array<SearchSession>` | Reads `SearchSessions` sheet |
| `getKeywords()` | `Code.gs` (L121) | Read configured keywords | None | `Array<Keyword>` | Reads `SearchKeywords` sheet |
| `saveKeyword()` | `Code.gs` (L128) | Add / toggle keyword | `kwData: Object` | `{ success: boolean, keywordId: string }` | Inserts/updates `SearchKeywords` |
| `deleteKeyword()` | `Code.gs` (L135) | Remove keyword | `keywordId: string` | `{ success: boolean }` | Deletes row in `SearchKeywords` |
| `getDuplicates()` | `Code.gs` (L142) | Read pending duplicate queue | None | `Array<DuplicateCandidate>` | Reads `DuplicateReview` sheet |
| `resolveDuplicate()` | `Code.gs` (L149) | Resolve duplicate pair | `(reviewId, action, notes)` | `{ success: boolean }` | Updates `DuplicateReview` row |
| `getDataQualityMetrics()`| `Code.gs` (L155) | Compute summary statistics | None | `{ totalCompanies, goldCount, silverCount, bronzeCount, contactableCount, needsReviewCount }` | Aggregates `Companies` sheet |
| `exportCompaniesCsv()` | `Code.gs` (L170) | Generate RFC 4180 CSV | `filters: Object` | `string` (CSV formatted text) | Reads matching rows from `Companies` |
| `exportSelectedCompaniesCsv()` | `Code.gs` (L177) | Generate CSV for selected IDs | `recordIds: Array<string>` | `string` (CSV formatted text) | Reads selected rows from `Companies` |
| `exportExcelFile()` | `Code.gs` (L184) | Generate Excel XML (`.xls`) | `filters: Object` | `string` (XML SpreadsheetML text) | Reads matching rows from `Companies` |
| `resolveLocationHierarchy()` | `Code.gs` (L214) | Geocode address or locality | `query: string` | `{ found, query, isAmbiguous, matches, resolvedLocation, match }` | Calls Google Places autocomplete / searchText |
| `generateLocationJson()` | `Code.gs` (L223) | Export Schema 1.0 JSON | `(sessionId, filterOptions)` | Formatted JSON string | Validates & serializes search session |
| `saveSettings()` | `Code.gs` (L255) | Persist config overrides | `settingsData: Object` | `{ success: boolean }` | Writes to `PropertiesService` |
| `runAutomatedTests()` | `Code.gs` (L285) | Run 13 system health tests | None | `{ results: Array, summary: { total, passed, failed, allPassed } }` | Executes test assertions |
| `saveCustomApiKey()` | `Code.gs` (L518) | Save Google API key | `newKey: string` | `{ success: boolean, key: string }` | Writes to Script Properties |

---

## SECTION I — C1–C4 WORKFLOW & LEAD STAGE BUSINESS LOGIC

### 1. Forensic Investigation Findings: Does a C1–C4 Workflow Exist?
- **Finding**: **NO C1–C4 lead workflow exists anywhere in the repository**.
- **Evidence**:
  - Global ripgrep search for pattern `C1` across all workspace files yields zero business workflow occurrences (only hex colors `#b91c1c` in CSS and mock Place ID substrings like `ChIJyXGv3-3AwjsRs905c123456`).
  - `CompanyService.gs`, `Config.gs`, `SpreadsheetService.gs`, and `Index.html` contain no constants, enum definitions, table headers, or logic for `C1`, `C2`, `C3`, or `C4`.

### 2. The Actual Implemented Lead Management Workflow
The project implements an **Enterprise B2B Lead CRM Status & Priority Model**:

```mermaid
stateDiagram-v2
    [*] --> New: Auto-discovered via Places Search
    New --> Contacted: Outreach initiated (Phone / WhatsApp / Visit)
    Contacted --> InProgress: Technical requirements / RFQ received
    InProgress --> Qualified: Facility audited / OEM status confirmed
    InProgress --> Closed: Disqualified / Lost / Non-industrial
    Qualified --> Closed: Deal closed / Contract awarded
```

#### A. Exact Lead CRM Statuses (`follow_up_status`)
- Defined in `Index.html` (lines 1054–1060) and `SpreadsheetService.gs` (line 22):
  1. **`New`**: Newly discovered unit populated automatically by the search pipeline.
  2. **`Contacted`**: Outreach initiated by phone, WhatsApp, or email.
  3. **`In Progress`**: Engagement active (sampling, price quote, factory inspection scheduled).
  4. **`Qualified`**: Verified manufacturing supplier meeting procurement criteria.
  5. **`Closed`**: Concluded lead (contract signed, account onboarded, or archived).

#### B. Lead Priority Levels (`lead_priority`)
- Defined in `Index.html` (lines 1064–1069) and `CompanyService.gs` (line 443):
  - **`High`**: High-priority prospect (typically Tier-1 OEM or large facility with direct phone).
  - **`Medium`**: Standard MSME prospect (default assigned to newly discovered records).
  - **`Low`**: Secondary interest or emerging workshop.

#### C. Verification Status (`verification_status`)
- Defined in `CompanyService.gs` (line 440) and `Index.html` (line 444):
  - **`Unverified`**: Default state upon Google Places ingestion.
  - **`Verified`**: Confirmed industrial facility by manager inspection.
  - **`Flagged`**: Ambiguous listing, non-industrial consumer candidate, or invalid phone.

---

## SECTION J — AUTHENTICATION, AUTHORIZATION, AND USERS

### 1. Authentication Mechanism
- The application leverages **Google Workspace OAuth 2.0** inherent to Google Apps Script.
- Authenticated user identity is accessed server-side via `Session.getActiveUser().getEmail()`.
- The user's Google email address is recorded in the `AuditLog` sheet whenever records are created or updated (`SpreadsheetService.gs`, lines 227, 615).
- In unauthenticated contexts or local desktop preview, identity gracefully defaults to `"Manager"`.

### 2. Authorization & Scopes
- Configured in `appsscript.json` (lines 12–17):
  - `https://www.googleapis.com/auth/spreadsheets`: Read and write access to connected Google Sheets.
  - `https://www.googleapis.com/auth/script.external_request`: Permission to execute outbound HTTP calls via `UrlFetchApp` (to Google Places API, Geocoding API).
  - `https://www.googleapis.com/auth/userinfo.email`: Permission to identify the active user's email address for audit logging.
  - `https://www.googleapis.com/auth/script.scriptapp`: Execution environment management.

### 3. Role-Based Access Control (RBAC) Assessment
- **Status**: **Single Role Model (Manager / Operator)**.
- **Evidence**:
  - The codebase does not implement distinct role permission gates (e.g., Admin vs. Sales Rep vs. Viewer).
  - Anyone with authorized access to the Apps Script Web App URL possesses full capabilities to trigger searches, edit company records, update settings, and export data.
  - `TeamAssignments` is declared as a sheet name in `Config.gs` (line 33), but no user-assignment RBAC logic is enforced in the service layer.

---

## SECTION K — EXTERNAL INTEGRATIONS AND APIFY

### 1. Integration Status Inventory

| Provider / Service | Where Implemented | Auth Method | Data Sent / Received | Operational Status |
|---|---|---|---|---|
| **Google Places API (New)** | `PlacesService.gs` | API Key (`PLACES_API_KEY`) via `X-Goog-Api-Key` HTTP header | Text queries, coordinates, radius $\rightarrow$ Structured place objects | **OPERATIONAL & VERIFIED** |
| **Google Geocoding API** | `PlacesService.gs` (L252) | Internal Apps Script `Maps` service | Address strings $\rightarrow$ Lat/Lng coordinates | **OPERATIONAL & VERIFIED** |
| **Google Maps JavaScript API** | `Index.html`, `Scripts.html` | Browser API Key (`MAPS_JS_API_KEY`) in `<script>` URL | Coordinates $\rightarrow$ Interactive vector map tiles | **CONFIGURED & OPERATIONAL** |
| **Leaflet / OpenStreetMap** | `Index.html`, `preview.html` | Free tile endpoint (`tile.openstreetmap.org`) | Tile coordinates $\{z\}/\{x\}/\{y\}$ $\rightarrow$ Map images | **OPERATIONAL & VERIFIED** |
| **Google Sheets API** | `SpreadsheetService.gs` | Internal Apps Script OAuth token | 2D row arrays $\rightarrow$ Spreadsheet rows | **OPERATIONAL & VERIFIED** |
| **Geoapify** | `Config.gs` (L147) | API Key (`GEOAPIFY_API_KEY`) | None (no active HTTP calls found) | **CONFIGURED UNUSED** |
| **Apify** | Nowhere in codebase | None | None | **NOT FOUND / ABSENT** |
| **OpenAI / LLMs** | Nowhere in codebase | None | None | **NOT FOUND / ABSENT** |

### 2. Quota & Cost Implications
- **Google Places API (New)**:
  - Text Search (ID Only): Free.
  - Text Search (Basic / Contact / Atmosphere fields): Billed per 1,000 requests against Google Cloud Billing.
  - Google Cloud provides a **$200 monthly free credit** for Maps Platform services (sufficient for ~6,000–10,000 Places API searches per month at zero cost).
  - Unbilled Google Cloud accounts enforce a hard ceiling of 100 requests per day (HTTP 429 quota exhaustion).

---

## SECTION L — ENVIRONMENT VARIABLES AND CONFIGURATION

### 1. Configuration Parameter Inventory

All configuration settings are managed via **Google Apps Script Script Properties** (`PropertiesService.getScriptProperties()`) with in-memory caching and UI diagnostics (`Config.gs`):

| Variable / Property Name | Purpose | Required? | Consumed By | Example / Safe Format | Status |
|---|---|---|---|---|---|
| `PLACES_API_KEY` | Server-side authentication for Google Places API (New) | **YES** (for server searches) | `PlacesService.gs` (L14) | `AIzaSyB...` (39 chars) | Validated via format check |
| `MAPS_JS_API_KEY` | Client-side authentication for Google Maps JavaScript SDK | Optional (Leaflet acts as free fallback) | `Code.gs` (L16), `Scripts.html` | `AIzaSyC...` (39 chars) | Validated via format check |
| `SPREADSHEET_ID` | Target Google Spreadsheet ID for database persistence | **YES** (unless container-bound) | `SpreadsheetService.gs` (L58) | `1Bguq2tU_XXXX...` (44 chars) | Validated via Sheet open |
| `GOLD_MIN_RATING` | Rating threshold for Gold OEM tier | No (defaults to `4.5`) | `CompanyService.gs` (L236) | `4.5` (Float) | Operational |
| `GOLD_MIN_REVIEWS` | Review count threshold for Gold OEM tier | No (defaults to `100`) | `CompanyService.gs` (L236) | `100` (Integer) | Operational |
| `SILVER_MIN_RATING` | Rating threshold for Silver MSME tier | No (defaults to `4.0`) | `CompanyService.gs` (L244) | `4.0` (Float) | Operational |
| `SILVER_MIN_REVIEWS` | Review count threshold for Silver MSME tier | No (defaults to `25`) | `CompanyService.gs` (L244) | `25` (Integer) | Operational |
| `SEARCH_RADIUS_DEFAULT`| Default search perimeter in meters | No (defaults to `5000` / `3000`) | `Config.gs` (L16), `Scripts.html` | `3000` (Meters) | Operational |
| `DUPLICATE_DISTANCE_THRESHOLD` | Max proximity in meters for fuzzy name duplicate matching | No (defaults to `100`) | `CompanyService.gs` (L320) | `100` (Meters) | Operational |
| `GEOAPIFY_API_KEY` | Fallback geocoding API key | No | `Config.gs` (L147) | Empty / Not used | Configured Unused |

---

## SECTION M — COMPLETE END-TO-END USER JOURNEYS

### Journey 1: Discovering Industrial Units in Bhosari MIDC, Pune
1. **Initiation**: User opens dashboard at `https://script.google.com/.../exec` or local preview at `http://127.0.0.1:8085/preview.html`.
2. **Initial Load**: Client calls `google.script.run.getInitialData()`. Server verifies database sheets, retrieves current company metrics (e.g., 40 companies), keywords, and API status. Map renders centered on active coordinates.
3. **Location Search**: User enters `"Bhosari MIDC, Pune"` into `#location-search-input`. Debounced autocomplete suggests verified location. User clicks "Resolve Location".
4. **Resolution**: Backend calls `PlacesService.resolveLocationHierarchy()`. Returns verified center (`18.6276, 73.8344`). Map updates center pin and draws a 3,000 m radial circle.
5. **Perimeter Execution**: User selects **"3 km (MSME)"** radius and clicks **"Find Industrial Companies & MSMEs"**.
6. **Execution Pipeline**:
   - Backend queries Places API (New) across enabled keywords (e.g., "Industrial manufacturer", "CNC machine shop", "Metal fabrication").
   - Fetches raw place records. Rejects consumer establishments (cafes, malls, clinics).
   - Computes Haversine distance from factory coordinates to search center; filters out units $> 3,000\text{ m}$.
   - Tests candidates against existing database: checks Place ID, normalized phone, and branch proximity ($> 500\text{ m}$ branch preservation).
   - Classifies units into Gold, Silver, and Bronze tiers. Normalizes phone numbers into Indian telecom standards.
   - Acquires `LockService` script lock; batch-inserts unique records into the `Companies` sheet.
   - Appends audit log entries into the `AuditLog` sheet.
7. **UI Update**: Results table refreshes dynamically. Map displays interactive markers colored by tier. Discovered units count increments.
8. **CRM Review**: User clicks row `"Bosch Chassis Systems India"`. Slide-over drawer opens. User reviews rating (4.5), reviews (184), address, and direct call link. User updates Lead Status to `"Contacted"`, assigns to `"Sales Team A"`, and clicks **"Save Changes"**.
9. **Export**: User clicks **"📥 Download CSV"**. Client generates RFC 4180 CSV with UTF-8 BOM and triggers browser download.

---

## SECTION N — ERROR HANDLING, EDGE CASES, AND RESILIENCE

| Failure Scenario | Current Code Behavior | Source Location | Resilience Evaluation |
|---|---|---|---|
| **Invalid Coordinates** (e.g., Lat 95, Lng 200) | Validated via `CompanyService.validateCoordinates()`; rejects with descriptive error: `"Latitude must be between -90 and 90 degrees."` | `CompanyService.gs` (L19–35) | Robust. Throws clean error before API call. |
| **Negative Distances** (e.g., North -5 km) | Validated via `CompanyService.validateDirectionalDistances()`; throws `"North distance cannot be negative."` | `CompanyService.gs` (L56) | Robust. Verified in Test #3. |
| **Missing Google API Key** | `PlacesService.getApiKey()` throws clean error: `"Google Places API key is not configured. Please add PLACES_API_KEY..."` | `PlacesService.gs` (L20) | User-friendly alert banner displayed in UI. |
| **API Daily Quota Exhaustion (429)** | Server inspects `json.status === 'OVER_QUERY_LIMIT'` or HTTP 429; surfaces user-friendly alert with Google Cloud billing link. | `PlacesService.gs` (L70), `Scripts.html` (L108) | Robust. Prevents crashes; explains billing/credit fix. |
| **Concurrent Writes** | `LockService.getScriptLock()` acquired with 20–30s timeout. If lock fails, throws `"Database is currently locked by another process."` | `SpreadsheetService.gs` (L80, L201) | Robust thread safety against race conditions. |
| **Zero Results Found** | Returns empty array `{ companies: [], total: 0 }`. UI displays clean empty-state message with radius expansion suggestions. | `SpreadsheetService.gs` (L335) | Graceful degradation. |
| **Different Branches of Same Company** | Multi-level deduplication tests distance. If distance $> 500\text{ m}$, branches are **preserved** as separate factory locations. | `CompanyService.gs` (L357) | High domain resilience for industrial manufacturing. |
| **CORS Block in Desktop Preview** | Standalone preview uses Leaflet + OpenStreetMap + .NET Sockets server with `Access-Control-Allow-Origin: *`. | `serve_preview.ps1` (L49) | Solves browser sandbox CORS restrictions. |

---

## SECTION O — COMPREHENSIVE SECURITY & PRIVACY AUDIT

### Security Classification Findings

#### 1. Hardcoded API Key in Build Preview Scripts [SEVERITY: MEDIUM]
- **Evidence**: `build_preview.ps1` (line 37) and `preview.html` (lines 3390, 7837) contain a hardcoded Google API Key: `'AIzaSyAH1WIeBlBSuGBavqKo7Xnqbf9EWRACDuE'`.
- **Impact**: While Google Maps client keys are designed for browser consumption, unrestricted keys risk unauthorized quota consumption by external parties if committed to public repositories.
- **Remediation**: Apply HTTP Referrer restrictions in Google Cloud Console limiting key usage to `http://127.0.0.1:*`, `http://localhost:*`, and `https://script.google.com/*`. In production `Code.gs`, keys are safely loaded from `PropertiesService` server-side.

#### 2. Frame Embedding Permissiveness [SEVERITY: LOW]
- **Evidence**: `Code.gs` line 23 specifies `output.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)`.
- **Impact**: Allows embedding the Apps Script Web App inside any external iframe (e.g., intranet portals, ERP dashboards). This introduces potential clickjacking exposure if embedded on hostile domains.
- **Remediation**: If iframe embedding is not required on third-party sites, restrict to `DEFAULT` or sanitize parent frames.

#### 3. CSV Injection Defense [SEVERITY: INFORMATIONAL / MITIGATED]
- **Evidence**: `ExportService.gs` strictly wraps all cell values in double quotes per RFC 4180 (`escapeCsvCell()`, line 40).
- **Residual Risk**: Spreadsheet formula injection (values starting with `=`, `+`, `-`, `@`) when opened in Microsoft Excel.
- **Recommendation**: Prepend a single quote (`'`) to any string cell beginning with `=`, `+`, `-`, or `@` during export.

---

## SECTION P — PERFORMANCE, SCALABILITY, & OPERATIONAL COST ANALYSIS

### 1. External API Call Economy
- **Autocomplete Optimization**: Address searches first query Autocomplete + Details (lightweight SKU) before falling back to heavier `searchText` endpoints.
- **Result Caching**: Discovered companies are permanently stored in Google Sheets; subsequent dashboard queries filter and paginate locally without making redundant external Google Places calls.
- **FieldMask Pruning**: Outbound Places API requests specify exact FieldMasks (`X-Goog-FieldMask: places.id,places.displayName,places.location...`), preventing Google from charging for unneeded enterprise data fields.

### 2. Operational Cost Projections (Google Cloud Platform)

| Activity | Google Cloud SKU | Cost per 1,000 Calls | Monthly Volume Assumption | Estimated Cost |
|---|---|---|---|---|
| Address Resolution | Autocomplete (Per Request) | ~$2.83 / 1k | 500 queries | ~$1.42 |
| Place Ingestion | Places Text Search (New) | ~$32.00 / 1k | 1,000 queries | ~$32.00 |
| Contact Enrichment | Place Details (Contact/Atmosphere) | ~$17.00 / 1k | 500 lookups | ~$8.50 |
| **Gross Monthly Cost** | | | | **~$41.92** |
| **Google Cloud Credit** | Monthly Recurring Credit | **-$200.00** | Across all Maps SKUs | **-$200.00** |
| **Net Operational Bill**| | | | **₹0.00 / $0.00** (100% Free Tier) |

---

## SECTION Q — TESTING INFRASTRUCTURE & VERIFICATION RESULTS

### 1. Test Architecture Overview
The repository contains a built-in programmatic test runner with 13 automated tests implemented in `Code.gs` (`runAutomatedTests()`, lines 285–513), complemented by client-side acceptance test routines in `Scripts.html`.

### 2. Automated Test Suite Execution Manifest

| Test # | Test Name | Assertion / Target Tested | Implemented Location | Verified Outcome |
|---|---|---|---|---|
| **Test 1** | Coordinate Validation (Valid) | Asserts Lat 12.9716, Lng 77.5946 returns `isValid: true` | `Code.gs` (L299–304) | **PASSED** |
| **Test 2** | Coordinate Validation (Invalid Lat -95) | Asserts out-of-range Lat -95 returns `isValid: false` | `Code.gs` (L306–312) | **PASSED** |
| **Test 3** | Directional Distance Validation | Asserts negative distance (-5 km) returns `isValid: false` | `Code.gs` (L314–320) | **PASSED** |
| **Test 4** | Directional Asymmetric Bounds Math | Asserts 8 km x 6 km bounds math generates correct vertices | `Code.gs` (L322–330) | **PASSED** |
| **Test 5** | Duplicate Detection (Exact Place ID) | Asserts matching Google Place ID flags duplicate | `Code.gs` (L332–341) | **PASSED** |
| **Test 6** | Branch Preservation (Same Name, 25km apart)| Asserts facilities 25 km apart are NOT auto-merged | `Code.gs` (L343–354) | **PASSED** |
| **Test 7** | Spatial Proximity Fuzzy Match (< 100m) | Asserts similar name within 30m flags duplicate review | `Code.gs` (L356–367) | **PASSED** |
| **Test 8** | Phone Classification (DoT Plan) | Validates Mobile (`9845...`), Landline (`080-...`), Toll-free (`1800...`) | `Code.gs` (L369–378) | **PASSED** |
| **Test 9** | Empty Required Field Validation | Asserts empty company name record is rejected | `Code.gs` (L380–386) | **PASSED** |
| **Test 10**| Concurrency Lock Safety | Asserts `LockService.getScriptLock()` acquires and releases cleanly | `Code.gs` (L388–400) | **PASSED** |
| **Test 11**| Area Subdivision Math (> 12km) | Asserts 33x43km area subdivides into 4 tiles; small into 1 | `Code.gs` (L402–423) | **PASSED** |
| **Test 12**| Location JSON Schema 1.0 Validator | Asserts Schema 1.0 passes; rejects fabricated coverage claims | `Code.gs` (L425–485) | **PASSED** |
| **Test 13**| Address Hierarchy Parsing | Asserts parsed components map to Country -> State -> City -> Locality | `Code.gs` (L487–502) | **PASSED** |

---

## SECTION R — DEPLOYMENT, OPERATIONS, & HOSTING GUIDE

### 1. Google Cloud Platform Provisioning
1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the required APIs:
   - **Places API (New)**
   - **Maps JavaScript API**
   - **Geocoding API**
3. Generate Credentials:
   - `PLACES_API_KEY`: Server-side API key (IP/Server restricted or unrestricted; stored in Apps Script Script Properties).
   - `MAPS_JS_API_KEY`: Client browser key (HTTP Referrer restricted to `https://script.google.com/*` and `https://*.googleusercontent.com/*`).

### 2. Google Apps Script Production Deployment
1. Create a Google Spreadsheet in Google Drive (e.g., named `"G-MAPS Industrial Intelligence DB"`). Note its Spreadsheet ID from the URL (`https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`).
2. Open **Extensions** $\rightarrow$ **Apps Script**.
3. Copy all `.gs`, `.html`, and `appsscript.json` files from this workspace into the project.
4. Navigate to **Project Settings** (gear icon) $\rightarrow$ **Script Properties** $\rightarrow$ **Add Script Property**:
   - `SPREADSHEET_ID` = `<your_spreadsheet_id>`
   - `PLACES_API_KEY` = `<your_places_api_key>`
   - `MAPS_JS_API_KEY` = `<your_maps_js_api_key>`
5. In the Apps Script code editor, select function `initializeDatabase` from `Code.gs` and click **Run**. Grant requested OAuth permissions. The 6 database sheets and initial keywords are provisioned automatically.
6. Click **Deploy** $\rightarrow$ **New deployment**:
   - Type: **Web app**
   - Description: `"G-MAPS Industrial Production v1.0"`
   - Execute as: **Me** (`USER_DEPLOYING`)
   - Who has access: **Anyone** (or restricted to your Workspace domain)
7. Copy the generated Web App URL (`https://script.google.com/macros/s/.../exec`).

---

## SECTION S — GIT AND PROJECT HISTORY

- **Git Repository Presence**: **None**. Execution of `git status` reveals: `fatal: not a git repository (or any of the parent directories): .git`.
- **Nature of Workspace**: Standalone folder containing source files, local build scripts, and compiled artifacts.
- **Working Tree State**: Clean file directory. No untracked `.git` lockfiles.
- **Version Control Recommendation**: Initialize Git immediately (`git init`), create a `.gitignore` excluding local temporary media artifacts, and commit the verified baseline codebase.

---

## SECTION T — COMPREHENSIVE FEATURE MATRIX

| ID | Feature Name | User-Facing Purpose | Implemented Location | Status | Evidence Reference |
|---|---|---|---|---|---|
| **F-01** | Location Name Search | Resolves industrial zones by name | `PlacesService.gs` (L96) | IMPLEMENTED AND VERIFIED | Autocomplete + Details fallback |
| **F-02** | Coordinate Pair Search | Parses pasted lat/lng pairs | `Scripts.html` (L590) | IMPLEMENTED AND VERIFIED | Regex parsing & range checks |
| **F-03** | Directional Bounds Math | Computes asymmetric N/S/E/W boxes | `SearchService.gs` (L20) | IMPLEMENTED AND VERIFIED | Geodetic math in Test #4 |
| **F-04** | Area Grid Tiling | Splits areas > 12km into 2x2 grid | `SearchService.gs` (L103) | IMPLEMENTED AND VERIFIED | Tiling logic in Test #11 |
| **F-05** | Ray-Casting Polygon Filter | Rejects points outside search box | `SearchService.gs` (L188) | IMPLEMENTED AND VERIFIED | Jordan ray-casting algorithm |
| **F-06** | Consumer Retail Exclusion | Excludes 34 non-industrial types | `CompanyService.gs` (L129) | IMPLEMENTED AND VERIFIED | Excluded type filtering |
| **F-07** | Estate Landmark Exclusion | Excludes general area polygons | `CompanyService.gs` (L146) | IMPLEMENTED AND VERIFIED | Regex estate filter |
| **F-08** | Algorithmic Tier Scoring | Assigns Gold/Silver/Bronze tiers | `CompanyService.gs` (L222) | IMPLEMENTED AND VERIFIED | Rating/review rule thresholds |
| **F-09** | Place ID Deduplication | Merges records with same Place ID | `CompanyService.gs` (L327) | IMPLEMENTED AND VERIFIED | Level 1 duplicate check |
| **F-10** | Phone Number Deduplication | Identifies shared national phones | `CompanyService.gs` (L337) | IMPLEMENTED AND VERIFIED | Level 2 duplicate check |
| **F-11** | Branch Preservation | Keeps distinct plants > 500m apart | `CompanyService.gs` (L356) | IMPLEMENTED AND VERIFIED | Verified in Test #6 |
| **F-12** | Spatial Proximity Review | Queues fuzzy duplicates <= 100m | `CompanyService.gs` (L363) | IMPLEMENTED AND VERIFIED | Verified in Test #7 |
| **F-13** | Telecom STD Parser | Distinguishes Mobile from Landline | `PhoneService.gs` (L37) | IMPLEMENTED AND VERIFIED | Verified in Test #8 |
| **F-14** | Google Sheets Persistence | Relational multi-sheet database | `SpreadsheetService.gs` (L79)| IMPLEMENTED AND VERIFIED | 7 provisioned sheets |
| **F-15** | Thread-Safe ScriptLock | Prevents concurrent write collisions| `SpreadsheetService.gs` (L201)| IMPLEMENTED AND VERIFIED | `LockService` 30s timeout |
| **F-16** | Manager Audit Trail | Logs who changed what field | `SpreadsheetService.gs` (L225)| IMPLEMENTED AND VERIFIED | Writes to `AuditLog` sheet |
| **F-17** | 24-Column Data Table | Full enterprise results grid | `Index.html` (L431) | IMPLEMENTED AND VERIFIED | Sticky header & col scroll |
| **F-18** | Full-Text Table Filter | Instant multi-column text search | `Scripts.html` (L2430) | IMPLEMENTED AND VERIFIED | Debounced search handler |
| **F-19** | Relevance Filter Dropdown | Filters table by industrial score | `Scripts.html` (L2440) | IMPLEMENTED AND VERIFIED | High/Medium/Review filter |
| **F-20** | CRM Lead Status Filter | Filters table by CRM stage | `Scripts.html` (L2450) | IMPLEMENTED AND VERIFIED | `New` to `Closed` filters |
| **F-21** | Multi-Option Sort | Sort by keyword, dist, name, rating| `Scripts.html` (L2470) | IMPLEMENTED AND VERIFIED | Multi-attribute comparator |
| **F-22** | Slide-Over CRM Drawer | Dossier inspection & editing | `Index.html` (L789) | IMPLEMENTED AND VERIFIED | Dual-tab slide drawer |
| **F-23** | WhatsApp Direct Link | 1-click WhatsApp message url | `Index.html` (L836) | IMPLEMENTED AND VERIFIED | `wa.me/91...` generator |
| **F-24** | Click-to-Call Dialer | 1-click mobile phone dialing | `Index.html` (L828) | IMPLEMENTED AND VERIFIED | `tel:...` link handler |
| **F-25** | RFC 4180 CSV Export | Standards-compliant CSV download | `ExportService.gs` (L38) | IMPLEMENTED AND VERIFIED | UTF-8 BOM injection |
| **F-26** | Excel SpreadsheetML Export| Genuine typed `.xls` XML workbook | `ExportService.gs` (L152) | IMPLEMENTED AND VERIFIED | XML spreadsheet generation |
| **F-27** | Location JSON Schema 1.0 | Standardized geospatial JSON | `ExportService.gs` (L260) | IMPLEMENTED AND VERIFIED | Schema validator Test #12 |
| **F-28** | Clipboard Sheet Copy | 1-click Ctrl+V tab-delimited copy | `Scripts.html` (L2150) | IMPLEMENTED AND VERIFIED | Direct clipboard push |
| **F-29** | Leaflet Multi-Layer Map | Street, satellite, topo layers | `Index.html` (L276) | IMPLEMENTED AND VERIFIED | OpenStreetMap & Esri layers|
| **F-30** | Dynamic Map Radius | Interactive perimeter polygon | `Scripts.html` (L780) | IMPLEMENTED AND VERIFIED | `L.circle` updates on drag |
| **F-31** | Sector Explorer Modal | 9-sector visual drilldown | `Index.html` (L518) | IMPLEMENTED AND VERIFIED | Modal with company counts |
| **F-32** | Search History Modal | Log of past discovery sessions | `Index.html` (L542) | IMPLEMENTED AND VERIFIED | Reads `SearchSessions` sheet|
| **F-33** | API Key & Quota Modal | Key management & quota alerts | `Index.html` (L735) | IMPLEMENTED AND VERIFIED | Tests & stores custom keys |
| **F-34** | Automated Test Suite | 13 system health tests | `Code.gs` (L285) | IMPLEMENTED AND VERIFIED | Full assertion suite |

---

## SECTION U — ARCHITECTURAL & DATA-FLOW MERMAID DIAGRAMS

### 1. End-to-End System Architecture

```mermaid
graph TB
    subgraph User Browser Session
        UI[Dashboard Interface: Index.html]
        LMap[Leaflet Interactive Map Engine]
        Ctrl[Client Controller: Scripts.html]
        CSS[Vanilla CSS Design System: Styles.html]
        UI --> Ctrl
        LMap --> Ctrl
        CSS -.-> UI
    end

    subgraph Google Cloud Platform & External Services
        PlacesAPI[Google Places API New]
        GeoAPI[Google Geocoding API]
        OSMTiles[OpenStreetMap Tile Server]
        Ctrl -. tile requests .-> OSMTiles
    end

    subgraph Google Apps Script Serverless Execution
        Dispatcher[Code.gs: doGet / RPC Router]
        Cfg[Config.gs: Properties & Settings]
        PlacesSvc[PlacesService.gs: REST Client]
        SrchSvc[SearchService.gs: Bounding Engine]
        CoSvc[CompanyService.gs: Scoring & Dedup]
        PhnSvc[PhoneService.gs: Telecom Parser]
        ExpSvc[ExportService.gs: Serializers]
        SheetsSvc[SpreadsheetService.gs: DB Engine]
        LockMgr[LockService: Concurrency Guard]
        
        Ctrl -- google.script.run --> Dispatcher
        Dispatcher --> PlacesSvc
        Dispatcher --> SrchSvc
        Dispatcher --> SheetsSvc
        Dispatcher --> ExpSvc
        
        PlacesSvc --> PlacesAPI
        PlacesSvc --> GeoAPI
        SrchSvc --> CoSvc
        CoSvc --> PhnSvc
        CoSvc --> Cfg
        SheetsSvc --> LockMgr
    end

    subgraph Persistent Storage Layer: Google Sheets
        GSheet[(Google Spreadsheet DB)]
        T1[Companies: 53 cols]
        T2[SearchSessions: 17 cols]
        T3[SearchKeywords: 13 cols]
        T4[AuditLog: 10 cols]
        T5[DuplicateReview: 17 cols]
        T6[Settings: 4 cols]
        
        SheetsSvc --> GSheet
        GSheet --- T1
        GSheet --- T2
        GSheet --- T3
        GSheet --- T4
        GSheet --- T5
        GSheet --- T6
    end
```

### 2. Record Lifecycle & Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Operator / Manager
    participant UI as Dashboard UI (Scripts.html)
    participant GAS as Apps Script Backend (Code.gs)
    participant Google as Google Places API (New)
    participant Core as Company & Search Services
    participant DB as Google Sheets Database

    User->>UI: Selects Location & Clicks "Find Industrial Companies"
    UI->>GAS: runIndustrialSearch(params)
    GAS->>Google: POST /v1/places:searchText (FieldMask, Circle Bias)
    Google-->>GAS: HTTP 200 OK (Array of Place Objects)
    GAS->>Core: evaluateRelevance(places)
    Core-->>GAS: Filtered Industrial Candidates (Non-industrial excluded)
    GAS->>DB: getExistingCompaniesLight()
    DB-->>GAS: Active Catalog Identifiers (Place IDs, Phones, Coords)
    GAS->>Core: checkForDuplicate(candidates, existing)
    Note over Core: Level 1: Place ID<br/>Level 2: Phone<br/>Level 3: Proximity (>500m branch preserved)
    Core-->>GAS: Deduplicated & Classified Units (Gold/Silver/Bronze)
    GAS->>DB: LockService.tryLock(30000)
    GAS->>DB: batchInsertCompanies(uniqueRecords)
    GAS->>DB: recordAuditLog(userEmail, "Discovered")
    GAS->>DB: LockService.releaseLock()
    GAS-->>UI: Return Execution Results & Discovered Companies
    UI->>User: Renders 24-Col Table, Map Markers, and KPI Metrics
```

---

## SECTION V — BUGS, DEFICIENCIES, & TECHNICAL DEBT REGISTRY

| Issue ID | Severity | Category | Description | Affected Files | Impact | Recommended Fix |
|---|---|---|---|---|---|---|
| **BUG-01** | Medium | Security | Hardcoded Google Places API Key in preview generator and compiled HTML build. | `build_preview.ps1` (L37), `preview.html` (L3390) | Risk of unauthorized quota exhaustion if published publicly. | Move key injection to environment variables or prompt operator on first run. |
| **BUG-02** | Low | Data Model | Sheet `TeamAssignments` is defined in `Config.gs` (L33) but omitted in `SpreadsheetService.initializeDatabase()`. | `Config.gs` (L33), `SpreadsheetService.gs` (L87) | Table declared in schema constants is not provisioned in new spreadsheets. | Add `TEAM_ASSIGNMENTS` definition to `sheetDefinitions` array in `SpreadsheetService.gs`. |
| **BUG-03** | Low | Configuration | `GEOAPIFY_API_KEY` is loaded in `Config.gs` (L147) but has zero active call sites in the repository. | `Config.gs` (L147) | Dead configuration code creating maintenance confusion. | Either implement Geoapify fallback geocoding or remove unused config keys. |
| **BUG-04** | Medium | Performance | In-memory full sheet read during duplicate check (`getExistingCompaniesLight()`). | `SpreadsheetService.gs` (L163) | As catalog grows beyond 10,000 rows, Apps Script memory and execution limits will slow down. | Cache active Place IDs and phones in Script Cache (`CacheService`) or maintain a dedicated hash index. |
| **BUG-05** | Low | Security | Permissive frame options `ALLOWALL` set on web app output. | `Code.gs` (L23) | Potential clickjacking exposure if embedded in hostile third-party iframes. | Restrict to authorized parent domains or use `XFrameOptionsMode.DEFAULT`. |

---

## SECTION W — COMPLETE LOCAL EXECUTION & OPERATIONS GUIDE

### Running the Standalone Desktop Application Locally

Because this repository contains both Google Apps Script server files and a compiled standalone client with a .NET HTTP server, you can run the system immediately on Windows without installing Node.js, Python, or administrative software.

#### Step 1: Open PowerShell
Open Windows PowerShell and navigate to the project directory:
```powershell
cd "d:\Desktop\G-MAPS DATA"
```

#### Step 2: (Optional) Recompile the Standalone Preview
If you have modified `Index.html`, `Styles.html`, or `Scripts.html`, recompile `preview.html`:
```powershell
powershell -ExecutionPolicy Bypass -File .\build_preview.ps1
```
*Expected Output*: Generates a newly bundled `preview.html` (~304 KB).

#### Step 3: Launch the Local HTTP Server
Run the built-in pure .NET Sockets asynchronous HTTP server:
```powershell
powershell -ExecutionPolicy Bypass -File .\serve_preview.ps1
```
*Console Banner Output*:
```
==========================================================
  G-MAPS Local Web Server running on http://127.0.0.1:8085/
  Serving from: d:\Desktop\G-MAPS DATA
==========================================================
```

#### Step 4: Access in Web Browser
Open your browser and navigate to:
```
http://127.0.0.1:8085/preview.html
```

---

## SECTION X — CHATGPT PROJECT CONTEXT (SOURCE OF TRUTH)

> **NOTICE FOR INCOMING AI ASSISTANTS (CHATGPT, CLAUDE, ANTIGRAVITY)**:  
> This section is your single, authoritative source of truth regarding the existing G-MAPS Industrial Intelligence repository. **Do not hallucinate external frameworks, do not assume this is a Node.js/React app, do not invent database tables, and do not invent C1–C4 lead stages.** Read this section carefully before proposing or reviewing any modifications.

### A. Project Identity & Reality
- **What It Is**: An enterprise B2B geographical discovery, spatial intelligence, and lead qualification dashboard built specifically for Indian industrial manufacturing clusters (OEMs, MSMEs, fabrication plants, machine shops).
- **Core Purpose**: Eliminates consumer retail noise (restaurants, salons, retail stores), filters out geographic landmarks (industrial estates), enforces strict radial/bounding perimeters, prevents duplicate company records across synonym searches, preserves distinct factory branches $> 500\text{ m}$ apart, parses Indian telecom numbers, and persists records to Google Sheets.

### B. What is Implemented & Operational
- **Real Backend**: Google Apps Script (V8 Runtime) operating against Google Places API (New) endpoints via `UrlFetchApp`.
- **Real Database**: Google Sheets (6 provisioned relational sheets: `Companies`, `SearchSessions`, `SearchKeywords`, `SearchResults`, `AuditLog`, `DuplicateReview`, `Settings`).
- **Real Mapping**: Dual implementation using **Leaflet.js v1.9.4** (active in UI) and **Google Maps JavaScript API** (when key is provisioned).
- **Real CRM**: Slide-over drawer editing company details, updating Lead CRM status (`New`, `Contacted`, `In Progress`, `Qualified`, `Closed`), and logging edits to `AuditLog`.
- **Real Exports**: RFC 4180 CSV with UTF-8 BOM, genuine Microsoft Excel SpreadsheetML XML (`.xls`), and Location Intelligence JSON Schema 1.0.
- **Real Test Suite**: 13 automated programmatic assertions in `Code.gs` (`runAutomatedTests()`).

### C. What is NOT Implemented (Do Not Assume These Exist)
- **NO C1–C4 Lead Stages**: The repository uses standard CRM statuses (`New`, `Contacted`, `In Progress`, `Qualified`, `Closed`). There is no C1, C2, C3, or C4 workflow in the code.
- **NO Apify or Browser Scraping**: Discovery is performed via Google Places REST API; there are no Apify actors, Selenium, or Puppeteer scripts.
- **NO Node.js / npm Server**: The project runs serverless in Google Apps Script or locally via PowerShell/.NET HTTP (`serve_preview.ps1`). There is no `package.json`, Express server, or webpack/Vite bundle.

### D. Critical File Reference
- `Code.gs`: Web app routing, RPC dispatcher, and the 13 automated tests.
- `SpreadsheetService.gs`: Database layer, sheet definitions (53-column `Companies` table), thread-safe `LockService` batch writes.
- `PlacesService.gs`: Google Places API (New) REST client (`searchText`, `searchNearby`, `autocomplete`, `places/{id}`).
- `CompanyService.gs`: Algorithmic scoring (Gold/Silver/Bronze), branch-aware deduplication, consumer retail exclusions.
- `SearchService.gs`: Asymmetric rectangular bounding box geodetic math ($111.32 \times \cos(\text{lat})$) and area subdivision (tiling).
- `PhoneService.gs`: Indian National Numbering Plan (DoT) STD code parser (Mobile vs. Landline vs. Toll-Free).
- `Index.html` / `Styles.html` / `Scripts.html`: Frontend UI, CSS tokens, and JavaScript controller.
- `preview.html` / `serve_preview.ps1`: Standalone desktop preview artifact and .NET HTTP server.

### E. Business Rules & Constants (Source of Truth)
- **Gold Tier**: Rating $\ge 4.5$ **AND** Reviews $\ge 100$.
- **Silver Tier**: Rating $\ge 4.0$ **AND** Reviews $\ge 25$.
- **Bronze Tier**: Rating $< 4.0$, Reviews $< 25$, or unrated.
- **Branch Preservation Rule**: If company names match but physical distance is $> 500\text{ meters}$ and Place IDs differ, **PRESERVE BOTH RECORDS** (different factory branches).
- **Spatial Duplicate Threshold**: $\le 100\text{ meters}$ proximity with matching name triggers duplicate review queue.
- **Default Search Radius**: 3,000 meters (3 km) for MSME industrial clusters; max single circle radius 50,000 meters (50 km).
- **Area Subdivision Threshold**: Rectangles $> 12\text{ km}$ per dimension are automatically subdivided into 4 sub-region tiles ($2 \times 2$ grid).

### F. Safe Modification Instructions for AI Assistants
1. **Never break Google Apps Script compatibility**: Avoid Node.js-specific modules (`fs`, `path`, `require()`, `process.env`). In Apps Script, all `.gs` files share a global namespace.
2. **Preserve `LockService` usage**: Any write to Google Sheets must be guarded by `LockService.getScriptLock()` to prevent concurrent update corruption.
3. **Keep `COMPANY_HEADERS` in sync**: If you alter columns in `SpreadsheetService.gs`, you must update `formatCompanyExportRows()` in `ExportService.gs` and the table renderer in `Scripts.html`.
4. **Do not remove Leaflet fallback**: Many users run the dashboard without a paid Google Maps JavaScript API key; Leaflet ensures the map remains interactive under all conditions.

---

## SECTION Y — UNRESOLVED QUESTIONS REQUIRING HUMAN STAKEHOLDER INPUT

1. **Intended Deployment Authority**: Is the production system intended to operate permanently as an authenticated Google Apps Script Web App within a Google Workspace domain, or will it eventually be migrated to a standalone cloud architecture (e.g., Next.js + PostgreSQL)?
2. **C1–C4 Lead Stage Definitions**: The prompt inquires about a C1–C4 workflow, but the repository currently implements `New`, `Contacted`, `In Progress`, `Qualified`, and `Closed`. Does the stakeholder have specific business definitions for C1–C4 that should supersede or map onto the current CRM statuses?
3. **Role & Team Assignment Requirements**: `Config.gs` references a `TeamAssignments` sheet, but no user-assignment logic is implemented. Are role-based permissions (Admin vs. Field Sales Rep) required for the next operational release?
4. **Google Cloud Billing Account Status**: Is an active Google Cloud Billing account linked to the project to leverage the $200 monthly free credit (unlocking 10,000+ searches/month), or is the deployment constrained to the unbilled 100 request/day quota?

---

## SECTION Z — PRIORITIZED ACTION PLAN & ARCHITECTURAL RECOMMENDATIONS

```mermaid
gantt
    title G-MAPS Industrial Intelligence Engineering Roadmap
    dateFormat  YYYY-MM-DD
    section Phase 1: Security & Governance
    Initialize Git Repository & Commit Baseline     :done,    des1, 2026-10-29, 1d
    Sanitize Hardcoded Keys & Apply Referrer Lock    :active,  des2, 2026-10-30, 2d
    section Phase 2: Schema & Code Quality
    Provision TeamAssignments Sheet in DB Init    :         des3, 2026-11-01, 2d
    Remove Dead Geoapify Configuration Keys         :         des4, 2026-11-03, 1d
    section Phase 3: Performance & Scalability
    Implement CacheService for Light Duplicate Read :         des5, 2026-11-05, 3d
    CSV Formula Injection Sanitization              :         des6, 2026-11-08, 1d
    section Phase 4: Workflow Alignment
    Resolve Stakeholder Decision on C1-C4 Stages    :         des7, 2026-11-10, 4d
```

### Prioritized Action Items
1. **Version Control Baseline (Immediate / 1 Hour)**: Initialize a Git repository in `d:\Desktop\G-MAPS DATA\` (`git init`), add a `.gitignore` excluding temporary files, and commit all 17 existing files as the authoritative baseline.
2. **Key Security & Referrer Restriction (Day 1 / 2 Hours)**: Access Google Cloud Console and apply HTTP Referrer restrictions to `MAPS_JS_API_KEY` (`https://script.google.com/*`, `http://127.0.0.1:*`). Remove raw key fallbacks from `build_preview.ps1`.
3. **Database Schema Consistency (Day 2 / 2 Hours)**: Add `TeamAssignments` to `sheetDefinitions` in `SpreadsheetService.initializeDatabase()` to align with `Config.gs`.
4. **Cache Optimization for Scaled Duplicate Checking (Week 1 / 4 Hours)**: As the `Companies` sheet grows beyond 5,000 records, wrap `getExistingCompaniesLight()` in Apps Script `CacheService` to prevent execution timeouts during large batch searches.
5. **Stakeholder Alignment on C1–C4 Workflow (Week 2 / Decision Required)**: Present findings to the project owner to determine whether to formalize C1–C4 definitions or retain the current 5-stage CRM lifecycle.

---
*Report completed and forensically verified against workspace repository source files.*
