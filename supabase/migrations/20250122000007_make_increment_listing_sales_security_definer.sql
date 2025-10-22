CREATE OR REPLACE FUNCTION increment_listing_sales(listing_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM marketplace_listings WHERE id = listing_id_param) THEN
    RAISE EXCEPTION 'Listing with id % not found', listing_id_param;
  END IF;

  UPDATE marketplace_listings
  SET total_sales = COALESCE(total_sales, 0) + 1,
      updated_at = timezone('utc'::text, now())
  WHERE id = listing_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update listing with id %', listing_id_param;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_listing_sales(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_listing_sales(UUID) TO anon;

