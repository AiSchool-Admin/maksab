# IOPaint (LaMa Cleaner) — Self-hosted Watermark Inpainting

This directory deploys [IOPaint](https://github.com/Sanster/IOPaint) to Railway.
IOPaint wraps the LaMa inpainting model in a REST API. We use it to remove
the dubizzle flame watermark (and future platforms') from harvested listing
images.

## One-time setup on Railway

1. Go to <https://railway.app/new> → "Deploy from GitHub repo" → pick this
   repo, then set **Root Directory** to `iopaint/`.
2. Railway auto-detects the Dockerfile and starts the build (~8–10 min the
   first time because the LaMa model gets baked in).
3. Once deployed, Railway assigns a public URL like
   `https://iopaint-production-xxxx.up.railway.app`.
4. Copy that URL into Vercel → **Settings → Environment Variables** as
   `IOPAINT_URL`. Redeploy the web app.

### Cost

- Free trial → $5 credit (one-time), good for a few hours of 24/7 uptime.
- After trial → Hobby plan $5/month → **unlimited** cleaning at CPU speed
  (~2–4 seconds per image).

### Sanity check

```bash
curl https://<your-iopaint-url>/api/v1/model
# {"model":"lama","device":"cpu"}
```

### Testing inpainting directly

```bash
curl -X POST https://<your-iopaint-url>/api/v1/inpaint \
  -F 'image=@test-input.jpg' \
  -F 'mask=@test-mask.png' \
  -o out.png
```

Mask convention: **white = region to inpaint, black = region to keep**.

## Fallback: Replicate

If Railway is sleeping or IOPaint errors out, the web app falls back to
Replicate's hosted LaMa. Set `REPLICATE_API_TOKEN` in Vercel (from
<https://replicate.com/account/api-tokens>). ~$0.001 per image. $5 free
monthly credit = ~5000 images.

## Local dev (optional)

```bash
pip install iopaint
iopaint start --model=lama --port=8080
```

Then set `IOPAINT_URL=http://localhost:8080` in `.env.local`.
