-- Allow free templates by changing price constraint from > 0 to >= 0
ALTER TABLE marketplace_listings DROP CONSTRAINT IF EXISTS marketplace_listings_price_cents_check;
ALTER TABLE marketplace_listings ADD CONSTRAINT marketplace_listings_price_cents_check CHECK (price_cents >= 0);

-- Add index to quickly find free vs paid templates
CREATE INDEX idx_marketplace_listings_price_type ON marketplace_listings(price_cents) WHERE price_cents = 0;
CREATE INDEX idx_marketplace_listings_paid ON marketplace_listings(price_cents) WHERE price_cents > 0;

