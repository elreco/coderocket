ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS is_building boolean DEFAULT false;

COMMENT ON COLUMN public.messages.is_building IS 'Indicates if a build is currently in progress for this message version';

CREATE INDEX IF NOT EXISTS idx_messages_is_building ON public.messages(is_building) WHERE is_building = true;


