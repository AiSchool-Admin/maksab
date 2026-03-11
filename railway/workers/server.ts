/**
 * ⚠️ TEMPORARY TEST SERVER
 * This file adds a simple HTTP server with a /test-dubizzle endpoint
 * to verify Railway can fetch from dubizzle.
 * DELETE THIS FILE after testing is complete.
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';

const PORT = parseInt(process.env.PORT || '3000', 10);

async function handleTestDubizzle(_req: IncomingMessage, res: ServerResponse) {
  const urls = [
    'https://www.dubizzle.com.eg/mobile-phones-tablets-accessories-numbers/mobile-phones/alexandria/',
    'https://www.dubizzle.com.eg/ar/mobile-phones-tablets-accessories-numbers/mobile-phones/alexandria/',
    'https://www.dubizzle.com.eg/en/mobile-phones-tablets-accessories-numbers/mobile-phones/alexandria/',
    'https://dubizzle.com.eg/mobile-phones-tablets-accessories-numbers/mobile-phones/alexandria/',
    'https://www.dubizzle.com.eg/',
  ];

  const results: Record<string, any>[] = [];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'ar,en;q=0.9',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
      });

      const html = await response.text();
      const articleCount = (html.match(/<article/g) || []).length;

      results.push({
        url,
        status: response.status,
        redirected: response.redirected,
        finalUrl: response.url,
        htmlLength: html.length,
        hasArticles: articleCount > 0,
        articleCount,
        snippet: html.substring(0, 300),
      });
    } catch (error: any) {
      results.push({
        url,
        error: error.message,
      });
    }
  }

  sendJson(res, {
    message: 'Dubizzle URL Test from Railway',
    railwayRegion: process.env.RAILWAY_REGION || 'unknown',
    results,
  });
}

function sendJson(res: ServerResponse, data: Record<string, any>) {
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data, null, 2));
}

// Start HTTP server
const server = createServer(async (req, res) => {
  const path = req.url?.split('?')[0];

  if (path === '/test-dubizzle') {
    await handleTestDubizzle(req, res);
  } else if (path === '/health') {
    sendJson(res, { ok: true, timestamp: new Date().toISOString() });
  } else {
    sendJson(res, {
      message: 'مكسب Workers Server',
      endpoints: ['/test-dubizzle', '/health'],
    });
  }
});

server.listen(PORT, () => {
  console.log(`[Server] HTTP server running on port ${PORT}`);
  console.log(`[Server] Test endpoint: /test-dubizzle`);
});

// Also start the auction cron worker
console.log('[Server] Starting auction cron worker...');
import('./auction-cron.ts').catch((err) => {
  console.error('[Server] Failed to start auction cron:', err.message);
  // Don't crash — the test endpoint should still work
});
