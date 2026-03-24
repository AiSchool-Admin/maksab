-- ═══════════════════════════════════════════════════════════════
-- مكسب — إيقاف مؤقت لـ hatla2ee الإسكندرية
-- السبب: الموقع بيحجب Vercel و Railway IPs تماماً (403)
-- الحل المستقبلي: استخدام proxy (ScraperAPI / BrightData)
-- ═══════════════════════════════════════════════════════════════

UPDATE ahe_scopes
SET is_paused = true,
    server_fetch_blocked = true,
    server_fetch_blocked_at = NOW()
WHERE code = 'HAT-CAR-ALEX';
