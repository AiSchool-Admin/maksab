FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY railway/package.json railway/package-lock.json* ./
RUN npm install --production

# Copy worker scripts
COPY railway/workers/ ./workers/

# Health check - the process stays alive via setInterval
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "process.exit(0)" || exit 1

# Start the auction cron worker using locally installed tsx
CMD ["node_modules/.bin/tsx", "workers/auction-cron.ts"]
