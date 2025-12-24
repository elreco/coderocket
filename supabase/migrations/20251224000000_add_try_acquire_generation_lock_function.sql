-- ============================================================================
-- Create generation_locks table for atomic locking
-- ============================================================================
-- This table uses INSERT with unique constraint for atomic lock acquisition.
-- This is the only reliable way to do atomic locking in Supabase's serverless
-- environment where connection pooling breaks FOR UPDATE semantics.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.generation_locks (
  chat_id UUID PRIMARY KEY REFERENCES public.chats(id) ON DELETE CASCADE,
  lock_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS but allow service role to bypass
ALTER TABLE public.generation_locks ENABLE ROW LEVEL SECURITY;

-- Policy for service role (full access)
CREATE POLICY "Service role has full access to generation_locks"
  ON public.generation_locks
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Atomic lock acquisition function using INSERT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.try_acquire_generation_lock(
  p_chat_id UUID,
  p_lock_id TEXT,
  p_stale_threshold_minutes INTEGER DEFAULT 5
)
RETURNS BOOLEAN AS $$
DECLARE
  v_stale_threshold TIMESTAMPTZ;
BEGIN
  v_stale_threshold := NOW() - (p_stale_threshold_minutes || ' minutes')::INTERVAL;

  -- First, clean up any stale locks for this chat
  DELETE FROM public.generation_locks
  WHERE chat_id = p_chat_id
    AND created_at < v_stale_threshold;

  -- Try to INSERT our lock - this will fail if another lock exists (unique constraint)
  BEGIN
    INSERT INTO public.generation_locks (chat_id, lock_id, created_at)
    VALUES (p_chat_id, p_lock_id, NOW());

    -- Also update the chats table for compatibility
    UPDATE public.chats
    SET active_stream_id = p_lock_id,
        active_stream_started_at = NOW()
    WHERE id = p_chat_id;

    RETURN TRUE;
  EXCEPTION WHEN unique_violation THEN
    -- Lock already exists and is not stale
    RETURN FALSE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to release the lock
CREATE OR REPLACE FUNCTION public.release_generation_lock(
  p_chat_id UUID,
  p_lock_id TEXT
)
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.generation_locks
  WHERE chat_id = p_chat_id AND lock_id = p_lock_id;

  UPDATE public.chats
  SET active_stream_id = NULL,
      active_stream_started_at = NULL
  WHERE id = p_chat_id AND active_stream_id = p_lock_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.try_acquire_generation_lock(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.try_acquire_generation_lock(UUID, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_generation_lock(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_generation_lock(UUID, TEXT) TO service_role;

COMMENT ON FUNCTION public.try_acquire_generation_lock IS
  'Atomically acquires a generation lock using INSERT with unique constraint. Returns TRUE if lock acquired, FALSE if another generation is in progress.';
COMMENT ON FUNCTION public.release_generation_lock IS
  'Releases a generation lock for a chat.';

