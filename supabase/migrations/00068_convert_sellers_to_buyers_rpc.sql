-- RPC function: convert sellers (with phones) to buyers in bhe_buyers
-- Called hourly by Railway cron worker
-- Skips sellers already in bhe_buyers (by phone)

CREATE OR REPLACE FUNCTION convert_sellers_to_buyers()
RETURNS INTEGER AS $$
DECLARE
  inserted INTEGER;
BEGIN
  INSERT INTO bhe_buyers (source, source_platform, buyer_name, buyer_phone,
    buyer_profile_url, product_wanted, category, governorate,
    buyer_tier, buyer_score, pipeline_status)
  SELECT DISTINCT ON (phone) 'seller_is_buyer',
    COALESCE(source_platform, 'dubizzle'), name, phone, profile_url,
    'ترقية — بائع نشط', primary_category, primary_governorate,
    CASE WHEN total_listings_seen <= 3 THEN 'hot_buyer' ELSE 'warm_buyer' END,
    CASE WHEN total_listings_seen <= 3 THEN 80 ELSE 50 END,
    'phone_found'
  FROM ahe_sellers
  WHERE phone IS NOT NULL
  AND phone NOT IN (
    SELECT buyer_phone FROM bhe_buyers
    WHERE buyer_phone IS NOT NULL
  )
  LIMIT 500;

  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END;
$$ LANGUAGE plpgsql;
