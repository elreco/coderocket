create table if not exists public.user_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  file_type text not null check (file_type in ('image', 'pdf', 'text')),
  mime_type text not null,
  file_size bigint not null default 0,
  original_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists user_files_user_id_idx on public.user_files (user_id);
create index if not exists user_files_created_at_idx on public.user_files (created_at desc);
create index if not exists user_files_file_type_idx on public.user_files (file_type);
create unique index if not exists user_files_storage_path_idx on public.user_files (storage_path);

alter table public.user_files enable row level security;

create policy "Users can view their own files"
  on public.user_files
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own files"
  on public.user_files
  for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own files"
  on public.user_files
  for delete
  using (auth.uid() = user_id);

create or replace function public.set_user_files_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists user_files_set_updated on public.user_files;
create trigger user_files_set_updated
before update on public.user_files
for each row execute procedure public.set_user_files_updated_at();

