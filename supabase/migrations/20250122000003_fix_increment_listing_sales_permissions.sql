-- Grant execute permission to authenticated users for increment_listing_sales function
GRANT EXECUTE ON FUNCTION increment_listing_sales(UUID) TO authenticated;

-- Also grant to anon users in case they need to use it
GRANT EXECUTE ON FUNCTION increment_listing_sales(UUID) TO anon;
