CREATE TABLE IF NOT EXISTS custom_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain text NOT NULL,
  verification_token text NOT NULL,
  verification_method text NOT NULL DEFAULT 'dns',
  is_verified boolean DEFAULT false,
  verified_at timestamp with time zone,
  ssl_status text DEFAULT 'pending',
  ssl_certificate_id text,
  ssl_issued_at timestamp with time zone,
  ssl_expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(domain),
  UNIQUE(chat_id)
);

CREATE INDEX idx_custom_domains_chat_id ON custom_domains(chat_id);
CREATE INDEX idx_custom_domains_user_id ON custom_domains(user_id);
CREATE INDEX idx_custom_domains_domain ON custom_domains(domain);
CREATE INDEX idx_custom_domains_verified ON custom_domains(is_verified);

CREATE OR REPLACE FUNCTION update_custom_domains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_custom_domains_updated_at_trigger
  BEFORE UPDATE ON custom_domains
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_domains_updated_at();

CREATE OR REPLACE FUNCTION validate_custom_domain()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.domain IS NOT NULL THEN
    IF NEW.domain !~ '^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$' THEN
      RAISE EXCEPTION 'Invalid domain format. Must be a valid domain name (e.g., example.com or subdomain.example.com)';
    END IF;

    IF NEW.domain ~ '\s' THEN
      RAISE EXCEPTION 'Domain cannot contain spaces';
    END IF;

    IF LENGTH(NEW.domain) > 253 THEN
      RAISE EXCEPTION 'Domain name too long (max 253 characters)';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_custom_domain_before_insert_or_update
  BEFORE INSERT OR UPDATE ON custom_domains
  FOR EACH ROW
  EXECUTE FUNCTION validate_custom_domain();

COMMENT ON TABLE custom_domains IS 'Custom domains configured by users for their deployed applications';
COMMENT ON COLUMN custom_domains.domain IS 'The custom domain (e.g., app.example.com)';
COMMENT ON COLUMN custom_domains.verification_token IS 'Unique token for DNS verification';
COMMENT ON COLUMN custom_domains.verification_method IS 'Method used for domain verification (dns, file)';
COMMENT ON COLUMN custom_domains.is_verified IS 'Whether the domain ownership has been verified';
COMMENT ON COLUMN custom_domains.ssl_status IS 'Status of SSL certificate (pending, active, expired, failed)';
COMMENT ON COLUMN custom_domains.ssl_certificate_id IS 'Reference to the SSL certificate';

ALTER TABLE custom_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own custom domains"
  ON custom_domains FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own custom domains"
  ON custom_domains FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom domains"
  ON custom_domains FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom domains"
  ON custom_domains FOR DELETE
  USING (auth.uid() = user_id);

