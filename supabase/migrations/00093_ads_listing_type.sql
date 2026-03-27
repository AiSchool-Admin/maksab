-- Add listing_type to ads table (sale/rent — separate from sale_type which is cash/auction/exchange)
ALTER TABLE ads ADD COLUMN IF NOT EXISTS listing_type TEXT DEFAULT 'sale';
