# HirePing - Production Checklist

Everything that needs to be done before going live with real users.

---

## Google OAuth

- [ ] Complete Google OAuth verification process (APIs & Credentials → OAuth consent screen → Publish)
- [ ] Add privacy policy URL and terms of service URL (required for verification)
- [ ] Submit for Google review (can take a few days to weeks)
- [ ] Until verified, only test users added manually can log in
- [ ] Update OAuth redirect URIs to production domain (`https://api.hireping.in/api/auth/google/callback`)
- [ ] Add production domain to Authorised JavaScript origins (`https://hireping.in`)

## Razorpay

- [ ] Complete KYC on Razorpay dashboard (PAN, bank account, business details) — takes 1-2 days
- [ ] Generate **Live Keys** (replace `rzp_test_` with `rzp_live_` in env)
- [ ] Add Razorpay webhook for server-to-server payment verification (fallback if frontend callback fails)
- [ ] Test one real payment end-to-end before public launch

## Environment Variables

- [ ] Change `JWT_SECRET` to a strong random string (not the dev placeholder)
- [ ] Set `NODE_ENV=production`
- [ ] Update `FRONTEND_URL` and `BACKEND_URL` to production domains
- [ ] Set real `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` (live keys)
- [ ] Update `MONGO_URI` to production database (Atlas or secured instance)

## Security

- [ ] Enable HTTPS (Cloudflare SSL or Let's Encrypt)
- [ ] Ensure `.env` is not committed to git
- [ ] Set secure cookie options (httpOnly, secure, sameSite)
- [ ] Rate limit API endpoints (especially auth, email sending)
- [ ] Review CORS — only allow production frontend domain

## Database

- [ ] Migrate from local Docker MongoDB to MongoDB Atlas (or secured production instance)
- [ ] Set up database backups (Atlas has automatic backups on M10+)
- [ ] Create indexes for frequently queried fields

## Email / Gmail

- [ ] Ensure Gmail OAuth refresh tokens are working long-term (they expire if app is in testing mode)
- [ ] Monitor Gmail API quotas (daily sending limits)
- [ ] Set up error alerts for failed email sends

## Domain & DNS

- [ ] Buy domain (hireping.in or similar)
- [ ] Configure Cloudflare DNS
- [ ] Set up SSL certificate

## Monitoring

- [ ] Set up PM2 or similar process manager for backend
- [ ] Add error logging (Sentry, LogRocket, or similar)
- [ ] Monitor server health and uptime
