alter table public.users
add column if not exists email text;

update public.users as u
set email = au.email
from auth.users as au
where u.id = au.id
and (u.email is distinct from au.email);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, full_name, avatar_url, email)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

