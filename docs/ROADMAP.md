# HirePing - Product Roadmap

What's done, what's next, and where we're heading.

---

## MVP (v1.0) — Built

| Feature | Status |
|---------|--------|
| Google OAuth login (+ Gmail send permission) | Done |
| Resume upload → Gemini AI parsing → auto-populate profile | Done |
| Editable profile (skills, education, experience) | Done |
| Source contacts synced from files (country from filename) | Done |
| Source upload via API (txt/csv/pdf/xlsx) | Done |
| Razorpay payment (UPI QR, GPay, PhonePe, cards) | Done |
| Manual UPI fallback (when Razorpay not configured) | Done |
| Payment history stored per user | Done |
| Email generation via Gemini AI (unique, non-repetitive) | Done |
| Email sent from user's own Gmail via OAuth2 | Done |
| Anti-bombarding (max 5 emails per source per day) | Done |
| Country targeting (user selects countries) | Done |
| Superadmin (unlimited sending, no plan, source preview) | Done |
| Total emails sent counter on Dashboard | Done |
| Bruno API collection (20+ endpoints) | Done |
| Docker Compose one-click deploy | Done |
| Full docs (Architecture, Setup, Testing, Deploy, Flows) | Done |

---

## Phase 2 — After First 10 Paying Users

Build only after validating demand with real paying users.

### 2.1 Email Open Tracking
- Add invisible tracking pixel (1x1 transparent image hosted on our server)
- Track: opened, when, how many times
- Dashboard: "43% open rate this week"
- Users see ROI — this sells subscriptions

### 2.2 Email Templates & Tone Control
- Let users choose tone: formal, friendly, casual
- Custom opening / closing lines
- "Follow-up" mode — auto-send second email to non-openers after 3 days

### 2.3 Source Quality Score
- Track which sources lead to opens/replies
- Score: high response, low response, bounced
- Auto-prioritize high-score sources
- Auto-remove bounced/invalid emails

### 2.4 Razorpay Subscription Auto-Renewal
- Auto-renew weekly/monthly plans
- User doesn't have to manually re-purchase
- Cancel anytime from dashboard

---

## Phase 3 — After 50 Paying Users

### 3.1 User Dashboard Analytics
- Weekly report email: "You sent 210 emails, 43 opened, 3 replied"
- Charts: emails sent over time, open rate trend
- Top responding countries
- "Best time to send" analysis

### 3.2 Response Detection
- Monitor user's Gmail inbox (with permission) for replies
- Auto-detect positive responses: "Let's schedule a call"
- Dashboard: "3 companies replied this week"
- Ultimate metric — replies, not just sends

### 3.3 Daily Automated Sending (Scheduler)
- User sets preferences once → system sends daily at 8 AM
- No need to click "Send" every day
- Weekly digest email showing what was sent

### 3.4 LinkedIn Integration
- Scrape LinkedIn job postings → find hiring managers
- "Apply to this job" → auto-send cold email to poster
- Connect LinkedIn profile to enrich user data

---

## Phase 4 — After 200 Users (Scale)

### 4.1 Tiered Pricing
| Plan | Price | Emails/Day | Features |
|------|-------|-----------|----------|
| Starter | ₹200/week | 30 | Basic |
| Pro | ₹500/week | 75 | + tracking + follow-ups |
| Premium | ₹1,500/month | 100 | + analytics + priority sources |

### 4.2 Referral Program
- "Refer a friend, get 1 week free"
- Referral link in dashboard
- Viral loop: job seekers know other job seekers

### 4.3 Source Marketplace
- Users request sources for specific roles/industries
- Admin adds them, charges premium
- "CTOs at YC startups? ₹500 one-time add-on"

### 4.4 Multi-Language Emails
- Generate emails in Hindi, German, French
- Bigger addressable market in non-English countries

### 4.5 Mobile App
- React Native (shared codebase)
- Push notifications: "5 emails sent this morning"

---

## Phase 5 — Vision (1000+ Users)

### 5.1 AI Interview Prep
- Company replies → AI preps you for the interview
- "Here's what Razorpay asks backend devs"
- Mock interview with AI

### 5.2 Job Board Aggregator
- Scrape LinkedIn, Naukri, Indeed, AngelList
- Auto-match with user profile
- One-click cold email to the hiring manager

### 5.3 Company Intelligence
- "Razorpay is hiring 15 engineers this quarter"
- "Best time to email Infosys HR: Tuesday 10 AM"

---

## What We Will NOT Build Yet

- No mobile app until 200+ users
- No AI interview prep until 500+ users
- No team/enterprise features in Year 1
- No Chrome extension
- No white-labeling or custom domains

---

## Revenue Milestones

| Milestone | Users | Monthly Revenue | Target |
|-----------|-------|----------------|--------|
| Break-even | 1 | ₹860 | Week 1 |
| Ramen profitable | 20 | ₹17,000 | Month 1-2 |
| Full-time viable | 100 | ₹86,000 | Month 3-4 |
| First hire | 300 | ₹2,58,000 | Month 6 |
| Real business | 1,000 | ₹8,60,000 | Year 1 |

---

## Tech Debt (Address Before 50 Users)

- [ ] Rate limiting on API (express-rate-limit)
- [ ] Input sanitization (helmet, xss)
- [ ] Error monitoring (Sentry free tier)
- [ ] Request logging (morgan)
- [ ] Database indexes (Source.email, Source.country, User.email)
- [ ] Daily MongoDB backup (mongodump)
- [ ] SSL certificate (Cloudflare handles this)
