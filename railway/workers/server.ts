/**
 * ⚠️ TEMPORARY TEST SERVER
 * This file adds a simple HTTP server with a /test-dubizzle endpoint
 * to verify Railway can fetch from dubizzle.
 * DELETE THIS FILE after testing is complete.
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';

const PORT = parseInt(process.env.PORT || '3000', 10);

async function handleTestDubizzle(_req: IncomingMessage, res: ServerResponse) {
  const url = 'https://www.dubizzle.com.eg/ar/mobiles-tablets/mobile-phones/alexandria/';

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ar,en;q=0.5',
      },
      signal: AbortSignal.timeout(15000),
    });

    const html = await response.text();

    if (!response.ok) {
      sendJson(res, {
        status: response.status,
        success: false,
        message: `Railway محظور من دوبيزل (HTTP ${response.status})`,
        htmlSnippet: html.substring(0, 500),
      });
      return;
    }

    // Count articles/listings — dubizzle uses <article> or aria-label="Listing"
    const articleMatches = html.match(/<article[\s>]/gi) || [];
    const listingMatches = html.match(/aria-label="Listing"/gi) || [];
    const articleCount = Math.max(articleMatches.length, listingMatches.length);

    // Try to extract first title
    let firstTitle: string | null = null;
    const titleMatch = html.match(/aria-label="Listing"[^>]*>[\s\S]*?<h2[^>]*>(.*?)<\/h2>/i);
    if (titleMatch) {
      firstTitle = titleMatch[1].replace(/<[^>]*>/g, '').trim();
    }
    if (!firstTitle) {
      const h2Match = html.match(/<h2[^>]*class="[^"]*"[^>]*>(.*?)<\/h2>/i);
      if (h2Match) {
        firstTitle = h2Match[1].replace(/<[^>]*>/g, '').trim();
      }
    }

    sendJson(res, {
      status: response.status,
      htmlLength: html.length,
      hasArticles: articleCount > 0,
      articleCount,
      firstTitle: firstTitle || '(لم يتم استخراج عنوان)',
      success: true,
      message: 'Railway يقدر يجلب من دوبيزل! ✅',
    });
  } catch (error: any) {
    sendJson(res, {
      status: 0,
      success: false,
      message: `خطأ في الاتصال: ${error.message}`,
      errorType: error.name,
    });
  }
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
