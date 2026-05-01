-- Create marketplace categories table
CREATE TABLE marketplace_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  slug VARCHAR(100) NOT NULL UNIQUE,
  icon VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create marketplace listings table
CREATE TABLE marketplace_listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 0,
  category_id INTEGER NOT NULL REFERENCES marketplace_categories(id),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
  preview_image_url TEXT,
  demo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  total_sales INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Ensure that only private components can be listed
  CONSTRAINT unique_chat_version UNIQUE(chat_id, version)
);

-- Create marketplace purchases table
CREATE TABLE marketplace_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  purchased_chat_id UUID REFERENCES chats(id) ON DELETE SET NULL, -- The new chat created for buyer
  price_paid_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
  platform_commission_cents INTEGER NOT NULL, -- 30% commission
  seller_earning_cents INTEGER NOT NULL,
  stripe_payment_intent_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Prevent duplicate purchases
  CONSTRAINT unique_buyer_listing UNIQUE(buyer_id, listing_id)
);

-- Create marketplace earnings table for seller tracking
CREATE TABLE marketplace_earnings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purchase_id UUID NOT NULL REFERENCES marketplace_purchases(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'available', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  payout_date TIMESTAMP WITH TIME ZONE
);

-- Insert default categories
INSERT INTO marketplace_categories (name, description, slug, icon) VALUES
('Landing Page', 'Complete landing pages with hero sections, features, and call-to-actions', 'landing-page', 'layout'),
('Component', 'Reusable UI components like buttons, forms, cards, and navigation elements', 'component', 'puzzle'),
('Email Template', 'Responsive email templates for newsletters, marketing campaigns, and notifications', 'email-template', 'mail'),
('Web Template', 'Full website templates including multiple pages and sections', 'web-template', 'globe'),
('Mobile Template', 'Mobile-first designs and responsive components optimized for mobile devices', 'mobile-template', 'smartphone'),
('Dashboard', 'Admin panels, analytics dashboards, and data visualization interfaces', 'dashboard', 'bar-chart'),
('E-commerce', 'Online store components including product listings, carts, and checkout flows', 'ecommerce', 'shopping-cart'),
('Blog Template', 'Blog layouts, article pages, and content management interfaces', 'blog-template', 'edit'),
('Authentication', 'Login forms, registration pages, and user authentication interfaces', 'authentication', 'shield'),
('Portfolio', 'Portfolio websites and personal branding pages for creatives and professionals', 'portfolio', 'user');

-- Row Level Security Policies

-- Marketplace Categories (public read)
ALTER TABLE marketplace_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for categories" ON marketplace_categories
  FOR SELECT USING (true);

-- Marketplace Listings
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;

-- Anyone can view active listings
CREATE POLICY "Public read access for active listings" ON marketplace_listings
  FOR SELECT USING (is_active = true);

-- Only sellers can manage their own listings
CREATE POLICY "Sellers can manage own listings" ON marketplace_listings
  FOR ALL USING (auth.uid() = seller_id);

-- Marketplace Purchases
ALTER TABLE marketplace_purchases ENABLE ROW LEVEL SECURITY;

-- Buyers can see their own purchases
CREATE POLICY "Buyers can view own purchases" ON marketplace_purchases
  FOR SELECT USING (auth.uid() = buyer_id);

-- Sellers can see purchases of their listings
CREATE POLICY "Sellers can view purchases of own listings" ON marketplace_purchases
  FOR SELECT USING (auth.uid() = seller_id);

-- System can insert purchases (handled by server-side functions)
CREATE POLICY "System can insert purchases" ON marketplace_purchases
  FOR INSERT WITH CHECK (true);

-- Marketplace Earnings
ALTER TABLE marketplace_earnings ENABLE ROW LEVEL SECURITY;

-- Sellers can view their own earnings
CREATE POLICY "Sellers can view own earnings" ON marketplace_earnings
  FOR SELECT USING (auth.uid() = seller_id);

-- Functions and Triggers

-- Function to update marketplace_listings updated_at
CREATE OR REPLACE FUNCTION update_marketplace_listings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for marketplace_listings
CREATE TRIGGER update_marketplace_listings_updated_at
  BEFORE UPDATE ON marketplace_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_listings_updated_at();

-- Function to ensure only private components can be listed
CREATE OR REPLACE FUNCTION check_component_is_private()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the component is private
  IF EXISTS (SELECT 1 FROM chats WHERE id = NEW.chat_id AND is_private = false) THEN
    RAISE EXCEPTION 'Only private components can be listed on the marketplace';
  END IF;

  -- Check if user is premium (has active subscription)
  IF NOT EXISTS (
    SELECT 1 FROM subscriptions
    WHERE user_id = NEW.seller_id
    AND status IN ('trialing', 'active')
  ) THEN
    RAISE EXCEPTION 'Only premium users can list components on the marketplace';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate marketplace listings
CREATE TRIGGER validate_marketplace_listing
  BEFORE INSERT OR UPDATE ON marketplace_listings
  FOR EACH ROW
  EXECUTE FUNCTION check_component_is_private();

-- Add indexes for performance
CREATE INDEX idx_marketplace_listings_category ON marketplace_listings(category_id);
CREATE INDEX idx_marketplace_listings_seller ON marketplace_listings(seller_id);
CREATE INDEX idx_marketplace_listings_active ON marketplace_listings(is_active);
CREATE INDEX idx_marketplace_listings_created_at ON marketplace_listings(created_at DESC);
CREATE INDEX idx_marketplace_purchases_buyer ON marketplace_purchases(buyer_id);
CREATE INDEX idx_marketplace_purchases_seller ON marketplace_purchases(seller_id);
CREATE INDEX idx_marketplace_purchases_listing ON marketplace_purchases(listing_id);
CREATE INDEX idx_marketplace_earnings_seller ON marketplace_earnings(seller_id);

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE marketplace_listings;
ALTER PUBLICATION supabase_realtime ADD TABLE marketplace_purchases;

-- Function to increment listing sales count
CREATE OR REPLACE FUNCTION increment_listing_sales(listing_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE marketplace_listings
  SET total_sales = total_sales + 1,
      updated_at = timezone('utc'::text, now())
  WHERE id = listing_id_param;
END;
$$ LANGUAGE plpgsql;