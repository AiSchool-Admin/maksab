-- Clean garbage text from buyer/seller names
UPDATE bhe_buyers
SET buyer_name = NULL
WHERE buyer_name LIKE '%مكالمة%'
   OR buyer_name LIKE '%المحادثه%';

UPDATE ahe_sellers
SET name = NULL
WHERE name LIKE '%مكالمة%'
   OR name LIKE '%المحادثه%';
