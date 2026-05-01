-- Add Figma to supported integration types
-- This migration updates the CHECK constraint to include 'figma'

-- Drop the existing constraint
ALTER TABLE public.user_integrations
  DROP CONSTRAINT IF EXISTS user_integrations_integration_type_check;

-- Add the new constraint with 'figma' included
ALTER TABLE public.user_integrations
  ADD CONSTRAINT user_integrations_integration_type_check
  CHECK (integration_type IN ('supabase', 'stripe', 'blob', 'resend', 'auth', 'figma'));

-- Update the table comment
COMMENT ON TABLE public.user_integrations IS 'Stores user integration configurations (Supabase, Stripe, Blob, Resend, Auth, Figma, etc.)';

