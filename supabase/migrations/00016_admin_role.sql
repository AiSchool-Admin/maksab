-- Add admin role to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Create admin analytics view for fast dashboard queries
CREATE OR REPLACE VIEW admin_stats_overview AS
SELECT
  (SELECT COUNT(*) FROM public.profiles) AS total_users,
  (SELECT COUNT(*) FROM public.profiles WHERE seller_type = 'individual') AS individual_users,
  (SELECT COUNT(*) FROM public.profiles WHERE seller_type = 'store') AS store_users,
  (SELECT COUNT(*) FROM public.profiles WHERE created_at >= NOW() - INTERVAL '24 hours') AS new_users_today,
  (SELECT COUNT(*) FROM public.profiles WHERE created_at >= NOW() - INTERVAL '7 days') AS new_users_week,
  (SELECT COUNT(*) FROM public.profiles WHERE created_at >= NOW() - INTERVAL '30 days') AS new_users_month,
  (SELECT COUNT(*) FROM ads) AS total_ads,
  (SELECT COUNT(*) FROM ads WHERE status = 'active') AS active_ads,
  (SELECT COUNT(*) FROM ads WHERE status = 'sold') AS sold_ads,
  (SELECT COUNT(*) FROM ads WHERE created_at >= NOW() - INTERVAL '24 hours') AS new_ads_today,
  (SELECT COUNT(*) FROM ads WHERE created_at >= NOW() - INTERVAL '7 days') AS new_ads_week,
  (SELECT COALESCE(SUM(price), 0) FROM ads WHERE status = 'sold' AND price IS NOT NULL) AS total_sold_value,
  (SELECT COALESCE(SUM(views_count), 0) FROM ads) AS total_views,
  (SELECT COUNT(*) FROM stores WHERE status = 'active') AS total_stores,
  (SELECT COUNT(*) FROM conversations) AS total_conversations,
  (SELECT COUNT(*) FROM messages) AS total_messages;
