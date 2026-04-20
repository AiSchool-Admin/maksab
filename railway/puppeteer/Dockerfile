FROM node:20-slim

RUN apt-get update && apt-get install -y \
  chromium \
  fonts-noto-color-emoji \
  fonts-noto-cjk \
  fonts-noto \
  --no-install-recommends && \
  rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV CHROME_BIN=/usr/bin/chromium

WORKDIR /app

COPY railway/puppeteer/package.json ./
RUN npm install --production

COPY railway/puppeteer/ ./

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3001) + '/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))" || exit 1

CMD ["node_modules/.bin/tsx", "server.ts"]
