# HirePing - Testing & Integration Guide

Complete step-by-step guide to test every feature. Follow in order.

---

## What Works Right Now (No Setup Needed)

| Feature | Status | Details |
|---------|--------|---------|
| Google OAuth Login | Needs real keys | Get from Google Cloud Console |
| Resume Upload + PDF Parse | Works | pdf-parse extracts text locally |
| Resume → Gemini AI Parse | Needs real key OR uses mock data | Mock returns fake profile |
| Profile Edit | Works | CRUD on user.profile |
| Plan Purchase (UPI) | Works | User enters UTR, plan activates |
| Source Sync from folder | Works | Reads files from sources/ folder |
| Source Upload via API | Works | Multipart upload via Bruno |
| Email Generation (Gemini) | Needs real key OR uses mock data | Mock returns template email |
| Email Sending (Gmail) | **MVP: Logs to console only** | See Gmail setup below |
| Admin Superuser | Works | Auto-detects from ADMIN_EMAILS env |

---

## Phase 1: Setup & Start (5 minutes)

### 1.1 Start MongoDB
```bash
cd C:/Startup/HirePing
docker compose up mongodb -d
```
**Expected:** MongoDB running on localhost:27017
**Verify:** `docker ps` shows `hireping-mongo` running

### 1.2 Install & Start Backend
```bash
cd backend
npm install
npm run dev
```
**Expected console output:**
```
[Passport] Google OAuth not configured - using dummy credentials...
Connected to MongoDB: hireping
HirePing server running on port 4000
```

### 1.3 Install & Start Frontend
```bash
cd frontend
npm install
npm run dev
```
**Expected:** Vite dev server on http://localhost:5173

### 1.4 Test Health Check
**Bruno:** `health.bru` OR browser: http://localhost:4000/api/health
**Expected:**
```json
{ "status": "ok", "timestamp": "...", "environment": "development" }
```

---

## Phase 2: Google OAuth Setup (Required for everything)

You need this before any user can log in.

### 2.1 Create Google OAuth Credentials

1. Go to https://console.cloud.google.com
2. Create new project → name it "HirePing"
3. Go to **APIs & Services → OAuth consent screen**
   - User type: **External**
   - App name: HirePing
   - Support email: contactshubham1511@gmail.com
   - Scopes: email, profile, openid
   - Test users: add contactshubham1511@gmail.com
   - Save
4. Go to **APIs & Services → Credentials**
   - Click **Create Credentials → OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Name: HirePing Web
   - Authorized JavaScript origins: `http://localhost:5173`
   - Authorized redirect URIs: `http://localhost:4000/api/auth/google/callback`
   - Click Create
5. Copy **Client ID** and **Client Secret**

### 2.2 Update .env
```bash
# backend/.env
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
```

### 2.3 Restart backend
```bash
# Ctrl+C the running backend, then:
npm run dev
```
**Expected console:** No more "OAuth not configured" warning

### 2.4 Test Login
1. Open http://localhost:5173
2. Click "Get Started Free" or "Sign in with Google"
3. Google consent screen appears → select contactshubham1511@gmail.com
4. Redirected to http://localhost:5173/auth/callback?token=eyJhbG...
5. Auto-redirected to /dashboard

**Expected backend console:**
```
[Passport] New user created: contactshubham1511@gmail.com (ADMIN)
[Auth] OAuth callback - user: contactshubham1511@gmail.com id: 683a...
[Auth] JWT created, redirecting to frontend
```

**Expected dashboard:** Shows "Welcome back, Shubham" with SUPERADMIN badge

### 2.5 Get JWT Token (for Bruno testing)
After login, open browser DevTools → Application → Local Storage → `token`
Copy that value. In Bruno → Environments → local → set `token` to this value.

---

## Phase 3: Source Sync (Test with Bruno)

### 3.1 Sync from server folder
**Bruno:** `sources/sync-sources.bru`
```
POST http://localhost:4000/api/sources/sync
Authorization: Bearer {{token}}
```
**Expected response:**
```json
{
  "message": "Sources synced successfully.",
  "totalParsed": 90,
  "created": 90,
  "updated": 0,
  "skipped": 0
}
```
**Expected backend console:**
```
[Sources] Sync triggered by: contactshubham1511@gmail.com
[SourceParser] Scanning directory: .../sources
[SourceParser] Found files: INDIA.txt, UK.txt, US.txt
[SourceParser] Parsing file: INDIA.txt | country from name: INDIA
[SourceParser] Extracted 40 rows from INDIA.txt
... (UK: 20, US: 30)
[SourceParser] Total valid sources parsed: 90
[Sources] Sync complete: { totalParsed: 90, created: 90, updated: 0, skipped: 0 }
```

### 3.2 Verify in MongoDB
```bash
docker exec -it hireping-mongo mongosh -u hireping_admin -p hireping_secret_2026 --authenticationDatabase admin hireping
```
Then:
```javascript
db.sources.countDocuments()          // → 90
db.sources.distinct("country")       // → ["INDIA", "UK", "US"]
db.sources.countDocuments({country: "INDIA"})  // → 40
```

### 3.3 Check stats via API
**Bruno:** `sources/get-stats.bru`
**Expected:**
```json
{
  "totalContacts": 90,
  "byCountry": [
    { "_id": "INDIA", "count": 40 },
    { "_id": "US", "count": 30 },
    { "_id": "UK", "count": 20 }
  ],
  "byType": [...]
}
```

### 3.4 Upload files via API (alternative)
**Bruno:** `sources/upload-sources.bru`
Attach files in the multipart form and POST. Same result.

---

## Phase 4: Resume Upload & Profile

### 4.1 Upload via Frontend
1. Go to http://localhost:5173/profile
2. Drag a PDF resume into the upload area
3. Wait for parsing

**Expected backend console:**
```
[Resume] File uploaded: resume.pdf | size: 84521 bytes
[Resume] Extracted text length: 2340 chars
[Resume] Sending to Gemini for parsing...
[Gemini] Using mock data - API key is not configured    ← if no Gemini key
[Resume] Gemini parsed: {"name":"John Doe","skills":6,"education":1,"experience":1}
```

**Expected UI:** Profile form auto-populates with parsed data (mock data if no Gemini key)

### 4.2 With Real Gemini Key (optional but recommended)
1. Go to https://aistudio.google.com/apikey
2. Create an API key
3. Add to `.env`: `GEMINI_API_KEY=AIzaSy...`
4. Restart backend

Now resume upload will return YOUR actual parsed resume data instead of mock.

### 4.3 Edit Profile
1. Change skills, add education, edit summary on the Profile page
2. Click "Save Changes"

**Bruno alternative:** `profile/update-profile.bru`
**Expected:** 200 OK, profile updated

### 4.4 Verify in MongoDB
```javascript
db.users.findOne({email: "contactshubham1511@gmail.com"}, {profile: 1, resume: 1})
```

---

## Phase 5: Email Sending (MVP — Console Only)

Right now emails are **logged to the backend console**, not actually sent.
This is perfect for testing the full flow without spamming anyone.

### 5.1 Select Target Countries
**Bruno:** `emails/update-countries.bru`
```json
{ "countries": ["INDIA", "US"] }
```
**Expected:** `{ "message": "Target countries updated successfully." }`

Or do it from the frontend Emails page → check India & US → Save Preferences

### 5.2 Preview Sources (Admin)
**Bruno:** `emails/preview-sources.bru`
```
GET http://localhost:4000/api/emails/preview?count=5
```
**Expected:** List of 5 random sources from INDIA + US with name, email, role, company

### 5.3 Send Emails
**Bruno:** `emails/send-emails.bru`
```json
{ "count": 3 }
```
**Expected response:**
```json
{
  "message": "Successfully sent 3 email(s).",
  "sentCount": 3,
  "emails": [
    {
      "to": "priya.sharma@infosys.com",
      "toName": "Priya Sharma",
      "company": "Infosys",
      "subject": "Interest in Opportunities at Infosys",
      "body": "Dear Priya Sharma, ...",
      "sentAt": "2026-03-31T..."
    },
    ...
  ]
}
```

**Expected backend console:**
```
[Emails] Send triggered by: contactshubham1511@gmail.com (ADMIN) | plan: none | sent today: 0 | requested: 3
[Emails] Admin mode — no plan check, max: 3
[Emails] Available sources: 70 | will send to: 3
[Gemini] Using mock email - API key is not configured
============================================================
[EmailService] EMAIL SENT (MVP - logged only)
From: contactshubham1511@gmail.com
To: priya.sharma@infosys.com
Subject: Interest in Opportunities at Infosys
Body:
Dear Priya Sharma, ...
============================================================
[Emails] ✓ Sent to: priya.sharma@infosys.com | subject: Interest in Opportunities at Infosys
... (repeats for each)
[Emails] Done: 3 sent | admin
```

### 5.4 Check History
**Bruno:** `emails/get-history.bru`
**Expected:** Last 5 sent emails stored in user document

### 5.5 Verify in MongoDB
```javascript
db.users.findOne(
  {email: "contactshubham1511@gmail.com"},
  {lastEmails: 1, emailsSentToday: 1}
)
// emailsSentToday: 3
// lastEmails: [{to, subject, body, sentAt}, ...]
```

---

## Phase 6: UPI Payment (Test as Regular User)

As admin you skip payment. To test the payment flow, use a different Google account or test in incognito.

### 6.1 Flow for Regular User
1. User logs in → Dashboard shows "No Plan" / "Inactive"
2. Goes to Plans page → sees Weekly ₹200 / Monthly ₹600
3. Clicks "Pay ₹200 via UPI"
4. Payment section appears:
   - UPI ID: `contactshubham1511@okicici` (click to copy)
   - "Open in UPI App" button (deep link)
   - User pays via GPay/PhonePe/Paytm
   - User enters UTR number (from payment confirmation SMS)
5. Clicks "Confirm Payment"
6. Plan activates instantly

**Backend console:**
```
[Plans] UPI purchase by: testuser@gmail.com | plan: weekly | ₹200 | UTR: 412345678901
[Plans] Plan activated: weekly | expires: 2026-04-07T...
```

### 6.2 No Third-Party Needed for MVP
The current flow works:
- User pays via their UPI app (any app works)
- User enters the UTR/transaction ID manually
- Plan activates on submission
- You (admin) can verify UTR numbers in MongoDB:
```javascript
db.users.find({"plan.upiTransactionId": {$exists: true}}, {email: 1, plan: 1})
```

### 6.3 Future: Automated Verification
When you scale, add Razorpay/Cashfree for automatic UPI verification:
- Razorpay Payment Links: Free for UPI, 2% for cards
- Cashfree: Similar pricing
- They provide webhook callbacks to auto-activate plans

For now, manual UTR entry is fine. Users are honest when they've paid.

---

## Phase 7: Real Gmail Sending (Production)

This is the step to make emails actually send from the user's Gmail.

### 7.1 What's Needed
Google requires OAuth2 to send emails on behalf of users. Two approaches:

**Approach A: Gmail API (Recommended)**
- User grants Gmail send permission during OAuth login
- You store their access/refresh tokens
- Use Gmail API to send emails as them

**Approach B: App Password (Simpler but limited)**
- Only works for the admin's own Gmail
- Enable 2FA → Generate App Password → Use in Nodemailer
- Not scalable for multiple users

### 7.2 Setup Gmail API (Approach A)

#### Step 1: Enable Gmail API
1. Google Cloud Console → APIs & Services → Library
2. Search "Gmail API" → Enable it

#### Step 2: Add Gmail Scope to OAuth
Update `backend/src/config/passport.js` — change the scope in `backend/src/routes/auth.js`:

In `routes/auth.js`, the Google OAuth redirect currently uses:
```javascript
scope: ['profile', 'email']
```
Change to:
```javascript
scope: ['profile', 'email', 'https://www.googleapis.com/auth/gmail.send']
```

#### Step 3: Store Tokens
In `passport.js`, the callback receives `accessToken` and `refreshToken`.
Save them to the user document:

Add to User model:
```javascript
gmailAccessToken: String,
gmailRefreshToken: String,
```

In the passport callback, save:
```javascript
user.gmailAccessToken = accessToken;
user.gmailRefreshToken = refreshToken;
await user.save();
```

#### Step 4: Update emailService.js
Replace the mock with real Nodemailer + OAuth2:

```javascript
const nodemailer = require('nodemailer');
const { google } = require('googleapis');

async function sendEmail(senderUser, toEmail, subject, body) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.BACKEND_URL}/api/auth/google/callback`
  );

  oauth2Client.setCredentials({
    access_token: senderUser.gmailAccessToken,
    refresh_token: senderUser.gmailRefreshToken,
  });

  const accessToken = await oauth2Client.getAccessToken();

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: senderUser.email,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: senderUser.gmailRefreshToken,
      accessToken: accessToken.token,
    },
  });

  const result = await transporter.sendMail({
    from: `${senderUser.name} <${senderUser.email}>`,
    to: toEmail,
    subject,
    text: body,
  });

  return { success: true, messageId: result.messageId };
}
```

**Note:** This requires `npm install googleapis` in the backend.

#### Step 5: Google OAuth Consent Screen
When in production, submit for Google verification so the "This app isn't verified" warning goes away. During testing, add test users in the OAuth consent screen.

### 7.3 For MVP Testing (Your Gmail Only)
Easiest path to test real sending without full OAuth2 setup:

1. Go to https://myaccount.google.com/apppasswords
2. Generate an app password for "Mail"
3. Add to `.env`:
```
GMAIL_USER=contactshubham1511@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```
4. Update `emailService.js`:
```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

async function sendEmail(userEmail, toEmail, subject, body) {
  const result = await transporter.sendMail({
    from: `HirePing <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject,
    text: body,
  });
  console.log('[EmailService] REAL EMAIL SENT to:', toEmail, '| messageId:', result.messageId);
  return { success: true, messageId: result.messageId };
}
```

**Warning:** Gmail limits to ~500 emails/day with App Password. Fine for MVP testing.
When you scale, switch to Gmail API (Approach A) so each user sends from their own account.

---

## Phase 8: Testing Checklist

Run these in order. Check the box when each passes.

### Infrastructure
- [ ] `docker compose up mongodb -d` — MongoDB running
- [ ] `npm run dev` (backend) — Server on :4000
- [ ] `npm run dev` (frontend) — Vite on :5173
- [ ] `GET /api/health` — Returns `{"status":"ok"}`

### Auth
- [ ] Google OAuth credentials in `.env`
- [ ] Click "Sign in with Google" → consent screen → redirected to dashboard
- [ ] Dashboard shows "SUPERADMIN" badge (for admin email)
- [ ] `GET /api/auth/me` returns user with `isAdmin: true`
- [ ] Copy JWT token to Bruno environment

### Sources
- [ ] `POST /api/sources/sync` → 90 sources created
- [ ] `GET /api/sources/stats` → shows 90 total, 3 countries
- [ ] `GET /api/sources/countries` → INDIA(40), US(30), UK(20)
- [ ] MongoDB: `db.sources.countDocuments()` → 90

### Resume & Profile
- [ ] Upload PDF on Profile page → fields auto-populate
- [ ] (With Gemini key) Upload real resume → real data parsed
- [ ] Edit skills → Save → verify in `GET /api/profile`
- [ ] MongoDB: `db.users.findOne({}, {profile: 1})` shows data

### Email Sending (Admin — Mock Mode)
- [ ] `PUT /api/emails/countries` → set ["INDIA", "US"]
- [ ] `GET /api/emails/preview?count=5` → shows 5 sources
- [ ] `POST /api/emails/send` with `{"count": 3}` → 3 emails logged to console
- [ ] `GET /api/emails/history` → shows sent emails
- [ ] `GET /api/emails/stats` → sentToday = 3, isAdmin = true
- [ ] Frontend Emails page: enter count → preview → send → see results

### UPI Payment (Test with non-admin account)
- [ ] Login with different Google account
- [ ] Plans page shows Weekly/Monthly cards
- [ ] Click "Pay ₹200 via UPI"
- [ ] UPI ID displays, copy works
- [ ] Enter fake UTR → "Confirm Payment" → plan activates
- [ ] Dashboard shows "Active" plan with expiry
- [ ] Emails page allows sending (up to 30/day)
- [ ] MongoDB: `db.users.findOne({}, {plan: 1})` shows UTR

### Email Sending (Real — after Gmail setup)
- [ ] App Password or Gmail API configured
- [ ] `POST /api/emails/send` with `{"count": 1}` → email actually arrives
- [ ] Check recipient inbox (use your own email as a test source)

---

## Quick Reference: Key Env Variables

```bash
# Required for login
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx

# Required for real resume parsing & email generation
GEMINI_API_KEY=AIzaSy...

# Required for real email sending (MVP approach)
GMAIL_USER=contactshubham1511@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

# Admin config
ADMIN_EMAILS=contactshubham1511@gmail.com
UPI_ID=contactshubham1511@okicici

# Infrastructure
MONGO_URI=mongodb://hireping_admin:hireping_secret_2026@localhost:27017/hireping?authSource=admin
JWT_SECRET=hireping-jwt-secret-change-in-production-2026
PORT=4000
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:4000
```

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| "OAuth not configured" in console | Dummy Google credentials | Get real OAuth keys from Google Cloud |
| Redirect after login goes to error | Wrong callback URI | Ensure `http://localhost:4000/api/auth/google/callback` is in Google Console |
| Resume returns mock data | Dummy Gemini key | Get real key from aistudio.google.com |
| "No sources found" on email send | Sources not synced | Run `POST /api/sources/sync` via Bruno |
| Emails logged but not sent | MVP mock mode | Set up Gmail App Password or Gmail API |
| "Cannot connect to MongoDB" | Docker not running | `docker compose up mongodb -d` |
| Plan shows "expired" | Test time passed | Purchase again or update in MongoDB |
| Admin badge not showing | Email mismatch | Check ADMIN_EMAILS in .env matches exactly |
