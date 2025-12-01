DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'marketplace_listings'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE marketplace_listings;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'marketplace_purchases'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE marketplace_purchases;
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS update_marketplace_listings_updated_at() CASCADE;
DROP FUNCTION IF EXISTS check_component_is_private() CASCADE;
DROP FUNCTION IF EXISTS increment_listing_sales(UUID) CASCADE;
DROP FUNCTION IF EXISTS calculate_available_earnings(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_pending_earnings_to_available() CASCADE;

DROP TABLE IF EXISTS marketplace_earnings CASCADE;
DROP TABLE IF EXISTS marketplace_payouts CASCADE;
DROP TABLE IF EXISTS marketplace_purchases CASCADE;
DROP TABLE IF EXISTS marketplace_listings CASCADE;
DROP TABLE IF EXISTS marketplace_categories CASCADE;

DROP SEQUENCE IF EXISTS marketplace_categories_id_seq CASCADE;

ALTER TABLE users
  DROP COLUMN IF EXISTS stripe_account_id,
  DROP COLUMN IF EXISTS stripe_account_status,
  DROP COLUMN IF EXISTS stripe_onboarding_completed,
  DROP COLUMN IF EXISTS stripe_payouts_enabled,
  DROP COLUMN IF EXISTS stripe_charges_enabled;

DROP INDEX IF EXISTS idx_users_stripe_account_id;


