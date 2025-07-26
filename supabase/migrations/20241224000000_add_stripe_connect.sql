-- Add Stripe Connect account tracking for marketplace sellers
ALTER TABLE users ADD COLUMN stripe_account_id TEXT;
ALTER TABLE users ADD COLUMN stripe_account_status TEXT CHECK (stripe_account_status IN ('pending', 'restricted', 'enabled'));
ALTER TABLE users ADD COLUMN stripe_onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN stripe_payouts_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN stripe_charges_enabled BOOLEAN DEFAULT FALSE;

-- Add payout tracking table
CREATE TABLE marketplace_payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
  stripe_payout_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'paid', 'failed', 'canceled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  arrival_date TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,

  -- Track which earnings were included in this payout
  earnings_ids UUID[] NOT NULL
);

-- Add indexes for performance
CREATE INDEX idx_users_stripe_account_id ON users(stripe_account_id);
CREATE INDEX idx_marketplace_payouts_seller_id ON marketplace_payouts(seller_id);
CREATE INDEX idx_marketplace_payouts_status ON marketplace_payouts(status);

-- Add function to calculate available earnings for payout
CREATE OR REPLACE FUNCTION calculate_available_earnings(seller_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  total_earnings INTEGER := 0;
BEGIN
  SELECT COALESCE(SUM(amount_cents), 0)
  INTO total_earnings
  FROM marketplace_earnings
  WHERE seller_id = seller_uuid
    AND status = 'available'
    AND id NOT IN (
      SELECT UNNEST(earnings_ids)
      FROM marketplace_payouts
      WHERE seller_id = seller_uuid
        AND status IN ('pending', 'in_transit', 'paid')
    );

  RETURN total_earnings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to update earnings status from pending to available after 7 days
CREATE OR REPLACE FUNCTION update_pending_earnings_to_available()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE marketplace_earnings
  SET status = 'available'
  WHERE status = 'pending'
    AND created_at < (NOW() - INTERVAL '7 days');

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;