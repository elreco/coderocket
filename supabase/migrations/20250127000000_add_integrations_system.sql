-- INTEGRATION SYSTEM FOR CODEROCKET
-- This migration adds support for user integrations (Supabase, Stripe, Blob, etc.)
--
-- IMPORTANT: This migration is safe to run and does NOT modify any existing tables
-- It only creates new tables and policies
--
-- Tables created:
-- 1. user_integrations: Store user's integration configurations (encrypted)
-- 2. chat_integrations: Link chats to specific integrations
-- 3. integration_schemas: Store generated database schemas and files

-- ============================================================================
-- TABLE: user_integrations
-- Stores user's integration configurations (Supabase, Stripe, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  integration_type text NOT NULL CHECK (integration_type IN ('supabase', 'stripe', 'blob', 'resend', 'auth')),
  name text NOT NULL,
  config jsonb NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT user_integrations_unique_name UNIQUE(user_id, integration_type, name)
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_integrations_user_id ON public.user_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_type ON public.user_integrations(integration_type);
CREATE INDEX IF NOT EXISTS idx_user_integrations_active ON public.user_integrations(user_id, is_active);

-- Row Level Security
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;

-- Users can only view and manage their own integrations
CREATE POLICY "Users can view own integrations"
  ON public.user_integrations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own integrations"
  ON public.user_integrations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own integrations"
  ON public.user_integrations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own integrations"
  ON public.user_integrations
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- TABLE: chat_integrations
-- Links chats to specific integrations
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chat_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  integration_id uuid REFERENCES public.user_integrations(id) ON DELETE CASCADE NOT NULL,
  is_enabled boolean DEFAULT true NOT NULL,
  config_override jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT chat_integrations_unique UNIQUE(chat_id, integration_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_chat_integrations_chat_id ON public.chat_integrations(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_integrations_integration_id ON public.chat_integrations(integration_id);
CREATE INDEX IF NOT EXISTS idx_chat_integrations_enabled ON public.chat_integrations(chat_id, is_enabled);

-- Row Level Security
ALTER TABLE public.chat_integrations ENABLE ROW LEVEL SECURITY;

-- Users can manage integrations for their own chats
CREATE POLICY "Users can view chat integrations for own chats"
  ON public.chat_integrations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = chat_integrations.chat_id
      AND chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create chat integrations for own chats"
  ON public.chat_integrations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = chat_integrations.chat_id
      AND chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update chat integrations for own chats"
  ON public.chat_integrations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = chat_integrations.chat_id
      AND chats.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = chat_integrations.chat_id
      AND chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete chat integrations for own chats"
  ON public.chat_integrations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = chat_integrations.chat_id
      AND chats.user_id = auth.uid()
    )
  );

-- ============================================================================
-- TABLE: integration_schemas
-- Stores generated database schemas and backend files for integrations
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.integration_schemas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  integration_id uuid REFERENCES public.user_integrations(id) ON DELETE CASCADE NOT NULL,
  schema_definition jsonb NOT NULL,
  generated_files jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT integration_schemas_unique UNIQUE(chat_id, integration_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_integration_schemas_chat_id ON public.integration_schemas(chat_id);
CREATE INDEX IF NOT EXISTS idx_integration_schemas_integration_id ON public.integration_schemas(integration_id);

-- Row Level Security
ALTER TABLE public.integration_schemas ENABLE ROW LEVEL SECURITY;

-- Users can view schemas for their own chats
CREATE POLICY "Users can view integration schemas for own chats"
  ON public.integration_schemas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = integration_schemas.chat_id
      AND chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create integration schemas for own chats"
  ON public.integration_schemas
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = integration_schemas.chat_id
      AND chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update integration schemas for own chats"
  ON public.integration_schemas
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = integration_schemas.chat_id
      AND chats.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = integration_schemas.chat_id
      AND chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete integration schemas for own chats"
  ON public.integration_schemas
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = integration_schemas.chat_id
      AND chats.user_id = auth.uid()
    )
  );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_user_integrations_updated_at
  BEFORE UPDATE ON public.user_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chat_integrations_updated_at
  BEFORE UPDATE ON public.chat_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_integration_schemas_updated_at
  BEFORE UPDATE ON public.integration_schemas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.user_integrations IS 'Stores user integration configurations (Supabase, Stripe, Blob, etc.)';
COMMENT ON TABLE public.chat_integrations IS 'Links chats to specific integrations with per-chat configuration';
COMMENT ON TABLE public.integration_schemas IS 'Stores generated database schemas and backend files for integrations';

COMMENT ON COLUMN public.user_integrations.config IS 'Encrypted JSON configuration for the integration (API keys, URLs, etc.)';
COMMENT ON COLUMN public.chat_integrations.config_override IS 'Optional per-chat configuration override';
COMMENT ON COLUMN public.integration_schemas.schema_definition IS 'Generated database schema definition';
COMMENT ON COLUMN public.integration_schemas.generated_files IS 'List of backend files generated for this integration';

