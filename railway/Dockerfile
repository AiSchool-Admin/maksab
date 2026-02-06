FROM node:20-slim

WORKDIR /app

# Copy package files
COPY railway/package.json ./
RUN npm install

# Copy worker scripts
COPY railway/workers/ ./workers/

# Start the auction cron worker
CMD ["npx", "tsx", "workers/auction-cron.ts"]
