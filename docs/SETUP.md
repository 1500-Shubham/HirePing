# HirePing - Setup & Run Guide

---

## Step 0: Get All Your Keys First

Before running anything, register for these services and get your keys.
Do them all at once — takes ~15 minutes total.

### 0.1 Google OAuth (Login + Gmail Sending) — Required

This lets users sign in with Google AND send emails from their Gmail.

1. Go to https://console.cloud.google.com
2. Click "Select a project" → "New Project" → name it `HirePing` → Create
3. Wait for project to create, then select it

**Enable Gmail API:**
4. Go to **APIs & Services → Library**
5. Search `Gmail API` → Click → **Enable**

**Configure consent screen:**
6. Go to **APIs & Services → OAuth consent screen**
7. User type: **External** → Create
8. App name: `HirePing`
9. Support email: `contactshubham1511@gmail.com`
10. Scopes → Add: `email`, `profile`, `openid`, `https://www.googleapis.com/auth/gmail.send`
11. Test users → Add: `contactshubham1511@gmail.com` (and any emails you'll test with)
12. Save & Continue through all steps

**Create credentials:**
13. Go to **APIs & Services → Credentials**
14. Click **Create Credentials → OAuth 2.0 Client ID**
15. Application type: **Web application**
16. Name: `HirePing Web`
17. Authorized JavaScript origins: `http://localhost:5173`
18. Authorized redirect URIs: `http://localhost:4000/api/auth/google/callback`
19. Click **Create**
20. Copy **Client ID** and **Client Secret**

```
GOOGLE_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx
```

> **Note:** While in "Testing" mode, only test users you added can log in.
> To let anyone log in, submit for Google verification (takes a few days).

---

### 0.2 Gemini API (Resume Parsing + Email Generation) — Required

1. Go to https://aistudio.google.com/apikey
2. Sign in with your Google account
3. Click **Create API Key**
4. Select your `HirePing` project (or create new)
5. Copy the key

```
GEMINI_API_KEY=AIzaSy-xxxxxxxxxxxxxxxxxxxx
```

> Without this key, resume parsing and email generation use mock/fake data.
> With it, Gemini actually reads the resume and writes personalized emails.

---

### 0.3 Razorpay (Payments — UPI, Cards, Netbanking) — Recommended

Users click "Pay" → Razorpay modal opens → they scan QR / use GPay / PhonePe → done.
**Free for UPI payments.** 2% fee only on cards.

1. Go to https://dashboard.razorpay.com/signup
2. Sign up with your email
3. Complete KYC (PAN, bank details) — takes 1-2 days for approval
4. While waiting, use **Test Mode** (works immediately):
   - Dashboard → switch to **Test Mode** (toggle at top)
   - Go to **Settings → API Keys → Generate Test Key**
   - Copy Key ID and Key Secret

```
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
```

> **Test mode:** Payments go through with test cards/UPI — no real money moves.
> **Live mode:** After KYC approval, generate live keys to accept real payments.
> **Without Razorpay:** Falls back to manual UPI (user copies your UPI ID, pays, enters UTR).

---

### 0.4 Your Complete .env File

Create `backend/.env` with all your keys:

```bash
# MongoDB (local Docker — no registration needed)
MONGO_URI=mongodb://hireping_admin:hireping_secret_2026@localhost:27017/hireping?authSource=admin

# Google OAuth (from Step 0.1)
GOOGLE_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx

# Gemini AI (from Step 0.2)
GEMINI_API_KEY=AIzaSy-xxxxxxxxxxxxxxxxxxxx

# Razorpay (from Step 0.3 — leave as dummy to use manual UPI)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx

# JWT secret (make up a random long string)
JWT_SECRET=hireping-jwt-secret-change-this-to-something-random-2026

# Server config
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:4000

# Admin (your email — gets superadmin powers)
ADMIN_EMAILS=contactshubham1511@gmail.com

# UPI fallback (used when Razorpay is not configured)
UPI_ID=contactshubham1511@okicici
```

---

## Step 1: Start MongoDB

```bash
cd C:/Startup/HirePing
docker compose up mongodb -d
```

Verify: `docker ps` → shows `hireping-mongo` running

---

## Step 2: Start Backend

```bash
cd backend
npm install
npm run dev
```

**Expected console (all keys configured):**
```
[Plans] Razorpay initialized (key: rzp_test_xxx...)
Connected to MongoDB: hireping
HirePing server running on port 4000
```

**Expected console (dummy Razorpay keys):**
```
[Plans] Razorpay not configured — manual UPI fallback active
Connected to MongoDB: hireping
HirePing server running on port 4000
```

---

## Step 3: Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — you should see the HirePing landing page.

---

## Step 4: Test Login

1. Click "Get Started Free" or "Sign in with Google"
2. Google consent screen → asks for profile, email, **and Gmail send permission**
3. Approve → redirected to dashboard
4. Should see "SUPERADMIN" badge if you used your admin email

---

## Step 5: Sync Sources

Use Bruno or curl (admin only, no UI):
```bash
curl -X POST http://localhost:4000/api/sources/sync \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Get your JWT from browser: DevTools → Application → Local Storage → `token`

---

## Step 6: Test Full Flow

See [TESTING.md](TESTING.md) for the complete step-by-step testing guide with expected outputs.

---

## Payment Flow

### With Razorpay (recommended):
1. User clicks "Pay ₹200" → Razorpay modal opens
2. User sees: UPI QR code, GPay, PhonePe, Paytm, cards, netbanking
3. User pays → Razorpay verifies → plan activates instantly
4. Zero manual steps for user

### Without Razorpay (manual fallback):
1. User clicks "Pay ₹200" → sees your UPI ID
2. User copies UPI ID → pays in their UPI app
3. User enters UTR number → plan activates
4. You verify UTR in MongoDB if needed

---

## Superadmin

Email in `ADMIN_EMAILS` gets superadmin on Google login.

**Admin powers:**
- No subscription required — unlimited email sending
- Custom email count — choose how many to send
- Source preview — see exactly which contacts will receive emails
- Source sync — only admin syncs contacts via API

```
ADMIN_EMAILS=contactshubham1511@gmail.com,another@admin.com
```

---

## Adding Source Contacts

Drop `.txt`, `.csv`, `.pdf`, or `.xlsx` files into the `sources/` folder.

**File naming = country:** `INDIA.txt` → INDIA, `US2.csv` → US, `UK.xlsx` → UK

**File formats supported:**
```
# Full CSV (best)
name,email,role,company,companyType
Priya Sharma,priya@infosys.com,HR Manager,Infosys,mnc

# Just emails (minimal)
hr@startup.com
recruiter@techcorp.com

# Excel (.xlsx) — auto-detects headers
```

Sync after adding files:
```bash
curl -X POST http://localhost:4000/api/sources/sync -H "Authorization: Bearer JWT"
```

---

## Bruno API Testing

1. Install [Bruno](https://www.usebruno.com/)
2. Open the collection at `backend/bruno/`
3. Go to Environments → local → set `token` to your JWT
4. Test endpoints in order (see [TESTING.md](TESTING.md))

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/health | No | Health check |
| GET | /api/auth/google | No | Start Google OAuth |
| GET | /api/auth/google/callback | No | OAuth callback |
| GET | /api/auth/me | Yes | Get current user |
| POST | /api/auth/logout | Yes | Logout |
| GET | /api/profile | Yes | Get profile |
| PUT | /api/profile | Yes | Update profile |
| POST | /api/resume/upload | Yes | Upload & parse resume (PDF) |
| GET | /api/plans | Yes | Get plans + payment config |
| POST | /api/plans/create-order | Yes | Create Razorpay order |
| POST | /api/plans/verify | Yes | Verify Razorpay payment |
| POST | /api/plans/purchase | Yes | Manual UPI purchase (fallback) |
| GET | /api/plans/status | Yes | Get plan status |
| POST | /api/sources/sync | Yes | Sync sources from folder (admin) |
| POST | /api/sources/upload | Yes | Upload source files (admin) |
| GET | /api/sources/countries | Yes | Get countries + counts |
| GET | /api/sources/stats | Yes | Get source statistics |
| GET | /api/emails/preview | Yes | Preview sources before sending |
| POST | /api/emails/send | Yes | Send emails |
| GET | /api/emails/history | Yes | Get email history |
| GET | /api/emails/stats | Yes | Get email stats |
| PUT | /api/emails/countries | Yes | Update target countries |
