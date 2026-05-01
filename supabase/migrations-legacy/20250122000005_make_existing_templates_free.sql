-- Make all existing templates free (set price_cents to 0)
UPDATE marketplace_listings
SET price_cents = 0,
    updated_at = timezone('utc'::text, now())
WHERE price_cents > 0;

-- Update any existing purchases to reflect the free price
UPDATE marketplace_purchases
SET price_paid_cents = 0,
    platform_commission_cents = 0,
    seller_earning_cents = 0
WHERE price_paid_cents > 0;

-- Update any existing earnings records to reflect no earnings from free templates
UPDATE marketplace_earnings
SET amount_cents = 0
WHERE amount_cents > 0;

-- Add a comment to track this migration
COMMENT ON TABLE marketplace_listings IS 'All existing templates have been converted to free templates as of 2025-01-22';
