# HirePing - Flow Diagrams

All user interactions, API calls, and data flows visualized with Mermaid.

---

## 1. Complete User Journey (High Level)

```mermaid
flowchart TD
    A[User visits HirePing] --> B{Logged in?}
    B -->|No| C[Landing Page]
    C --> D[Click Sign in with Google]
    D --> E[GET /api/auth/google]
    E --> F[Google OAuth Consent]
    F --> G[GET /api/auth/google/callback]
    G --> H[JWT Token Created]
    H --> I[Redirect to /auth/callback?token=xxx]
    I --> J[Frontend stores token in localStorage]

    B -->|Yes| K[Dashboard]
    J --> K

    K --> L{What next?}
    L --> M[Upload Resume]
    L --> N[Buy Plan]
    L --> O[Send Emails]
    L --> P[Manage Sources]
    L --> Q[Edit Profile]
```

---

## 2. Authentication Flow

```mermaid
sequenceDiagram
    participant U as User Browser
    participant FE as Frontend :5173
    participant BE as Backend :4000
    participant G as Google OAuth
    participant DB as MongoDB

    U->>FE: Click "Sign in with Google"
    FE->>BE: GET /api/auth/google
    BE->>G: Redirect to Google consent
    G->>U: Show Google login screen
    U->>G: Enter credentials & approve
    G->>BE: GET /api/auth/google/callback?code=xxx
    BE->>G: Exchange code for profile
    G-->>BE: Return {googleId, email, name, avatar}
    BE->>DB: findOne({googleId}) or create new User
    DB-->>BE: User document
    BE->>BE: Sign JWT with {userId}
    BE->>FE: Redirect to /auth/callback?token=JWT
    FE->>FE: Store token in localStorage
    FE->>BE: GET /api/auth/me (Bearer token)
    BE->>DB: Find user by JWT userId
    DB-->>BE: User document
    BE-->>FE: {user: {...}}
    FE->>FE: Set user in AuthContext → redirect to /dashboard
```

**Bruno test:** `auth/get-me.bru` — paste your JWT token in environment

---

## 3. Resume Upload & Profile Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant BE as Backend
    participant PDF as pdf-parse
    participant AI as Gemini AI
    participant DB as MongoDB

    U->>FE: Drag & drop resume.pdf on Profile page
    FE->>BE: POST /api/resume/upload (multipart form, Bearer token)
    BE->>BE: Multer saves file to uploads/
    BE->>PDF: parseResumeFile(filePath)
    PDF-->>BE: Raw text from PDF
    BE->>BE: console.log("[Resume] Extracted text length:", text.length)
    BE->>AI: parseResume(text)

    alt Real Gemini API key
        AI-->>BE: {name, phone, location, summary, skills[], education[], experience[]}
    else Dummy API key
        AI-->>BE: Mock profile JSON
    end

    BE->>BE: console.log("[Resume] Gemini parsed:", JSON.stringify(result))
    BE->>DB: Update user.profile = parsed fields
    BE->>DB: Update user.resume = {filename, uploadedAt, parsedData}
    DB-->>BE: Updated user
    BE->>BE: Delete temp file from uploads/
    BE-->>FE: {message, profile: {...}}
    FE->>FE: Auto-populate all form fields with parsed data
    U->>FE: Edit any field (skills, education, etc.)
    U->>FE: Click "Save Changes"
    FE->>BE: PUT /api/profile (JSON body, Bearer token)
    BE->>DB: Update user.profile with new values
    DB-->>BE: Updated user
    BE-->>FE: {message, profile: {...}}
    FE->>FE: Show success toast
```

**Bruno test:**
- `resume/upload-resume.bru` — upload a PDF
- `profile/get-profile.bru` — see parsed data
- `profile/update-profile.bru` — edit fields

---

## 4. Plan Purchase Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant BE as Backend
    participant DB as MongoDB

    U->>FE: Go to Plans page
    FE->>BE: GET /api/plans (Bearer token)
    BE-->>FE: {plans: [{type:"weekly", price:200, days:7}, {type:"monthly", price:600, days:30}]}
    FE->>FE: Show plan cards

    FE->>BE: GET /api/plans/status (Bearer token)
    BE->>DB: Read user.plan
    BE->>BE: console.log("[Plans] User plan:", user.plan)
    BE-->>FE: {active: false, planType: "none", ...}
    FE->>FE: Show "No active plan"

    U->>FE: Click "Buy Weekly Plan"
    FE->>BE: POST /api/plans/purchase {planType: "weekly"} (Bearer token)
    BE->>BE: console.log("[Plans] Purchasing:", planType)
    BE->>DB: Update user.plan = {type:"weekly", purchasedAt:now, expiresAt:now+7d, dailyLimit:30}
    DB-->>BE: Updated user
    BE->>BE: console.log("[Plans] Activated until:", expiresAt)
    BE-->>FE: {message: "Plan activated", plan: {...}}
    FE->>FE: Show success toast, update UI with active badge
```

**Bruno test:**
- `plans/get-plans.bru` — see available plans
- `plans/purchase-plan.bru` — buy weekly plan
- `plans/get-status.bru` — verify it's active

---

## 5. Source Sync Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant BE as Backend
    participant FS as File System
    participant DB as MongoDB

    Note over FS: sources/ folder contains:<br/>INDIA.txt (40 contacts)<br/>US.txt (30 contacts)<br/>UK.txt (20 contacts)

    U->>FE: Go to Sources page
    FE->>BE: GET /api/sources/stats (Bearer token)
    BE->>DB: Aggregate sources by country & type
    BE-->>FE: {totalContacts, byCountry, byType}

    U->>FE: Click "Sync Sources"
    FE->>BE: POST /api/sources/sync (Bearer token)
    BE->>FS: Read all files in sources/ folder

    loop For each file (INDIA.txt, US.txt, UK.txt...)
        BE->>BE: Extract country from filename (strip numbers + ext)
        BE->>BE: console.log("[Sources] Parsing file:", filename, "country:", country)

        alt .txt or .csv file
            BE->>FS: Read as UTF-8 text
        else .pdf file
            BE->>FS: Read as buffer → pdf-parse
        else .xlsx or .xls file
            BE->>FS: Read as buffer → xlsx parse
        end

        BE->>BE: Split lines, parse CSV rows
        BE->>BE: console.log("[Sources] Found", count, "contacts in", filename)
    end

    loop For each parsed contact
        BE->>DB: findOneAndUpdate({email}, {$set: source}, {upsert: true})
        BE->>BE: Track created/updated/skipped counts
    end

    BE->>BE: console.log("[Sources] Sync result:", {created, updated, skipped})
    BE-->>FE: {totalParsed: 90, created: 85, updated: 5, skipped: 0}
    FE->>FE: Show success toast with counts
    FE->>BE: GET /api/sources/stats (refresh)
    BE-->>FE: Updated stats
```

**Source file format examples:**
```
# Full CSV (best)
name,email,role,company,companyType
Priya Sharma,priya@infosys.com,HR Manager,Infosys,mnc

# Minimal (just emails, one per line)
hr@startup.com
recruiter@techcorp.com

# Partial (name + email only)
Priya Sharma,priya@infosys.com
```

**Bruno test:**
- `sources/sync-sources.bru` — sync all files
- `sources/get-countries.bru` — see countries
- `sources/get-stats.bru` — see counts

---

## 6. Email Sending Flow (Core Business Logic)

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant BE as Backend
    participant AI as Gemini AI
    participant ES as Email Service
    participant DB as MongoDB

    U->>FE: Go to Emails page
    FE->>BE: GET /api/sources/countries (Bearer token)
    BE-->>FE: {countries: [{_id:"INDIA", count:40}, {_id:"US", count:30}...]}
    FE->>FE: Show country checkboxes

    U->>FE: Select INDIA, US → Click "Save Preferences"
    FE->>BE: PUT /api/emails/countries {countries:["INDIA","US"]} (Bearer token)
    BE->>DB: Update user.selectedCountries = ["INDIA","US"]
    BE->>BE: console.log("[Emails] Countries updated:", countries)
    BE-->>FE: {message, selectedCountries}

    U->>FE: Click "Send Emails Now"
    FE->>BE: POST /api/emails/send (Bearer token)

    BE->>BE: console.log("[Emails] Send triggered by:", user.email)

    alt No active plan
        BE-->>FE: 403 {error: "No active plan"}
    else Plan expired
        BE->>DB: Set plan.type = "none"
        BE-->>FE: 403 {error: "Plan expired"}
    else Daily limit reached (30)
        BE-->>FE: 429 {error: "Daily limit reached"}
    else No countries selected
        BE-->>FE: 400 {error: "No target countries selected"}
    end

    BE->>DB: Find sources WHERE country IN ["INDIA","US"] AND dailyEmailCount < 5
    BE->>BE: console.log("[Emails] Available sources:", sources.length)
    BE->>BE: Shuffle sources (Fisher-Yates)
    BE->>BE: Pick min(remainingDailyLimit, sources.length)
    BE->>BE: console.log("[Emails] Will send to:", picked.length, "sources")

    loop For each picked source
        BE->>DB: Get user.lastEmails (last 5)
        BE->>AI: generateEmail(userProfile, sourceInfo, lastFiveEmails)
        AI-->>BE: {subject: "...", body: "..."}
        BE->>BE: console.log("[Emails] Generated for:", source.email, "subject:", subject)

        BE->>ES: sendEmail(userEmail, sourceEmail, subject, body)
        Note over ES: MVP: Logs to console<br/>Production: Gmail API
        ES-->>BE: {success: true, messageId: "uuid"}

        BE->>DB: Source.dailyEmailCount += 1
    end

    BE->>DB: user.emailsSentToday += sentCount
    BE->>DB: user.lastEmails = [...old, ...new].slice(-5)
    BE->>BE: console.log("[Emails] Sent", sentCount, "emails. Remaining:", remaining)
    BE-->>FE: {message, sentCount, emails[], remainingToday}
    FE->>FE: Show green success banner with count
```

**Bruno test flow (in order):**
1. `plans/purchase-plan.bru` — activate a plan first
2. `emails/update-countries.bru` — select target countries
3. `emails/send-emails.bru` — trigger send
4. `emails/get-history.bru` — see sent emails
5. `emails/get-stats.bru` — see counts

---

## 7. Anti-Bombarding Algorithm

```mermaid
flowchart TD
    A[User triggers Send] --> B{Active plan?}
    B -->|No| X1[403: No active plan]
    B -->|Yes| C{emailsSentToday < 30?}
    C -->|No| X2[429: Daily limit reached]
    C -->|Yes| D{Countries selected?}
    D -->|No| X3[400: No countries]
    D -->|Yes| E[Query sources WHERE<br/>country IN selectedCountries<br/>AND isActive = true<br/>AND dailyEmailCount < 5]

    E --> F{Sources found?}
    F -->|No| X4[404: No available sources]
    F -->|Yes| G[Shuffle sources randomly]
    G --> H[Pick min remaining, available]

    H --> I[For each source:]
    I --> J[Generate unique email via Gemini<br/>Input: profile + source + last 5 emails<br/>Prompt: must NOT be similar to last 5]
    J --> K[Send email via service]
    K --> L[source.dailyEmailCount += 1]
    L --> M[Add to user.lastEmails FIFO 5]
    M --> N{More sources?}
    N -->|Yes| I
    N -->|No| O[user.emailsSentToday += sentCount]
    O --> P[Return results to frontend]

    style X1 fill:#fee,stroke:#f00
    style X2 fill:#fee,stroke:#f00
    style X3 fill:#fee,stroke:#f00
    style X4 fill:#fee,stroke:#f00
    style P fill:#efe,stroke:#0a0
```

**Key protection rules:**
- Each **user** can send max **30 emails/day**
- Each **source** (HR/Manager) receives max **5 emails/day** across ALL users
- Daily counters reset at midnight (manual reset or future cron)
- Last 5 emails tracked per user for **uniqueness** — Gemini avoids repetition

---

## 8. Frontend Page Navigation

```mermaid
flowchart LR
    Landing["/ Landing Page<br/>(public)"] -->|Google OAuth| Callback["/auth/callback<br/>Extract token"]
    Callback --> Dashboard

    subgraph Protected ["Protected Pages (requires JWT)"]
        Dashboard["/dashboard<br/>Stats + Quick Actions"]
        Profile["/profile<br/>Resume Upload + Edit"]
        Plans["/plans<br/>Buy Weekly/Monthly"]
        Emails["/emails<br/>Select Country + Send"]
        Sources["/sources<br/>Sync + View Stats"]
    end

    Dashboard --> Profile
    Dashboard --> Plans
    Dashboard --> Emails
    Dashboard --> Sources
    Profile --> Dashboard
    Plans --> Dashboard
    Emails --> Plans
```

---

## 9. Data Model Relationships

```mermaid
erDiagram
    USER {
        ObjectId _id
        string googleId UK
        string email UK
        string name
        string avatar
        object profile
        object resume
        object plan
        int emailsSentToday
        array lastEmails
        array selectedCountries
    }

    SOURCE {
        ObjectId _id
        string email UK
        string name
        string role
        string company
        string companyType
        string country
        int dailyEmailCount
        boolean isActive
    }

    USER ||--o{ SOURCE : "sends emails to"
    USER }|--|| USER : "profile contains plan + emails"
```

**user.profile fields:**
```
phone, location, summary, skills[],
education[{degree, institution, year}],
experience[{title, company, duration, highlights[]}]
```

**user.lastEmails[] (FIFO, max 5):**
```
{to, subject, body, sentAt}
```

---

## 10. API Endpoint Map

```mermaid
flowchart TB
    subgraph Auth ["AUTH /api/auth"]
        A1["GET /google<br/>→ Redirect to Google"]
        A2["GET /google/callback<br/>→ JWT + redirect to frontend"]
        A3["GET /me<br/>→ Current user data"]
        A4["POST /logout<br/>→ Clear session"]
    end

    subgraph Profile ["PROFILE /api/profile"]
        P1["GET /<br/>→ User profile"]
        P2["PUT /<br/>→ Update profile fields"]
    end

    subgraph Resume ["RESUME /api/resume"]
        R1["POST /upload<br/>→ PDF parse → Gemini → store"]
    end

    subgraph Plans ["PLANS /api/plans"]
        PL1["GET /<br/>→ Available plans + prices"]
        PL2["POST /purchase<br/>→ Activate plan (MVP instant)"]
        PL3["GET /status<br/>→ Current plan status"]
    end

    subgraph Sources ["SOURCES /api/sources"]
        S1["POST /sync<br/>→ Parse files → upsert DB"]
        S2["GET /countries<br/>→ Countries + counts"]
        S3["GET /stats<br/>→ Total, by country, by type"]
    end

    subgraph Emails ["EMAILS /api/emails"]
        E1["POST /send<br/>→ Generate + send emails"]
        E2["GET /history<br/>→ Last sent emails"]
        E3["GET /stats<br/>→ Sent today, remaining"]
        E4["PUT /countries<br/>→ Update target countries"]
    end

    subgraph Health ["HEALTH"]
        H1["GET /api/health<br/>→ Server status"]
    end
```

---

## 11. Complete Test Checklist (Bruno Order)

```mermaid
flowchart TD
    T1["1. GET /api/health<br/>✅ Verify server running"] --> T2
    T2["2. Complete Google OAuth<br/>✅ Get JWT token"] --> T3
    T3["3. GET /api/auth/me<br/>✅ Verify user created in DB"] --> T4
    T4["4. POST /api/resume/upload<br/>✅ Upload PDF, check console for parsed data"] --> T5
    T5["5. GET /api/profile<br/>✅ Verify profile auto-populated"] --> T6
    T6["6. PUT /api/profile<br/>✅ Edit a skill, verify update"] --> T7
    T7["7. POST /api/sources/sync<br/>✅ Check console: created/updated counts"] --> T8
    T8["8. GET /api/sources/stats<br/>✅ Verify INDIA:40, US:30, UK:20"] --> T9
    T9["9. GET /api/plans<br/>✅ See weekly + monthly plans"] --> T10
    T10["10. POST /api/plans/purchase<br/>✅ Buy weekly plan"] --> T11
    T11["11. GET /api/plans/status<br/>✅ Verify active + expiresAt"] --> T12
    T12["12. PUT /api/emails/countries<br/>✅ Set INDIA, US"] --> T13
    T13["13. POST /api/emails/send<br/>✅ Check console for generated emails"] --> T14
    T14["14. GET /api/emails/history<br/>✅ See sent emails"] --> T15
    T15["15. GET /api/emails/stats<br/>✅ Verify sentToday count"]

    style T1 fill:#e8f5e9
    style T15 fill:#e8f5e9
```
