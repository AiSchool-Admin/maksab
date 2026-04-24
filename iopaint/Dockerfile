# IOPaint (LaMa Cleaner) — free open-source watermark/object inpainting
# Deploy to Railway and set IOPAINT_URL in Vercel env vars.
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libsm6 libxrender1 libxext6 libgl1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install IOPaint (pinned version for stability)
RUN pip install --no-cache-dir iopaint==1.5.1

# Pre-download the LaMa model at build time so first request is fast.
# LaMa is a small model (~200MB) — fits Railway free tier easily.
RUN iopaint download --model lama --model-dir /models || true

# Railway injects $PORT — IOPaint needs to bind there.
ENV IOPAINT_HOST=0.0.0.0
ENV IOPAINT_MODEL=lama
ENV IOPAINT_MODEL_DIR=/models
ENV IOPAINT_DEVICE=cpu

EXPOSE 8080

# Start IOPaint with the REST API enabled. No webui auth (Railway private).
CMD iopaint start \
    --model=$IOPAINT_MODEL \
    --model-dir=$IOPAINT_MODEL_DIR \
    --device=$IOPAINT_DEVICE \
    --host=$IOPAINT_HOST \
    --port=${PORT:-8080}
