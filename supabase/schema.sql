-- Free Stuff @ Dartmouth — canonical Supabase schema.
-- This single file describes the full database for a FRESH install.
-- For an existing database, apply supabase/migrations/* instead.
-- Run this in your Supabase SQL editor.

create extension if not exists "uuid-ossp";

-- ============================================================
-- Resources (main catalog)
-- ============================================================
create table if not exists resources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,                 -- stable, human-readable public id
  name text not null,
  description text not null,
  url text not null,
  category text not null check (category in (
    'software', 'news', 'library', 'outdoor', 'money', 'health',
    'career', 'campus-life', 'alumni-only', 'tuck', 'transportation',
    'off-campus'
  )),
  eligibility text[] not null default '{}',
  last_verified date not null default current_date,
  notes text,
  source text,
  added_at timestamptz not null default now(),
  added_by text default 'human',
  upvotes integer not null default 0 check (upvotes >= 0),
  is_active boolean not null default true,
  annual_value integer,                      -- null = value not estimated
  date_added date default current_date,
  hidden_gem boolean not null default false,
  constraint url_unique unique (url)
);

create index if not exists idx_resources_category on resources(category);
create index if not exists idx_resources_eligibility on resources using gin(eligibility);
create index if not exists idx_resources_upvotes on resources(upvotes desc);
create index if not exists idx_resources_active on resources(is_active) where is_active = true;

-- ============================================================
-- Votes (upvote tracking)
-- ============================================================
create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references resources(id) on delete cascade,
  fingerprint text not null,
  voted_at timestamptz not null default now(),
  constraint unique_vote unique (resource_id, fingerprint)
);

create index if not exists idx_votes_resource on votes(resource_id);
create index if not exists idx_votes_fingerprint on votes(fingerprint);

-- ============================================================
-- Pending resources (moderation queue)
-- ============================================================
create table if not exists pending_resources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  url text not null,
  category text,
  eligibility text[] default '{}',
  notes text,
  submitted_by text,
  submitted_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  agent_source text check (agent_source in ('verify', 'discover', 'draft', null)),
  reviewed_at timestamptz,
  reviewer_notes text
);

create index if not exists idx_pending_status on pending_resources(status);
create index if not exists idx_pending_submitted on pending_resources(submitted_at desc);

-- ============================================================
-- Resource reports (user-submitted issue reports)
-- ============================================================
create table if not exists resource_reports (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid references resources(id) on delete cascade,
  issue_type text not null check (issue_type in ('broken-link', 'wrong-info', 'outdated', 'eligibility', 'other')),
  details text,
  email text,
  created_at timestamptz default now(),
  status text default 'pending' check (status in ('pending', 'reviewed', 'fixed'))
);

create index if not exists idx_reports_resource_id on resource_reports(resource_id);
create index if not exists idx_reports_status on resource_reports(status);

-- ============================================================
-- Functions
-- ============================================================
-- Resolve a public id (slug or UUID) to the internal UUID.
-- Imperative so the ::uuid cast runs ONLY for uuid-shaped input — a guarded
-- cast inside a single OR/AND is not safe (Postgres may evaluate both sides).
create or replace function resolve_resource_id(p_id text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_uuid uuid;
begin
  select id into v_uuid from resources where slug = p_id limit 1;
  if v_uuid is not null then
    return v_uuid;
  end if;
  if p_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    select id into v_uuid from resources where id = p_id::uuid limit 1;
  end if;
  return v_uuid;
end;
$$;

-- Atomic upvote (slug-or-uuid in, new count out).
create or replace function upvote_resource(p_id text, p_fingerprint text)
returns table(success boolean, upvotes integer, message text)
language plpgsql
security definer
set search_path = public
as $$
declare v_uuid uuid; v_upvotes integer;
begin
  v_uuid := resolve_resource_id(p_id);
  if v_uuid is null then
    return query select false, 0, 'Resource not found'::text; return;
  end if;
  if exists (select 1 from votes where resource_id = v_uuid and fingerprint = p_fingerprint) then
    select resources.upvotes into v_upvotes from resources where id = v_uuid;
    return query select false, v_upvotes, 'Already voted'::text; return;
  end if;
  insert into votes (resource_id, fingerprint) values (v_uuid, p_fingerprint);
  update resources set upvotes = resources.upvotes + 1 where id = v_uuid
    returning resources.upvotes into v_upvotes;
  return query select true, v_upvotes, 'Vote recorded'::text;
end;
$$;

-- Atomic remove-upvote.
create or replace function remove_upvote(p_id text, p_fingerprint text)
returns table(success boolean, upvotes integer, message text)
language plpgsql
security definer
set search_path = public
as $$
declare v_uuid uuid; v_upvotes integer;
begin
  v_uuid := resolve_resource_id(p_id);
  if v_uuid is null then
    return query select false, 0, 'Resource not found'::text; return;
  end if;
  if not exists (select 1 from votes where resource_id = v_uuid and fingerprint = p_fingerprint) then
    select resources.upvotes into v_upvotes from resources where id = v_uuid;
    return query select false, v_upvotes, 'Vote not found'::text; return;
  end if;
  delete from votes where resource_id = v_uuid and fingerprint = p_fingerprint;
  update resources set upvotes = greatest(resources.upvotes - 1, 0) where id = v_uuid
    returning resources.upvotes into v_upvotes;
  return query select true, v_upvotes, 'Vote removed'::text;
end;
$$;

-- Record a report. Reports are written ONLY through this function so the table
-- itself need not be writable/readable by the anon role.
create or replace function report_issue(p_id text, p_issue_type text, p_details text, p_email text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_uuid uuid;
begin
  if p_issue_type not in ('broken-link','wrong-info','outdated','eligibility','other') then
    raise exception 'invalid issue type';
  end if;
  v_uuid := resolve_resource_id(p_id);
  if v_uuid is null then
    raise exception 'unknown resource';
  end if;
  insert into resource_reports (resource_id, issue_type, details, email)
    values (v_uuid, p_issue_type, left(p_details, 2000), left(p_email, 254));
  return true;
end;
$$;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table resources enable row level security;
alter table votes enable row level security;
alter table pending_resources enable row level security;
alter table resource_reports enable row level security;

-- Resources: public can read active rows.
create policy "Public read access for active resources"
  on resources for select using (is_active = true);

-- Votes: readable (no PII) so the UI can reflect vote state. Inserts/deletes
-- happen only via the SECURITY DEFINER functions, so no write policies exist.
create policy "Users can read all votes"
  on votes for select using (true);

-- Pending resources: public can submit; the queue is NOT readable by anon
-- (admin reads use the service role, which bypasses RLS).
create policy "Public can submit resources"
  on pending_resources for insert with check (true);

-- resource_reports: no anon policies. Writes go through report_issue();
-- admin reads use the service role.

-- ============================================================
-- Grants
-- ============================================================
grant execute on function resolve_resource_id(text) to anon, authenticated;
grant execute on function upvote_resource(text, text) to anon, authenticated;
grant execute on function remove_upvote(text, text) to anon, authenticated;
grant execute on function report_issue(text, text, text, text) to anon, authenticated;

-- ============================================================
-- Reconciliation view: stored upvote counter vs. actual vote rows (see M6).
-- Rows where stored_upvotes <> actual_votes indicate drift.
-- ============================================================
create or replace view resource_vote_counts as
select r.id, r.slug, r.name, r.upvotes as stored_upvotes, count(v.id)::int as actual_votes
from resources r
left join votes v on v.resource_id = r.id
group by r.id, r.slug, r.name, r.upvotes;

-- ============================================================
-- Newsletter subscribers (opt-in). Emails are PII: not anon-readable;
-- writes go only through subscribe_email().
-- ============================================================
create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text,
  created_at timestamptz not null default now(),
  unsubscribed boolean not null default false
);
create index if not exists idx_subscribers_created on subscribers(created_at desc);
alter table subscribers enable row level security;

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

-- ============================================================
-- Documentation
-- ============================================================
comment on table resources is 'Main catalog of free resources. slug is the stable public id; id (uuid) is internal.';
comment on table votes is 'Upvote tracking with fingerprint-based deduplication. Written only via functions.';
comment on table pending_resources is 'Moderation queue for community and agent submissions. Not anon-readable.';
comment on table resource_reports is 'User issue reports. Written only via report_issue(); not anon-readable.';
comment on view resource_vote_counts is 'Reconciliation: compare stored upvote counter against actual vote rows.';
