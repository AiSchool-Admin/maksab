# WAHA Setup on Railway — Step-by-Step Guide

## Why WAHA?

WAHA is a self-hosted WhatsApp HTTP API that gives you:
- ✅ **Free & unlimited messages** (no Meta restrictions)
- ✅ **No template approval** required
- ✅ **No business verification** required
- ✅ **Full Arabic support** out of the box
- ✅ **Send images, documents, voice notes** as well as text
- ⚠️ **Ban risk:** Meta may ban the WhatsApp number if used aggressively (mass messaging, spam reports)

## Setup Time: ~30 minutes

---

## Prerequisites

- A WhatsApp account with a **dedicated phone number** (NOT your personal one)
  - Buy a new SIM card (~20 EGP)
  - Activate WhatsApp on it from any phone
  - This number will be controlled by WAHA — you can't use it on your phone simultaneously
- Railway account ([railway.app](https://railway.app))
- 5 minutes to scan a QR code

---

## Step 1: Create New Railway Service

1. Go to [railway.app/dashboard](https://railway.app/dashboard)
2. Open your existing **maksab** project
3. Click **"+ New"** → **"Empty Service"**
4. Rename the service to **"waha"** (Settings → Service Name)

---

## Step 2: Connect to GitHub Repo

1. In the new "waha" service → **Settings** → **Source**
2. Click **"Connect Repo"** → select **AiSchool-Admin/maksab**
3. **Branch:** `main`
4. **Root Directory:** `/` (root)
5. **Watch Paths:** `railway/waha/**` (so it only redeploys when WAHA config changes)
6. **Build Settings:**
   - **Builder:** Dockerfile
   - **Dockerfile Path:** `railway/waha/Dockerfile`

---

## Step 3: Add Environment Variables

In the waha service → **Variables** tab → add these:

```bash
# Required
WHATSAPP_API_KEY=GENERATE_A_LONG_RANDOM_STRING_HERE
# Generate with: openssl rand -hex 32
# Example: a3f8b9c1d2e4f6a8b0c3d5e7f9a1b3c5

WHATSAPP_DEFAULT_ENGINE=WEBJS
WHATSAPP_START_SESSION=default
WHATSAPP_HOOK_URL=https://maksab.vercel.app/api/webhooks/waha
WHATSAPP_HOOK_EVENTS=message,session.status

# Recommended — enables web dashboard for QR scan
WAHA_DASHBOARD_ENABLED=true
WAHA_DASHBOARD_USERNAME=admin
WAHA_DASHBOARD_PASSWORD=PICK_A_STRONG_PASSWORD

# File storage paths (Railway will mount volume here)
WHATSAPP_FILES_FOLDER=/app/.media
WHATSAPP_SESSIONS_FOLDER=/app/.sessions
```

**Important:** Save `WHATSAPP_API_KEY` value — you'll need it in the next step.

---

## Step 4: Add Persistent Volume (Critical!)

Without a volume, your WhatsApp session will be lost on every restart.

1. In waha service → **Settings** → scroll to **"Volumes"**
2. Click **"+ Add Volume"**
3. **Mount Path:** `/app/.sessions`
4. **Size:** 1 GB
5. Save

(Optional: add a second volume at `/app/.media` for received images)

---

## Step 5: Generate Public Domain

1. In waha service → **Settings** → **Networking**
2. Click **"Generate Domain"**
3. Copy the URL (e.g., `https://waha-production-abc123.up.railway.app`)

---

## Step 6: Deploy

1. Click **"Deploy"** (or push a commit to trigger auto-deploy)
2. Wait ~2-3 minutes for build + first start
3. Check logs — you should see WAHA starting up

---

## Step 7: Pair WhatsApp (Scan QR Code)

1. Open the dashboard: `https://YOUR-WAHA-URL.up.railway.app/dashboard`
2. Login with `WAHA_DASHBOARD_USERNAME` / `WAHA_DASHBOARD_PASSWORD`
3. Go to **"Sessions"** → **"default"** session
4. If status = "SCAN_QR_CODE", click **"View QR"**
5. On your dedicated WhatsApp phone:
   - Open WhatsApp → Settings → Linked Devices → Link a Device
   - Scan the QR code from the dashboard
6. Status should change to **"WORKING"** within 10 seconds

---

## Step 8: Add WAHA Env Vars to Vercel (Maksab App)

In Vercel → maksab project → Settings → Environment Variables, add:

```bash
WAHA_BASE_URL=https://YOUR-WAHA-URL.up.railway.app
WAHA_API_KEY=THE_SAME_KEY_FROM_STEP_3
WAHA_SESSION=default
```

**Apply to:** Production, Preview, Development

Then **Redeploy** Vercel.

---

## Step 9: Test It!

### Quick Test from Terminal

```bash
curl -X POST https://YOUR-WAHA-URL.up.railway.app/api/sendText \
  -H "X-Api-Key: YOUR_WAHA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "session": "default",
    "chatId": "201064348782@c.us",
    "text": "اختبار من مكسب 🎉"
  }'
```

If you get back a JSON with a message ID, it worked! Check your phone for the message.

### Test via Maksab Consent Flow

1. Reset test seller in Supabase:
   ```sql
   UPDATE ahe_sellers
   SET pipeline_status = 'phone_found'
   WHERE id = '65904373-9dad-4e89-905e-c3e33c7cc283';
   ```

2. Open: `https://maksab.vercel.app/consent?seller=65904373-9dad-4e89-905e-c3e33c7cc283&ref=ahmed`

3. Click "موافق"

4. Check your phone — should receive a WhatsApp message via WAHA!

5. Verify in DB:
   ```sql
   SELECT action, notes, created_at
   FROM outreach_logs
   WHERE seller_id = '65904373-9dad-4e89-905e-c3e33c7cc283'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

   Should show: `[WAHA SENT ...] auto_registered + welcome via waha`

---

## Cost Estimate (Railway)

WAHA on Railway typically costs:
- **Memory:** 512 MB - 1 GB → $5-10/month
- **CPU:** 0.5 vCPU → included
- **Volume:** 1 GB → $0.25/month
- **Network:** small (< 1 GB/month for outreach) → ~$1
- **Total:** ~$6-12/month

For comparison:
- 10,000 SMS via SMS Misr = ~1,200 EGP = $24
- WAHA can send 10,000+ messages for $6-12

---

## Operational Tips

### To prevent WhatsApp ban:

1. **Warm up the number gradually:**
   - Day 1-3: 20-30 messages/day
   - Day 4-7: 50-100 messages/day
   - Day 8+: 200+ messages/day

2. **Personalize every message:**
   - Use the seller's name
   - Reference their specific listing
   - Don't send identical text to many people

3. **Add delays:**
   - 30-60 seconds between messages
   - Avoid sending at suspicious times (3 AM)

4. **Reply to user responses promptly** (improves "quality score")

5. **Have a backup number ready** in case of ban

### Monitoring:

- Check session status via dashboard regularly
- Watch logs for "session disconnected" errors
- Re-scan QR if you see SCAN_QR_CODE state

---

## Troubleshooting

### "Session not found"
→ Check `WAHA_SESSION` env var matches the session name in WAHA dashboard

### "401 Unauthorized"
→ `WAHA_API_KEY` doesn't match the one in WAHA's `WHATSAPP_API_KEY` env var

### Messages send but never arrive
→ Number might be banned. Try sending from another WhatsApp account to the bot number
→ If that fails, the number is banned. Get a new SIM.

### Session keeps disconnecting
→ The phone running WhatsApp must stay online (or use a stable phone)
→ Check Railway logs for OOM errors → upgrade to 1 GB RAM

---

## Next Steps After WAHA Works

1. Update outreach worker to use WAHA for follow-up messages (not just templates)
2. Build conversational AI that responds to seller questions automatically
3. Add image/document sending for property tours
