-- Fix foreign key relationships in marketplace tables
-- The issue is that seller_id references auth.users(id) but we need to join with users table

-- Drop existing foreign key constraints
ALTER TABLE marketplace_listings DROP CONSTRAINT marketplace_listings_seller_id_fkey;
ALTER TABLE marketplace_purchases DROP CONSTRAINT marketplace_purchases_buyer_id_fkey;
ALTER TABLE marketplace_purchases DROP CONSTRAINT marketplace_purchases_seller_id_fkey;
ALTER TABLE marketplace_earnings DROP CONSTRAINT marketplace_earnings_seller_id_fkey;

-- Add correct foreign key constraints to users table (not auth.users)
ALTER TABLE marketplace_listings ADD CONSTRAINT marketplace_listings_seller_id_fkey
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE marketplace_purchases ADD CONSTRAINT marketplace_purchases_buyer_id_fkey
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE marketplace_purchases ADD CONSTRAINT marketplace_purchases_seller_id_fkey
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE marketplace_earnings ADD CONSTRAINT marketplace_earnings_seller_id_fkey
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE;