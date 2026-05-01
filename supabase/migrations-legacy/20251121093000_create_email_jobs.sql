create table if not exists public.email_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  email text not null,
  scenario text not null,
  payload jsonb,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed')),
  attempts integer not null default 0,
  last_error text,
  scheduled_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_jobs_status_idx on public.email_jobs (status, scheduled_at);
create index if not exists email_jobs_created_idx on public.email_jobs (created_at);

create or replace function public.set_email_jobs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists email_jobs_set_updated on public.email_jobs;
create trigger email_jobs_set_updated
before update on public.email_jobs
for each row execute procedure public.set_email_jobs_updated_at();

create or replace function public.enqueue_email_job(
  p_user_id uuid,
  p_email text,
  p_scenario text,
  p_payload jsonb default '{}'::jsonb,
  p_scheduled_at timestamptz default timezone('utc', now())
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.email_jobs (user_id, email, scenario, payload, scheduled_at)
  values (
    p_user_id,
    p_email,
    p_scenario,
    coalesce(p_payload, '{}'::jsonb),
    coalesce(p_scheduled_at, timezone('utc', now()))
  );
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.users (id, full_name, avatar_url, email)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.email
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url,
    email = excluded.email;

  if new.email is not null then
    perform public.enqueue_email_job(
      new.id,
      new.email,
      'onboarding-welcome',
      jsonb_build_object(
        'userName',
        coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
      )
    );
  end if;

  return new;
end;
$$;

