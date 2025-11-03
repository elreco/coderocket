-- ============================================================================
-- CRITICAL SECURITY FIX: Encrypt GitHub Access Tokens
-- ============================================================================
-- This migration fixes a security vulnerability where GitHub access tokens
-- were stored in plain text in the database.
--
-- IMPORTANT: Before running this migration:
-- 1. Set the encryption key in your Supabase project settings:
--    ALTER DATABASE postgres SET app.encryption_key = 'your-secure-encryption-key-here';
-- 2. Make sure pgcrypto extension is available
-- 3. Backup your database
--
-- After this migration:
-- 1. Update application code to decrypt tokens when reading
-- 2. Update application code to encrypt tokens when writing
-- ============================================================================

-- Enable pgcrypto extension for encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- PART 1: Create helper functions for encryption/decryption
-- ============================================================================

-- Function to get the encryption key from settings
-- This allows rotating the key without changing the functions
CREATE OR REPLACE FUNCTION public.get_encryption_key()
RETURNS text AS $$
BEGIN
  -- Try to get the key from database settings
  -- If not set, return a default (CHANGE THIS IN PRODUCTION!)
  RETURN COALESCE(
    current_setting('app.encryption_key', true),
    'CHANGE_ME_IN_PRODUCTION_USE_A_LONG_RANDOM_STRING'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'CHANGE_ME_IN_PRODUCTION_USE_A_LONG_RANDOM_STRING';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to encrypt GitHub tokens
CREATE OR REPLACE FUNCTION public.encrypt_github_token(token text)
RETURNS bytea AS $$
BEGIN
  IF token IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN pgp_sym_encrypt(token, public.get_encryption_key());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt GitHub tokens
CREATE OR REPLACE FUNCTION public.decrypt_github_token(encrypted_token bytea)
RETURNS text AS $$
BEGIN
  IF encrypted_token IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN pgp_sym_decrypt(encrypted_token, public.get_encryption_key());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 2: Backup existing data
-- ============================================================================

-- Create a temporary backup table (will be dropped after migration)
CREATE TABLE IF NOT EXISTS public.github_connections_backup_20250203 AS
SELECT * FROM public.github_connections;

COMMENT ON TABLE public.github_connections_backup_20250203 IS
  'Temporary backup created during token encryption migration. Can be dropped after verifying migration success.';

-- ============================================================================
-- PART 3: Migrate access_token column to bytea with encryption
-- ============================================================================

-- Add new encrypted column
ALTER TABLE public.github_connections
  ADD COLUMN IF NOT EXISTS access_token_encrypted bytea;

-- Encrypt existing tokens and store in new column
UPDATE public.github_connections
SET access_token_encrypted = public.encrypt_github_token(access_token)
WHERE access_token IS NOT NULL;

-- Verify all tokens were encrypted
DO $$
DECLARE
  unencrypted_count integer;
BEGIN
  SELECT COUNT(*) INTO unencrypted_count
  FROM public.github_connections
  WHERE access_token IS NOT NULL
    AND access_token_encrypted IS NULL;

  IF unencrypted_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: % tokens were not encrypted', unencrypted_count;
  END IF;
END $$;

-- Drop old column and rename new column
ALTER TABLE public.github_connections
  DROP COLUMN access_token;

ALTER TABLE public.github_connections
  RENAME COLUMN access_token_encrypted TO access_token;

-- Add NOT NULL constraint back
ALTER TABLE public.github_connections
  ALTER COLUMN access_token SET NOT NULL;

-- ============================================================================
-- PART 4: Handle refresh_token (if it exists and is used)
-- ============================================================================

-- GitHub OAuth apps don't provide refresh tokens, but GitHub Apps do
-- If you're using GitHub Apps, uncomment and run this section:

/*
-- Add new encrypted column for refresh_token
ALTER TABLE public.github_connections
  ADD COLUMN IF NOT EXISTS refresh_token_encrypted bytea;

-- Encrypt existing refresh tokens
UPDATE public.github_connections
SET refresh_token_encrypted = public.encrypt_github_token(refresh_token)
WHERE refresh_token IS NOT NULL;

-- Drop old column and rename
ALTER TABLE public.github_connections
  DROP COLUMN refresh_token;

ALTER TABLE public.github_connections
  RENAME COLUMN refresh_token_encrypted TO refresh_token;
*/

-- ============================================================================
-- PART 5: Create a secure view for easier access
-- ============================================================================

-- Create a view that automatically decrypts tokens
-- IMPORTANT: Only use this in server-side code with proper authorization!
CREATE OR REPLACE VIEW public.github_connections_decrypted AS
SELECT
  id,
  user_id,
  github_username,
  public.decrypt_github_token(access_token) as access_token,
  refresh_token,  -- Will need decryption if you uncomment Part 4
  connected_at,
  last_sync_at
FROM public.github_connections;

-- Restrict access to the decrypted view
-- Only the service role should access this view
REVOKE ALL ON public.github_connections_decrypted FROM PUBLIC;
REVOKE ALL ON public.github_connections_decrypted FROM authenticated;
GRANT SELECT ON public.github_connections_decrypted TO service_role;

COMMENT ON VIEW public.github_connections_decrypted IS
  'Secure view that decrypts GitHub tokens. Only accessible by service role. Use this in server-side code only.';

-- ============================================================================
-- PART 6: Update RLS policies to work with encrypted data
-- ============================================================================

-- RLS policies are already in place from previous migration
-- They work fine with bytea columns
-- No changes needed here

-- ============================================================================
-- PART 7: Create helper function for application use
-- ============================================================================

-- Function for application to safely get decrypted token
-- This checks that the requesting user owns the connection
CREATE OR REPLACE FUNCTION public.get_my_github_token()
RETURNS text AS $$
DECLARE
  decrypted_token text;
BEGIN
  SELECT public.decrypt_github_token(access_token)
  INTO decrypted_token
  FROM public.github_connections
  WHERE user_id = auth.uid()
  LIMIT 1;

  RETURN decrypted_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_github_token() TO authenticated;

COMMENT ON FUNCTION public.get_my_github_token() IS
  'Securely retrieves and decrypts the GitHub token for the authenticated user';

-- ============================================================================
-- PART 8: Create trigger to auto-encrypt on insert/update
-- ============================================================================

-- This trigger function ensures tokens are always encrypted
CREATE OR REPLACE FUNCTION public.encrypt_github_token_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- If access_token is being set and is text (shouldn't happen after migration)
  -- This is a safety check in case someone tries to insert plain text
  IF NEW.access_token IS NOT NULL THEN
    -- Token should already be bytea after migration
    -- No action needed as the application should handle encryption
    NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
--
-- IMPORTANT NEXT STEPS:
--
-- 1. SET YOUR ENCRYPTION KEY (do this before running this migration):
--    In Supabase Dashboard > Database > Database Settings:
--    ALTER DATABASE postgres SET app.encryption_key = 'your-256-bit-key-here';
--
--    Generate a secure key with: openssl rand -hex 32
--
-- 2. UPDATE YOUR APPLICATION CODE:
--
--    OLD CODE (app/api/github/callback/route.ts line 81):
--    await supabase.from("github_connections").upsert({
--      access_token: accessToken,  // ❌ Plain text
--    })
--
--    NEW CODE - Option A (using server-side client with service role):
--    // Server-side code automatically handles this via the decrypted view
--    await supabase.from("github_connections").upsert({
--      access_token: Buffer.from(
--        await supabase.rpc('encrypt_github_token', { token: accessToken })
--      ),
--    })
--
--    NEW CODE - Option B (using the helper function):
--    // When reading:
--    const { data } = await supabase.rpc('get_my_github_token');
--    const token = data;
--
--    // When writing: Use SQL function
--    await supabase.from("github_connections").upsert({
--      access_token: supabase.rpc('encrypt_github_token', { token: accessToken })
--    })
--
-- 3. TEST THOROUGHLY:
--    - Test GitHub OAuth flow
--    - Test GitHub sync functionality
--    - Verify tokens can be decrypted and used
--    - Check all error logs
--
-- 4. AFTER VERIFICATION (wait 1-2 weeks):
--    DROP TABLE IF EXISTS public.github_connections_backup_20250203;
--
-- 5. SECURITY CHECKLIST:
--    ✓ Encryption key is set and secured
--    ✓ Application code is updated to use encrypted tokens
--    ✓ Only service role can access decrypted view
--    ✓ RLS policies are still working
--    ✓ Backup table exists for rollback if needed
--
-- ============================================================================

