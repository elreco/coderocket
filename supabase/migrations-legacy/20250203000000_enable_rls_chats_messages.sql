-- ============================================================================
-- CRITICAL SECURITY FIX: Enable Row Level Security on chats and messages
-- ============================================================================
-- This migration fixes a major security vulnerability where chats and messages
-- were accessible without proper authorization checks.
--
-- SAFETY NOTE: This migration is safe because:
-- 1. Server-side code uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS
-- 2. Client-side code will now be properly restricted by policies
-- 3. Policies match existing authorization patterns in the codebase
--
-- IMPORTANT: Backup your database before running this migration in production
-- ============================================================================

-- ============================================================================
-- PART 1: Enable RLS on chats table
-- ============================================================================

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own chats (private or public)
CREATE POLICY "Users can view own chats"
  ON public.chats
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can view public chats from any user
CREATE POLICY "Users can view public chats"
  ON public.chats
  FOR SELECT
  USING (is_private = false);

-- Policy: Authenticated users can create chats for themselves
CREATE POLICY "Users can insert own chats"
  ON public.chats
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own chats only
CREATE POLICY "Users can update own chats"
  ON public.chats
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own chats only
CREATE POLICY "Users can delete own chats"
  ON public.chats
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- PART 2: Enable RLS on messages table
-- ============================================================================

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages from chats they have access to
-- This includes: their own chats OR public chats
CREATE POLICY "Users can view messages from accessible chats"
  ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = messages.chat_id
      AND (
        chats.user_id = auth.uid()  -- Own chats
        OR chats.is_private = false  -- Public chats
      )
    )
  );

-- Policy: Users can insert messages into their own chats only
CREATE POLICY "Users can insert messages to own chats"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = auth.uid()
    )
  );

-- Policy: Users can update messages in their own chats only
-- This is needed for updating version -1 messages to version 0
CREATE POLICY "Users can update messages in own chats"
  ON public.messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = auth.uid()
    )
  );

-- Policy: Users can delete messages from their own chats only
CREATE POLICY "Users can delete messages from own chats"
  ON public.messages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = auth.uid()
    )
  );

-- ============================================================================
-- PART 3: Create indexes for RLS policy performance
-- ============================================================================

-- These indexes significantly improve RLS policy performance
-- by optimizing the EXISTS subqueries

-- Index for chat ownership checks
CREATE INDEX IF NOT EXISTS idx_chats_user_id_id
  ON public.chats(user_id, id);

-- Index for public chat checks
CREATE INDEX IF NOT EXISTS idx_chats_is_private_id
  ON public.chats(is_private, id)
  WHERE is_private = false;

-- Index for message to chat relationship (already exists but ensuring)
CREATE INDEX IF NOT EXISTS idx_messages_chat_id
  ON public.messages(chat_id);

-- ============================================================================
-- PART 4: Verify RLS is working correctly
-- ============================================================================

-- Create a helper function to verify RLS policies (optional, for testing)
CREATE OR REPLACE FUNCTION public.verify_rls_enabled()
RETURNS TABLE(table_name text, rls_enabled boolean) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.relname::text,
    c.relrowsecurity
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('chats', 'messages')
  ORDER BY c.relname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.verify_rls_enabled() TO authenticated;

-- ============================================================================
-- PART 5: Comments for documentation
-- ============================================================================

COMMENT ON POLICY "Users can view own chats" ON public.chats IS
  'Allows users to view all their own chats regardless of privacy setting';

COMMENT ON POLICY "Users can view public chats" ON public.chats IS
  'Allows users to view any public chat (is_private = false)';

COMMENT ON POLICY "Users can view messages from accessible chats" ON public.messages IS
  'Allows users to view messages from chats they own or public chats';

COMMENT ON TABLE public.chats IS
  'Chats table with RLS enabled. Server-side operations use service role and bypass RLS. Client-side operations are restricted by policies.';

COMMENT ON TABLE public.messages IS
  'Messages table with RLS enabled. Access is controlled through chat ownership.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
--
-- After applying this migration:
-- 1. Test authentication flows to ensure users can access their content
-- 2. Test public component browsing to ensure public chats are visible
-- 3. Verify that users cannot access other users' private chats
-- 4. Check that all server-side operations still work (they use service role)
-- 5. Monitor for any policy-related errors in your logs
--
-- To verify RLS is enabled:
-- SELECT * FROM public.verify_rls_enabled();
--
-- Expected output:
--  table_name | rls_enabled
-- ------------+-------------
--  chats      | t
--  messages   | t
-- ============================================================================

