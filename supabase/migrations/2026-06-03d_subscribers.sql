-- Migration: newsletter subscribers (opt-in email capture)
-- Apply ONCE in the Supabase SQL editor. Idempotent.
-- Emails are PII: the table is not anon-readable; writes go only through the
-- SECURITY DEFINER function below (admin reads use the service role).

begin;

create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text,
  created_at timestamptz not null default now(),
  unsubscribed boolean not null default false
);

create index if not exists idx_subscribers_created on subscribers(created_at desc);

alter table subscribers enable row level security;
-- No anon SELECT/INSERT policies: direct access is blocked; subscribe_email() inserts.

create or replace function subscribe_email(p_email text, p_source text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_email is null or p_email !~ '^[^@]+@[^@]+\.[^@]+$' then
    raise exception 'invalid email';
  end if;
  insert into subscribers (email, source)
    values (lower(trim(p_email)), left(p_source, 100))
    on conflict (email) do update set unsubscribed = false;
  return true;
end;
$$;

grant execute on function subscribe_email(text, text) to anon, authenticated;

commit;
