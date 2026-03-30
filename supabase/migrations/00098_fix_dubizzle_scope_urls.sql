-- ══════════════════════════════════════════════
-- Migration 00098: Fix scope URLs — remove subcategory filters
-- ══════════════════════════════════════════════

-- Dubizzle Cars: /vehicles/cars-for-sale/?location=alexandria → /vehicles/alexandria/
UPDATE ahe_scopes
SET base_url = 'https://www.dubizzle.com.eg/vehicles/alexandria/',
    updated_at = NOW()
WHERE code = 'DUB-CAR-ALEX';

-- Dubizzle Properties: /properties/?location=alexandria → /properties/alexandria/
UPDATE ahe_scopes
SET base_url = 'https://www.dubizzle.com.eg/properties/alexandria/',
    updated_at = NOW()
WHERE code = 'DUB-PROP-ALEX';

-- OLX Cars: /cars/alexandria/ → /vehicles/alexandria/
UPDATE ahe_scopes
SET base_url = 'https://www.olx.com.eg/en/vehicles/alexandria/',
    updated_at = NOW()
WHERE code = 'OLX-CAR-ALEX';
