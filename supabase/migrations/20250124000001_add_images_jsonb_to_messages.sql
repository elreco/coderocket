-- Add JSONB column to store multiple files (images, PDFs, etc.)
-- Simpler approach than a separate table, optimized for queries

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS files jsonb DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_messages_files ON public.messages USING GIN (files);

COMMENT ON COLUMN public.messages.files IS 'Array of file URLs in JSONB format. Example: [{"url": "path/to/file.jpg", "order": 0, "type": "image"}]';

-- Function to migrate existing prompt_image data to files array
CREATE OR REPLACE FUNCTION migrate_prompt_image_to_files()
RETURNS void AS $$
BEGIN
  UPDATE public.messages
  SET files = jsonb_build_array(
    jsonb_build_object('url', prompt_image, 'order', 0, 'type', 'image')
  )
  WHERE prompt_image IS NOT NULL
  AND prompt_image != ''
  AND (files IS NULL OR files = '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Uncomment the line below to run the migration automatically
-- SELECT migrate_prompt_image_to_files();

