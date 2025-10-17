CREATE TABLE ekinox_waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_ekinox_waitlist_email ON ekinox_waitlist(email);
CREATE INDEX idx_ekinox_waitlist_created_at ON ekinox_waitlist(created_at DESC);

ALTER TABLE ekinox_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert" ON ekinox_waitlist
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read" ON ekinox_waitlist
  FOR SELECT
  TO authenticated
  USING (true);

