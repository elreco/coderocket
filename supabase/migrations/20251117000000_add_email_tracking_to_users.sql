alter table public.users
add column if not exists last_email_scenario text;

alter table public.users
add column if not exists last_email_sent_at timestamptz;

comment on column public.users.last_email_scenario is 'Last automated email scenario sent to this user';
comment on column public.users.last_email_sent_at is 'Timestamp of the last automated email sent to this user';

