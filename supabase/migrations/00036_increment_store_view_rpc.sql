-- RPC function to properly increment store analytics views
-- instead of overwriting with upsert
CREATE OR REPLACE FUNCTION increment_store_view(
  p_store_id UUID,
  p_date DATE
) RETURNS VOID AS $$
BEGIN
  INSERT INTO store_analytics (store_id, date, total_views, unique_visitors, source_direct)
  VALUES (p_store_id, p_date, 1, 1, 1)
  ON CONFLICT (store_id, date)
  DO UPDATE SET
    total_views = store_analytics.total_views + 1,
    source_direct = store_analytics.source_direct + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
