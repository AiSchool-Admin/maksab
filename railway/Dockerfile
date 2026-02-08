FROM node:20-slim

WORKDIR /app

# Copy package files and install
COPY railway/package.json ./
RUN npm install

# Copy worker scripts
COPY railway/workers/ ./workers/

# Health check - the process stays alive via setInterval
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD pgrep -f "auction-cron" || exit 1

# Start the auction cron worker
CMD ["npx", "tsx", "workers/auction-cron.ts"]
