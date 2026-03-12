FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY railway/package.json railway/package-lock.json* ./
RUN npm install --production

# Copy worker scripts
COPY railway/workers/ ./workers/

# Health check - verify HTTP server is responsive
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3000) + '/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))" || exit 1

# Start the server (HTTP endpoints + auction cron worker)
CMD ["node_modules/.bin/tsx", "workers/server.ts"]
