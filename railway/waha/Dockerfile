# WAHA — Self-hosted WhatsApp HTTP API
# Docs: https://waha.devlike.pro/
#
# Deploy on Railway:
#   1. Create new Railway service in maksab-workers project
#   2. Settings → Source → "Deploy from Dockerfile" → path: railway/waha/Dockerfile
#   3. Add env vars (see railway.toml)
#   4. After deploy: visit /api/screenshot to scan QR with WhatsApp
#
# Resources needed:
#   - 512 MB RAM minimum (1 GB recommended)
#   - 1 vCPU
#   - Persistent volume for /app/.sessions (so WhatsApp session survives restarts)

FROM devlikeapro/waha:latest

# Default port
EXPOSE 3000

# Healthcheck — WAHA exposes /api/health
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1
