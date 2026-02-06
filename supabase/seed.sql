-- ============================================
-- مكسب (Maksab) — Complete Seed Data
-- Run after all migrations
-- ============================================

-- Load categories & subcategories first (referenced by ads)
\i seed_categories.sql

-- Load Egyptian governorates & cities
\i seed_governorates_cities.sql
