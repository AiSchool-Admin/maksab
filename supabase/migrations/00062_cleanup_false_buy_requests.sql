-- Cleanup: Remove false-positive buy requests from bhe_buyers
-- The old detection used pageText.includes('مطلوب للشراء') which matched
-- navigation/filter elements, not the actual "نوع الإعلان" field.
-- All 'dubizzle_wanted' entries are suspect — delete them.
-- After this, the fixed harvester will re-detect real buy requests correctly.

DELETE FROM bhe_buyers WHERE source = 'dubizzle_wanted';

-- Reset is_buy_request flags — the next harvest will re-classify correctly
UPDATE ahe_listings SET is_buy_request = false WHERE is_buy_request = true;
