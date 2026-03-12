-- Fix seller names: remove "User photo" prefix and duplicate first character

-- 1. Fix ahe_listings seller_name
UPDATE ahe_listings
SET seller_name = TRIM(REGEXP_REPLACE(seller_name, '^User\s*photo', '', 'i'))
WHERE seller_name ILIKE 'User photo%';

-- 2. Fix ahe_sellers name
UPDATE ahe_sellers
SET name = TRIM(REGEXP_REPLACE(name, '^User\s*photo', '', 'i'))
WHERE name ILIKE 'User photo%';

-- 3. Fix duplicate first character in ahe_listings (e.g. "TTaha" → "Taha", "ممحمد" → "محمد")
UPDATE ahe_listings
SET seller_name = SUBSTRING(seller_name FROM 2)
WHERE LENGTH(seller_name) > 2
  AND LEFT(seller_name, 1) = SUBSTRING(seller_name, 2, 1)
  AND seller_name !~ '^[0-9]';

-- 4. Fix duplicate first character in ahe_sellers
UPDATE ahe_sellers
SET name = SUBSTRING(name FROM 2)
WHERE LENGTH(name) > 2
  AND LEFT(name, 1) = SUBSTRING(name, 2, 1)
  AND name !~ '^[0-9]';

-- 5. Null out names that are too short after cleanup
UPDATE ahe_listings SET seller_name = NULL WHERE LENGTH(TRIM(seller_name)) < 2;
UPDATE ahe_sellers SET name = NULL WHERE LENGTH(TRIM(name)) < 2;
