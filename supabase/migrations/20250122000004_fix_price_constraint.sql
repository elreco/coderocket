-- Fix the price constraint to allow free templates
ALTER TABLE marketplace_listings DROP CONSTRAINT IF EXISTS marketplace_listings_price_cents_check;
ALTER TABLE marketplace_listings ADD CONSTRAINT marketplace_listings_price_cents_check CHECK (price_cents >= 0);

-- Re-grant permissions for increment_listing_sales function
GRANT EXECUTE ON FUNCTION increment_listing_sales(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_listing_sales(UUID) TO anon;
