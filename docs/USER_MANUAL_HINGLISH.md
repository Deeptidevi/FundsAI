# G-MAPS Industrial Intelligence - Complete User Manual (Hinglish)
**Aapka Complete Guide: Run Karna, Excel Upload Karna, Test Lab Use Karna aur Features Samajhna**

---

## 1. Ye Project Kya Hai Aur Kaise Kaam Karta Hai?

Pehle aapka G-MAPS project Google Sheets aur Google Apps Script pe bana tha, jisme 6-minute ka limit tha, koi background automation nahi tha, aur WhatsApp ke liye sirf link open hota tha.

Humne isko ek **Full-Stack Web Application** mein badal diya hai:
1. **Frontend (UI Screen):** React 19 + TypeScript + Vite. Ye aapko clean enterprise dashboard, leads table, map, inbox, aur Test Lab dikhata hai.
2. **Backend (Server Engine):** Hono (Node.js) server. Ye saare API calls handle karta hai, Excel files ko process karta hai, aur background jobs chalata hai.
3. **Database (Local Storage):** SQLite database (`server/data/gmaps_platform.db`). Saare real leads, contacts, campaigns, aur message history isme save hote hain. **Koi bhi fake ya dummy data nahi hai.**
4. **Durable Background Queue:** Server ke andar background worker har 5 second mein check karta hai ki koi email ya WhatsApp message bhejna hai ya nahi. Agar laptop band ho jaye ya internet chala jaye, toh worker recover kar leta hai aur duplicate message nahi bhejta.
5. **AI Engine:** Google Gemini AI adapter (`@google/genai`). Ye customer ke incoming messages ko samajhta hai (Interested, Meeting Request, Pricing Request, Stop/Opt-Out) aur aapke verified Company Knowledge ke hisaab se draft tayyar karta hai.
6. **Dedicated Test Lab:** Ek aisi jagah jahan aap sirf apne verified email ya phone number par test messages bhej kar check kar sakte hain, **bina kisi real customer ko contact kiye.**

---

## 2. Application Ko Kaise Start Karein? (Step-by-Step)

Aapko application chalane ke liye **2 Terminals (Command Prompt ya PowerShell)** chahiye:

### Terminal 1: Backend Server Start Karna
1. Pehla terminal open karein aur project folder mein jayein:
   ```powershell
   cd "d:\Desktop\G-MAPS DATA"
   ```
2. Backend start karein:
   ```powershell
   npm --prefix server start
   ```
3. **Successful output aisa dikhega:**
   ```text
   Database schema migrations applied successfully.
   Durable background job processor worker started.
   G-MAPS Industrial Intelligence server listening on http://localhost:3001
   ```
   *(Note: Backend port 3001 par chalta hai aur saari database queries aur APIs handle karta hai).*

---

### Terminal 2: Frontend Dashboard Start Karna
1. Dusra terminal open karein aur project folder mein jayein:
   ```powershell
   cd "d:\Desktop\G-MAPS DATA"
   ```
2. Frontend dev server start karein:
   ```powershell
   npm --prefix client run dev
   ```
3. **Successful output aisa dikhega:**
   ```text
   VITE v6.0.3  ready in 450 ms

   ➜  Local:   http://localhost:5173/
   ➜  Network: use --host to expose
   ```
4. Apna browser (Chrome/Edge) open karein aur visit karein:
   👉 **`http://localhost:5173`**

---

### Common Startup Errors Aur Solution:
- **Error: `EADDRINUSE: port 3001`:**
  - Iska matlab port 3001 par server pehle se chal raha hai.
  - Solution: Purane terminal mein `Ctrl + C` dabakar process band karein, fir dobara `npm --prefix server start` karein.
- **Error: Browser mein `404 Not Found` dikh raha hai `localhost:3001` par:**
  - Reason: `localhost:3001` backend API server hai. User Interface dekhne ke liye **`http://localhost:5173`** open karein.

---

## 3. Har Ek Screen Ka Matlab Aur Use Kaise Karein

Left side mein collapsible sidebar navigation hai:

### 1. Overview (Dashboard)
- **Kahan milega:** Sidebar -> `Overview`
- **Kya dikhata hai:** Real database metrics (Total leads, Valid leads, Duplicates filtered, Dispatched emails/WhatsApp, Inbound replies, Pending approvals).
- **Important:** Yahan koi fake random numbers nahi aate. Jab tak aap leads import nahi karenge, yahan `0` ya clean empty state dikhayega.

### 2. Industrial Search
- **Kahan milega:** Sidebar -> `Industrial Search`
- **Purpose:** Google Places API se industrial factories search karna.
- **Kaise use karein:**
  1. Industrial query enter karein (e.g., `CNC Machining`, `Fabrication`, `Earthing`).
  2. Center Latitude / Longitude aur Search Radius (5, 10, 15, 25 km) select karein.
  3. Direction Bias chunein (North, South, East, West, ya All).
  4. "Discover Facilities" button click karein.
- **Prerequisite:** Is feature ke liye server ke `.env` file mein `GOOGLE_PLACES_API_KEY` hona zaroori hai. Bina key ke Google error dega.

### 3. Leads Directory
- **Kahan milega:** Sidebar -> `Leads Directory`
- **Purpose:** Database mein saved saare real leads dekhna.
- **Features:**
  - Tier filter (Gold, Silver, Bronze).
  - CRM Status filter (`new`, `contacted`, `engaged`, `qualified`, `won`, `lost`).
  - Search bar (Company name, city, industry).
  - Har lead ke row par click karke **Lead Detail Drawer** khulta hai jahan aap sales notes aur status update karke "Save Updates" dabate hain.

### 4. Import Excel / CSV
- **Kahan milega:** Sidebar -> `Import Excel / CSV`
- **Purpose:** Real company spreadsheets ko batch mein upload karna (200+ leads daily target).
- **Details Section 4 mein niche di gayi hain.**

### 5. Campaigns
- **Kahan milega:** Sidebar -> `Campaigns`
- **Purpose:** Email aur WhatsApp outreach sequences tayyar karna.
- **Strict Human Approval Gate:**
  - Campaign create karne par wo seedha `draft` state mein rehti hai.
  - "Review & Approve" button dabane par pop-up khulta hai jo dikhata hai kitne valid leads hain aur unko kaisa message dikhega.
  - Jab aap **"Sign-Off & Start Outreach Queue"** dabate hain, tabhi background worker messages send karna shuru karta hai. **Excel upload karne se kabhi bhi automated send nahi hota.**

### 6. Unified Inbox
- **Kahan milega:** Sidebar -> `Unified Inbox`
- **Purpose:** WhatsApp aur Email dono ke replies ek jagah dekhna aur baat karna.
- **Features:**
  - Left side mein active conversation threads.
  - Center mein chat bubbles (sent status: single check = sent, double check = delivered/read).
  - **"AI Suggest" Button:** Gemini AI aapke verified knowledge base ke hisaab se polite draft response generate karta hai.
  - Aap text edit karke "Send" button daba sakte hain.

### 7. Company Knowledge
- **Kahan milega:** Sidebar -> `Company Knowledge`
- **Purpose:** Apni company ke verified facts, products, services, aur approved pricing policies store karna.
- **Kyu zaroori hai:** Gemini AI bina verified knowledge ke koi claim ya pricing commit nahi kar sakta. Jo yahan add karenge, AI sirf wahi bol sakta hai.

### 8. Dedicated Test Lab (Mandatory Feature)
- **Kahan milega:** Sidebar -> `Test Lab` (Amber color highlight)
- **Purpose:** Real customers ko contact kiye bina system test karna.
- **Details Section 5 mein niche di gayi hain.**

### 9. Integrations
- **Kahan milega:** Sidebar -> `Integrations`
- **Purpose:** Real-time health check dekhna ki Meta WhatsApp, Email SMTP, Google Places, aur Gemini AI connected hain ya unconfigured.

### 10. Settings & Security
- **Kahan milega:** Sidebar -> `Settings & Security`
- **Purpose:** Security guardrails, CSV formula injection defense, aur environment variables reference dekhna.

---

## 4. Excel & CSV Upload - Complete Step-by-Step Guide

### 1. Supported File Formats:
- `.xlsx` (Microsoft Excel)
- `.xls` (Legacy Excel)
- `.csv` (Comma Separated Values)

### 2. Aapki Sheet Mein Kaunse Columns Hone Chahiye?
Aapki spreadsheet mein headers hone chahiye. Hamara system **Dynamic Column Mapping** use karta hai, isliye column ka naam exact hona zaroori nahi hai.

| Field Name | Mandatory / Optional | Accepted Format & Example |
|:---|:---|:---|
| **Company Name** | **MANDATORY** | Text (e.g. `Apex Precision Tooling Pvt Ltd`). Empty row reject ho jayegi. |
| **Contact Person** | Optional | Text (e.g. `Rajesh Sharma`) |
| **Email Address** | Optional | Valid email syntax (e.g. `rajesh@apexcnc.com`). Invalid format error report mein aayega. |
| **Phone Number** | Optional | Indian number with or without `+91`, spaces, dashes (e.g. `9876543210`, `+91 98765 43210`, `080-28391111`). Normalizer auto-clean karega. |
| **Industry / Type** | Optional | Text (e.g. `CNC Machining`, `Foundry`, `Automation`) |
| **City** | Optional | Text (e.g. `Pune`, `Bengaluru`, `Delhi`) |
| **State** | Optional | Text (e.g. `Maharashtra`, `Karnataka`) |
| **Website** | Optional | URL (e.g. `https://apexcnc.com`) |
| **Consent (Email/WA)**| Optional | `yes`, `true`, `1` ya `no` |

### 3. Step-by-Step Upload Process:
1. `Import Excel / CSV` screen par jayein.
2. Dotted box par click karke apni `.xlsx` ya `.csv` file select karein.
3. System file read karega aur **Column Field Mapping** dropdowns dikhayega:
   - "Company Name" ke samne apni sheet ka company column select karein.
   - "Email", "Phone", "City", etc. map karein.
4. Niche first 3 rows ka preview verify karein.
5. **"Execute Validated Import"** button par click karein.
6. Execution ke baad ek **Green Report Box** dikhega:
   - **Total Rows:** Kitni rows sheet mein thi.
   - **Valid Leads Saved:** Kitne leads database mein save huye.
   - **Duplicates Filtered:** Kitne leads pehle se database mein the aur duplicate hone ki wajah se skip huye.
   - **Invalid Records:** Kitni rows mein company name missing tha ya email galat tha.
   - Agar koi row reject hui, toh niche table mein exact Row number, Field aur Error reason dikhayega.

### 4. Duplicate Kaise Identify Hote Hain? (Branch Preservation Rule):
- Agar Google Place ID match hota hai -> Duplicate.
- Agar Phone Number match hota hai -> Duplicate.
- **Lekin Branch Preservation:** Agar company ka naam same hai lekin dono addresses ke beech ki doori **500 meters se zyada hai**, toh system unhe duplicate nahi maanta, balki alag branch (Unit 1 vs Unit 2) maan kar save karta hai.

---

## 5. Test Lab - Real Testing Kaise Karein

Test Lab ko is tarah banaya gaya hai ki **aap real infrastructure test kar sakein bina kisi customer ko message bheje.**

### 1. Email Test Mode:
- **Kahan hai:** Test Lab -> `Email Test Mode` tab.
- **Kya karta hai:** Aapke configured SMTP server ke zariye ek real test email bhejta hai.
- **Subject Safety:** Subject mein automatically `[G-MAPS TEST]` prefix lagta hai taaki pata chale ye test email hai.
- **Allowlist Security:** Ye sirf aapke configured email (`TEST_ALLOWLIST_EMAIL`) par bhej sakta hai. Real customer leads ko touch nahi karta.

### 2. WhatsApp Test Mode:
- **Kahan hai:** Test Lab -> `Meta WhatsApp Test Mode` tab.
- **Kya karta hai:** Meta Cloud API v21.0 par call karke aapke authorized phone number par test WhatsApp message bhejta hai.

### 3. AI Conversation Sandbox:
- **Kahan hai:** Test Lab -> `AI Conversation Sandbox` tab.
- **Kya karta hai:** Yahan aap koi bhi fake customer message type kar sakte hain (e.g. *"Mujhe pricing chahiye CNC dies ki"*).
- **Output:** Dikhata hai ki Gemini AI ne kya intent classify kiya (e.g. `pricing_request`), confidence kitna hai, aur company knowledge ke hisaab se kya draft reply banaya.

### 4. Test Execution History:
- **Kahan hai:** Test Lab -> `Test Execution History` tab.
- **Kya dikhata hai:** Saare purane test runs ki list, status (`passed` / `failed`), error details aur timestamp.

---

## 6. Integrations Ko Setup Kaise Karein (`.env` File)

Project ke root mein ek `.env.example` file hai. Aapko ek nayi file banani hoti hai jiska naam `.env` hota hai.

```env
# 1. SERVER RUNTIME
PORT=3001
GLOBAL_OUTREACH_KILL_SWITCH=false
EMAIL_OUTREACH_ENABLED=true
WHATSAPP_OUTREACH_ENABLED=true

# 2. TEST LAB ALLOWLIST (Apna email aur phone yahan likhein)
TEST_ALLOWLIST_EMAIL=your-email@gmail.com
TEST_ALLOWLIST_PHONE=+919876543210

# 3. GOOGLE GEMINI AI
GEMINI_API_KEY=AIzaSy...

# 4. EMAIL SMTP (e.g. Google Workspace App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
SMTP_FROM="G-MAPS Industrial" <your-email@gmail.com>

# 5. META WHATSAPP BUSINESS CLOUD API
META_WA_ACCESS_TOKEN=EAAG...
META_WA_PHONE_NUMBER_ID=1092837465...
META_WA_WEBHOOK_VERIFY_TOKEN=gmaps_secret_token_123

# 6. GOOGLE PLACES API (NEW)
GOOGLE_PLACES_API_KEY=AIzaSy...
```

---

## 7. System Ko Safely Stop Aur Restart Kaise Karein

1. **Stop Karna:**
   - Dono terminals mein jakar keyboard par **`Ctrl + C`** dabayein aur `Y` enter karein.
   - Database SQLite file hoti hai, isliye koi data corrupt nahi hoga.
2. **Restart Karna:**
   - Terminal 1: `npm --prefix server start`
   - Terminal 2: `npm --prefix client run dev`
   - Browser: `http://localhost:5173` refresh karein.
