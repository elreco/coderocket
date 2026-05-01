-- Keep this file intentionally minimal.
-- Add only deterministic bootstrap records required for local development.
-- Do not copy production data into this file.

insert into storage.buckets (
  id,
  name,
  public,
  avif_autodetection,
  type
)
values
  ('chat-images', 'chat-images', true, false, 'STANDARD'),
  ('featured', 'featured', true, false, 'STANDARD'),
  ('images', 'images', true, false, 'STANDARD')
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  avif_autodetection = excluded.avif_autodetection,
  type = excluded.type;
