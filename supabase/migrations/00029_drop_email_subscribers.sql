-- Drop email subscribers table and related objects
DROP POLICY IF EXISTS "email_subscribe_insert" ON public.email_subscribers;
DROP INDEX IF EXISTS idx_email_subscribers_active;
DROP TABLE IF EXISTS public.email_subscribers;
