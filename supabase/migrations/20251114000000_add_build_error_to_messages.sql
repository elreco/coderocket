ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS build_error jsonb;

COMMENT ON COLUMN public.messages.build_error IS 'Stores build error information from the builder API';

