-- ══════════════════════════════════════════════
-- Migration 00098: Fix Dubizzle scope URLs
-- Remove subcategory filters to get ALL vehicles and ALL properties
-- ══════════════════════════════════════════════

-- Cars: was /vehicles/cars/for-sale/alexandria/ → now /vehicles/alexandria/
UPDATE ahe_scopes
SET base_url = 'https://www.dubizzle.com.eg/vehicles/alexandria/',
    updated_at = NOW()
WHERE code = 'DUB-CAR-ALEX';

-- Properties: was /properties/apartments-duplex/for-sale/alexandria/ → now /properties/alexandria/
UPDATE ahe_scopes
SET base_url = 'https://www.dubizzle.com.eg/properties/alexandria/',
    updated_at = NOW()
WHERE code = 'DUB-PROP-ALEX';
