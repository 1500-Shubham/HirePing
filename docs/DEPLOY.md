# HirePing - Free Deployment Guide

Launch HirePing on the internet for ₹0 infrastructure + ₹150/year domain.

---

## What You Need (All Free)

| Service | What For | Cost | Link |
|---------|----------|------|------|
| Oracle Cloud | Server (4 CPU, 24GB RAM, forever free) | ₹0 | https://cloud.oracle.com/free |
| Cloudflare | DNS + SSL + CDN | ₹0 | https://cloudflare.com |
| MongoDB Atlas | Database (512MB free cluster) | ₹0 | https://mongodb.com/atlas |
| Domain (.in) | hireping.in | ~₹150/year | https://namecheap.com |

**Total cost: ₹150/year** (just the domain)

---

## Step 1: Buy Domain (~₹150)

1. Go to https://www.namecheap.com or https://www.godaddy.com
2. Search for `hireping.in` or `hireping.co`
3. Buy the cheapest option (.in is usually ₹150-200/year)
4. Don't buy any extras (hosting, email, SSL — all free via Cloudflare)

---

## Step 2: MongoDB Atlas (Free Database)

### 2.1 Create Cluster
1. Go to https://mongodb.com/atlas → Sign up
2. Create a free cluster:
   - Provider: AWS
   - Region: Mumbai (ap-south-1) — closest to India
   - Tier: **M0 Sandbox (FREE)**
   - Cluster name: hireping
3. Click "Create Cluster" (takes 2-3 minutes)

### 2.2 Create Database User
1. Security → Database Access → Add New User
2. Username: `hireping_app`
3. Password: generate a strong one, save it
4. Role: Read and write to any database

### 2.3 Allow Network Access
1. Security → Network Access → Add IP Address
2. Click "Allow Access from Anywhere" (0.0.0.0/0)
   - For production later, restrict to your server IP only

### 2.4 Get Connection String
1. Clusters → Connect → Connect your application
2. Copy the connection string, looks like:
```
mongodb+srv://hireping_app:YOUR_PASSWORD@hireping.xxxxx.mongodb.net/hireping?retryWrites=true&w=majority
```
3. Save this — you'll put it in your server's `.env` as `MONGO_URI`

---

## Step 3: Oracle Cloud Free Tier (Server)

### 3.1 Create Account
1. Go to https://cloud.oracle.com/free
2. Sign up (needs credit card for verification, but **never charges**)
3. Home region: **India South (Hyderabad)** or **India West (Mumbai)**

### 3.2 Create VM Instance
1. Compute → Instances → Create Instance
2. Configuration:
   - Name: `hireping`
   - Image: **Ubuntu 22.04** (or 24.04)
   - Shape: **VM.Standard.A1.Flex** (ARM) — this is the free one
   - OCPUs: **2** (can go up to 4 free)
   - Memory: **12 GB** (can go up to 24 free)
   - Boot volume: **50 GB**
3. Networking:
   - Create new VCN or use default
   - Assign public IP: Yes
4. SSH Key:
   - Upload your public key (`C:\Users\shubh\.ssh\id_rsa.pub`)
   - Or generate new one and download private key
5. Click "Create"

### 3.3 Open Firewall Ports
1. Go to: Networking → Virtual Cloud Networks → your VCN → Security Lists → Default
2. Add Ingress Rules:

| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| 80 | TCP | 0.0.0.0/0 | HTTP |
| 443 | TCP | 0.0.0.0/0 | HTTPS |
| 22 | TCP | 0.0.0.0/0 | SSH |

3. Also open firewall inside the VM (do this after SSH):
```bash
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

### 3.4 SSH into Server
```bash
ssh -i ~/.ssh/your_key ubuntu@YOUR_SERVER_PUBLIC_IP
```

---

## Step 4: Server Setup

Run these commands on the Oracle Cloud VM.

### 4.1 Install Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # should show v20.x
```

### 4.2 Install Nginx
```bash
sudo apt update
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 4.3 Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

### 4.4 Install Git & Clone Project
```bash
sudo apt install -y git
cd /home/ubuntu
git clone https://github.com/YOUR_USERNAME/HirePing.git
cd HirePing
```

Or if not on GitHub yet, SCP the files:
```bash
# From your local machine:
scp -i ~/.ssh/your_key -r C:/Startup/HirePing ubuntu@YOUR_IP:/home/ubuntu/
```

---

## Step 5: Deploy Backend

### 5.1 Install Dependencies
```bash
cd /home/ubuntu/HirePing/backend
npm install --production
```

### 5.2 Create .env
```bash
nano .env
```
Paste:
```bash
MONGO_URI=mongodb+srv://hireping_app:YOUR_PASSWORD@hireping.xxxxx.mongodb.net/hireping?retryWrites=true&w=majority
GOOGLE_CLIENT_ID=your-real-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-real-google-client-secret
JWT_SECRET=a-long-random-string-change-this-in-production
GEMINI_API_KEY=your-real-gemini-api-key
PORT=4000
NODE_ENV=production
FRONTEND_URL=https://hireping.in
BACKEND_URL=https://hireping.in
ADMIN_EMAILS=contactshubham1511@gmail.com
UPI_ID=contactshubham1511@okicici
```

**Important:** Update `FRONTEND_URL` and `BACKEND_URL` to your real domain.

### 5.3 Start with PM2
```bash
pm2 start src/index.js --name hireping-backend
pm2 save
pm2 startup   # follow the command it prints to auto-start on reboot
```

### 5.4 Verify
```bash
curl http://localhost:4000/api/health
# {"status":"ok","timestamp":"...","environment":"production"}
```

---

## Step 6: Deploy Frontend

### 6.1 Build
```bash
cd /home/ubuntu/HirePing/frontend
npm install
```

Update the Vite config for production — the API proxy only works in dev.
In production, Nginx handles proxying. Just build:
```bash
npm run build
```

### 6.2 Serve via Nginx
```bash
sudo cp -r dist/* /var/www/html/
```

---

## Step 7: Nginx Configuration

### 7.1 Create Config
```bash
sudo nano /etc/nginx/sites-available/hireping
```

Paste:
```nginx
server {
    listen 80;
    server_name hireping.in www.hireping.in;

    # Frontend — serve static files
    root /var/www/html;
    index index.html;

    # SPA routing — all non-file routes serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API — proxy to backend
    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Allow large file uploads (resumes, sources)
        client_max_body_size 20M;
    }
}
```

### 7.2 Enable & Restart
```bash
sudo ln -s /etc/nginx/sites-available/hireping /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t                  # test config
sudo systemctl restart nginx
```

### 7.3 Verify
Open `http://YOUR_SERVER_IP` in browser — should see HirePing landing page.

---

## Step 8: Cloudflare DNS + Free SSL

### 8.1 Add Site to Cloudflare
1. Go to https://cloudflare.com → Sign up / Login
2. Click "Add a Site" → enter `hireping.in`
3. Select **Free plan**

### 8.2 Update Nameservers
Cloudflare gives you 2 nameservers like:
```
ada.ns.cloudflare.com
bob.ns.cloudflare.com
```
Go to your domain registrar (Namecheap/GoDaddy) → update nameservers to these.
Takes 5-30 minutes to propagate.

### 8.3 Add DNS Records
In Cloudflare DNS tab, add:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | @ | YOUR_SERVER_IP | Proxied (orange cloud) |
| A | www | YOUR_SERVER_IP | Proxied (orange cloud) |

### 8.4 SSL Settings
1. Cloudflare → SSL/TLS → set to **Full**
2. Edge Certificates → Always Use HTTPS → **ON**
3. Edge Certificates → Automatic HTTPS Rewrites → **ON**

### 8.5 Install Origin Certificate (for Nginx)
1. Cloudflare → SSL/TLS → Origin Server → Create Certificate
2. Select: RSA 2048, hostnames: `*.hireping.in, hireping.in`
3. Copy the certificate and private key

On your server:
```bash
sudo mkdir -p /etc/ssl/cloudflare
sudo nano /etc/ssl/cloudflare/hireping.pem     # paste certificate
sudo nano /etc/ssl/cloudflare/hireping.key     # paste private key
```

### 8.6 Update Nginx for SSL
```bash
sudo nano /etc/nginx/sites-available/hireping
```

Replace the entire file with:
```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name hireping.in www.hireping.in;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name hireping.in www.hireping.in;

    ssl_certificate /etc/ssl/cloudflare/hireping.pem;
    ssl_certificate_key /etc/ssl/cloudflare/hireping.key;

    # Frontend
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 20M;
    }
}
```

```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## Step 9: Update Google OAuth for Production

1. Go to Google Cloud Console → Credentials
2. Edit your OAuth 2.0 Client ID
3. Add to Authorized JavaScript origins:
   - `https://hireping.in`
4. Add to Authorized redirect URIs:
   - `https://hireping.in/api/auth/google/callback`
5. Save

---

## Step 10: Sync Sources on Server

```bash
# Copy your source files to server
scp -i ~/.ssh/your_key C:/Startup/HirePing/sources/*.txt ubuntu@YOUR_IP:/home/ubuntu/HirePing/sources/

# Sync via API
curl -X POST https://hireping.in/api/sources/sync \
  -H "Authorization: Bearer YOUR_ADMIN_JWT"
```

---

## Step 11: Verify Everything

Open https://hireping.in and test:

- [ ] Landing page loads with SSL (green padlock)
- [ ] "Sign in with Google" works → redirects to dashboard
- [ ] SUPERADMIN badge shows for your account
- [ ] Upload resume → profile auto-populates
- [ ] Go to Emails → select countries → preview sources → send
- [ ] Check your Gmail Sent folder — emails should be there
- [ ] Test with another Google account → Plans page → UPI payment flow

---

## Maintenance Commands

```bash
# SSH into server
ssh -i ~/.ssh/your_key ubuntu@YOUR_IP

# View backend logs (live)
pm2 logs hireping-backend

# Restart backend (after code changes)
cd /home/ubuntu/HirePing/backend
git pull                          # if using git
pm2 restart hireping-backend

# Rebuild frontend (after code changes)
cd /home/ubuntu/HirePing/frontend
npm run build
sudo cp -r dist/* /var/www/html/

# Check server status
pm2 status
sudo systemctl status nginx

# MongoDB (use Atlas dashboard or mongosh)
# https://cloud.mongodb.com → your cluster → Browse Collections
```

---

## Deploy Checklist

```
Infrastructure:
  [ ] Oracle Cloud VM created (Ubuntu, ARM, 2 CPU, 12GB)
  [ ] Ports 80, 443, 22 open (security list + iptables)
  [ ] Node.js 20, Nginx, PM2 installed
  [ ] SSH access working

Database:
  [ ] MongoDB Atlas free cluster created (Mumbai region)
  [ ] Database user created
  [ ] Network access: 0.0.0.0/0 (or server IP)
  [ ] Connection string saved

Domain + DNS:
  [ ] Domain purchased (hireping.in)
  [ ] Cloudflare account → site added → free plan
  [ ] Nameservers updated at registrar
  [ ] A records pointing to server IP (proxied)
  [ ] SSL set to "Full" in Cloudflare
  [ ] Origin certificate installed on Nginx

Backend:
  [ ] Code on server (/home/ubuntu/HirePing/backend)
  [ ] .env created with production values
  [ ] npm install --production
  [ ] PM2 running: pm2 start src/index.js --name hireping-backend
  [ ] pm2 startup + pm2 save (auto-restart on reboot)
  [ ] curl localhost:4000/api/health returns ok

Frontend:
  [ ] npm run build (creates dist/)
  [ ] dist/* copied to /var/www/html/
  [ ] Nginx config with SPA routing + API proxy

Google OAuth:
  [ ] Production redirect URI added: https://hireping.in/api/auth/google/callback
  [ ] JavaScript origin added: https://hireping.in

Sources:
  [ ] Source files copied to server
  [ ] POST /api/sources/sync called

Final Test:
  [ ] https://hireping.in loads (SSL padlock)
  [ ] Google login works
  [ ] Resume upload works
  [ ] Email sending works (check Gmail Sent folder)
  [ ] UPI payment works (test with second account)
```

---

## Cost Summary

| Item | Cost | Frequency |
|------|------|-----------|
| Oracle Cloud VM | ₹0 | Forever free |
| MongoDB Atlas M0 | ₹0 | Forever free |
| Cloudflare DNS + SSL | ₹0 | Forever free |
| Domain (.in) | ₹150 | Yearly |
| **Total** | **₹150/year** | |

Your break-even is **1 user paying ₹200 weekly**. One user covers your annual infrastructure cost.
