-- ═══════════════════════════════════════════════════════════
-- Migration 00075: Seller dedup + active_listings fix
-- ═══════════════════════════════════════════════════════════

-- 1. Add alternate_phones column for sellers with multiple phone numbers
ALTER TABLE ahe_sellers
  ADD COLUMN IF NOT EXISTS alternate_phones TEXT[] DEFAULT '{}';

-- 2. Create index for name-based dedup lookups
CREATE INDEX IF NOT EXISTS idx_ahe_sellers_name_platform_gov
  ON ahe_sellers(name, source_platform, primary_governorate)
  WHERE name IS NOT NULL AND name != '';

-- 3. Function to merge duplicate sellers by name
--    Keeps the seller with the highest whale_score, merges phones & listings counts
CREATE OR REPLACE FUNCTION merge_duplicate_sellers()
RETURNS TABLE(
  merged_name TEXT,
  kept_id UUID,
  removed_ids UUID[],
  phones_collected TEXT[]
) AS $$
DECLARE
  dup RECORD;
  keep_id UUID;
  remove_ids UUID[];
  all_phones TEXT[];
  r RECORD;
BEGIN
  -- Find duplicates: same name, at least 3 chars
  FOR dup IN
    SELECT s.name, array_agg(s.id ORDER BY s.whale_score DESC, s.total_listings_seen DESC, s.created_at ASC) AS ids
    FROM ahe_sellers s
    WHERE s.name IS NOT NULL AND length(s.name) >= 3
    GROUP BY s.name
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
  LOOP
    -- Keep the first (highest score)
    keep_id := dup.ids[1];
    remove_ids := dup.ids[2:];
    all_phones := '{}';

    -- Collect all phones from all records
    FOR r IN
      SELECT phone, alternate_phones, total_listings_seen
      FROM ahe_sellers WHERE id = ANY(dup.ids)
    LOOP
      IF r.phone IS NOT NULL THEN
        all_phones := array_append(all_phones, r.phone);
      END IF;
      IF r.alternate_phones IS NOT NULL THEN
        all_phones := all_phones || r.alternate_phones;
      END IF;
    END LOOP;

    -- Deduplicate phones
    SELECT array_agg(DISTINCT p) INTO all_phones FROM unnest(all_phones) p WHERE p IS NOT NULL;

    -- Update the kept record: sum listings, merge phones
    UPDATE ahe_sellers SET
      total_listings_seen = (
        SELECT COALESCE(SUM(total_listings_seen), 0) FROM ahe_sellers WHERE id = ANY(dup.ids)
      ),
      alternate_phones = CASE
        WHEN array_length(all_phones, 1) > 1 THEN all_phones[2:]
        ELSE '{}'
      END,
      phone = COALESCE(
        (SELECT phone FROM ahe_sellers WHERE id = keep_id AND phone IS NOT NULL),
        all_phones[1]
      ),
      updated_at = NOW()
    WHERE id = keep_id;

    -- Re-link listings from removed sellers to kept seller
    UPDATE ahe_listings SET ahe_seller_id = keep_id
    WHERE ahe_seller_id = ANY(remove_ids);

    -- Delete the duplicates
    DELETE FROM ahe_sellers WHERE id = ANY(remove_ids);

    merged_name := dup.name;
    kept_id := keep_id;
    removed_ids := remove_ids;
    phones_collected := all_phones;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to refresh active_listings count from actual ahe_listings
CREATE OR REPLACE FUNCTION refresh_seller_active_listings(p_seller_id UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  IF p_seller_id IS NOT NULL THEN
    -- Update single seller
    UPDATE ahe_sellers s SET
      active_listings = (
        SELECT COUNT(*) FROM ahe_listings l
        WHERE l.ahe_seller_id = s.id
      ),
      updated_at = NOW()
    WHERE s.id = p_seller_id;
    GET DIAGNOSTICS updated_count = ROW_COUNT;
  ELSE
    -- Update all sellers
    UPDATE ahe_sellers s SET
      active_listings = sub.cnt,
      updated_at = NOW()
    FROM (
      SELECT ahe_seller_id, COUNT(*) AS cnt
      FROM ahe_listings
      WHERE ahe_seller_id IS NOT NULL
      GROUP BY ahe_seller_id
    ) sub
    WHERE s.id = sub.ahe_seller_id
      AND s.active_listings != sub.cnt;
    GET DIAGNOSTICS updated_count = ROW_COUNT;
  END IF;

  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
