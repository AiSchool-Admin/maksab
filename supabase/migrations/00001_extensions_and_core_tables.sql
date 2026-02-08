-- ============================================
-- Migration 001: Extensions + Core Tables
-- مكسب (Maksab) — Egyptian Marketplace
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;       -- Fuzzy text matching
CREATE EXTENSION IF NOT EXISTS unaccent;      -- Accent-insensitive search

-- ============================================
-- Users table (extends Supabase auth.users)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone VARCHAR(11) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  avatar_url TEXT,
  governorate VARCHAR(50),
  city VARCHAR(100),
  bio TEXT,
  is_commission_supporter BOOLEAN DEFAULT FALSE,
  total_ads_count INTEGER DEFAULT 0,
  rating DECIMAL(2,1) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for phone lookups
CREATE INDEX idx_users_phone ON public.profiles(phone);
-- Index for location-based queries
CREATE INDEX idx_users_location ON public.profiles(governorate, city);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Categories
-- ============================================
CREATE TABLE categories (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(10),
  slug VARCHAR(50) UNIQUE NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_sort ON categories(sort_order);

-- ============================================
-- Subcategories
-- ============================================
CREATE TABLE subcategories (
  id VARCHAR(50) PRIMARY KEY,
  category_id VARCHAR(50) NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(category_id, slug)
);

CREATE INDEX idx_subcategories_category ON subcategories(category_id);

-- ============================================
-- Governorates (المحافظات)
-- ============================================
CREATE TABLE governorates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  name_en VARCHAR(50)
);

CREATE INDEX idx_governorates_name ON governorates(name);

-- ============================================
-- Cities (المدن)
-- ============================================
CREATE TABLE cities (
  id SERIAL PRIMARY KEY,
  governorate_id INTEGER NOT NULL REFERENCES governorates(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100)
);

CREATE INDEX idx_cities_governorate ON cities(governorate_id);
CREATE INDEX idx_cities_name ON cities(name);
