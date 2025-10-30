ALTER TABLE chats
ADD COLUMN deploy_subdomain text UNIQUE,
ADD COLUMN deployed_at timestamp with time zone,
ADD COLUMN deployed_version integer,
ADD COLUMN is_deployed boolean DEFAULT false;

CREATE INDEX idx_chats_deploy_subdomain ON chats(deploy_subdomain);

CREATE OR REPLACE FUNCTION check_reserved_subdomains()
RETURNS TRIGGER AS $$
DECLARE
  reserved_words text[] := ARRAY[
    'www', 'api', 'app', 'admin', 'dashboard', 'mail', 'email', 'smtp',
    'ftp', 'staging', 'dev', 'test', 'demo', 'preview', 'webcontainer',
    'static', 'assets', 'cdn', 'media', 'upload', 'download', 'help',
    'support', 'docs', 'documentation', 'blog', 'news', 'forum', 'chat',
    'status', 'monitor', 'analytics', 'metrics', 'billing', 'payment',
    'checkout', 'cart', 'shop', 'store', 'account', 'profile', 'settings',
    'login', 'signup', 'register', 'auth', 'oauth', 'sso', 'webhook',
    'callback', 'confirm', 'verify', 'activate', 'reset', 'forgot',
    'secure', 'ssl', 'tls', 'vpn', 'proxy', 'gateway', 'router',
    'server', 'host', 'node', 'cluster', 'cloud', 'saas', 'paas', 'iaas'
  ];
BEGIN
  IF NEW.deploy_subdomain IS NOT NULL THEN
    IF NEW.deploy_subdomain = ANY(reserved_words) THEN
      RAISE EXCEPTION 'This subdomain is reserved and cannot be used';
    END IF;

    IF LENGTH(NEW.deploy_subdomain) < 3 THEN
      RAISE EXCEPTION 'Subdomain must be at least 3 characters long';
    END IF;

    IF LENGTH(NEW.deploy_subdomain) > 63 THEN
      RAISE EXCEPTION 'Subdomain must be less than 63 characters';
    END IF;

    IF NEW.deploy_subdomain !~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' THEN
      RAISE EXCEPTION 'Subdomain can only contain lowercase letters, numbers, and hyphens, and must start and end with a letter or number';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_subdomain_before_insert_or_update
  BEFORE INSERT OR UPDATE ON chats
  FOR EACH ROW
  EXECUTE FUNCTION check_reserved_subdomains();

COMMENT ON COLUMN chats.deploy_subdomain IS 'Custom subdomain for deployed application (e.g., myapp.coderocket.app)';
COMMENT ON COLUMN chats.deployed_at IS 'Timestamp when the application was deployed';
COMMENT ON COLUMN chats.deployed_version IS 'Version number that is currently deployed';
COMMENT ON COLUMN chats.is_deployed IS 'Whether the application is currently deployed';

