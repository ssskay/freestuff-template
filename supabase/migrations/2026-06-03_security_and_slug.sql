-- Migration: slug identity + security hardening + reconciliation
-- Date: 2026-06-03
-- Apply ONCE in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Idempotent: safe to re-run. Addresses construct-review.md findings C1, C2, H4, M6.

begin;

-- ============================================================
-- C2: Stable slug identity (UUID stays the internal primary key)
-- ============================================================
alter table resources add column if not exists slug text;

-- Backfill slug from the authored catalog (matched by URL).
update resources set slug = 'microsoft-365' where url = 'https://services.dartmouth.edu/TDClient/1806/Portal/KB/ArticleDet?ID=150849' and slug is null;
update resources set slug = 'adobe-creative-cloud' where url = 'https://services.dartmouth.edu/TDClient/1806/Portal/KB/ArticleDet?ID=168309' and slug is null;
update resources set slug = 'google-workspace' where url = 'https://services.dartmouth.edu/TDClient/1806/Portal/KB/ArticleDet?ID=102747' and slug is null;
update resources set slug = 'matlab' where url = 'https://services.dartmouth.edu/TDClient/1806/Portal/KB/ArticleDet?ID=83245' and slug is null;
update resources set slug = 'zoom-pro' where url = 'https://services.dartmouth.edu/TDClient/2415/Student/KB/ArticleDet?ID=107229' and slug is null;
update resources set slug = 'news-access' where url = 'https://www.library.dartmouth.edu/news/11-things' and slug is null;
update resources set slug = 'library-databases' where url = 'https://researchguides.dartmouth.edu/az.php' and slug is null;
update resources set slug = 'bloomberg-terminal' where url = 'https://researchguides.dartmouth.edu/bloomberg' and slug is null;
update resources set slug = 'interlibrary-loan' where url = 'https://www.library.dartmouth.edu/find/borrow-request/borrowing-from-other-libraries' and slug is null;
update resources set slug = 'doc-gear-rentals' where url = 'https://outdoors.dartmouth.edu/outdoor-programs-office/dartmouth-outdoor-rentals' and slug is null;
update resources set slug = 'doc-trips' where url = 'https://outdoors.dartmouth.edu/dartmouth-outing-club/go-trip' and slug is null;
update resources set slug = 'doc-cabin-rentals' where url = 'https://outdoors.dartmouth.edu/services/cabins/' and slug is null;
update resources set slug = 'ledyard-canoe-club' where url = 'https://sites.dartmouth.edu/ledyardcanoeclub/' and slug is null;
update resources set slug = 'printing-credit' where url = 'https://services.dartmouth.edu/TDClient/1806/Portal/KB/ArticleDet?ID=115435' and slug is null;
update resources set slug = 'winter-clothing' where url = 'https://home.dartmouth.edu/news/2023/09/thrift-store-free-clothing-opens-campus' and slug is null;
update resources set slug = 'dicks-house' where url = 'https://students.dartmouth.edu/health-service/' and slug is null;
update resources set slug = 'counseling-sessions' where url = 'https://students.dartmouth.edu/health-service/counseling/appointments-services/short-term-individual-counseling' and slug is null;
update resources set slug = 'cpd-career-advising' where url = 'https://careerdesign.dartmouth.edu/' and slug is null;
update resources set slug = 'professional-clothing-closet' where url = 'https://engineering.dartmouth.edu/community/offices/career-services/students' and slug is null;
update resources set slug = 'alumni-gym' where url = 'https://recreation.dartmouth.edu/about/facilities' and slug is null;
update resources set slug = 'hop-performances' where url = 'https://hop.dartmouth.edu/' and slug is null;
update resources set slug = 'hood-museum' where url = 'https://hoodmuseum.dartmouth.edu/' and slug is null;
update resources set slug = 'athletic-events' where url = 'https://dartmouthsports.com/' and slug is null;
update resources set slug = 'library-card-alumni' where url = 'https://www.library.dartmouth.edu/find/borrow-request/who' and slug is null;
update resources set slug = 'digital-library-alumni' where url = 'https://researchguides.dartmouth.edu/alumni' and slug is null;
update resources set slug = 'alumni-email-forwarding' where url = 'https://services.dartmouth.edu/TDClient/1806/Portal/KB/ArticleDet?ID=108554' and slug is null;
update resources set slug = 'career-services-alumni' where url = 'https://alumni.dartmouth.edu/career-resources' and slug is null;
update resources set slug = 'alumni-directory' where url = 'https://alumni.dartmouth.edu/alumni-directory' and slug is null;
update resources set slug = 'rauner-special-collections' where url = 'https://www.library.dartmouth.edu/rauner' and slug is null;
update resources set slug = 'tuck-digital-library' where url = 'https://mytuck.dartmouth.edu/s/1353/05-myTUCK/mytuck-secondary.aspx?sid=1353&gid=5&pgid=539' and slug is null;
update resources set slug = 'mathematica' where url = 'https://services.dartmouth.edu/TDClient/1806/Portal/KB/ArticleDet?ID=64730' and slug is null;
update resources set slug = 'spss' where url = 'https://services.dartmouth.edu/TDClient/1806/Portal/KB/ArticleDet?ID=64628' and slug is null;
update resources set slug = 'sas' where url = 'https://services.dartmouth.edu/TDClient/1806/Portal/KB/ArticleDet?ID=152019' and slug is null;
update resources set slug = 'jmp-pro' where url = 'https://services.dartmouth.edu/TDClient/1806/Portal/KB/ArticleDet?ID=64613' and slug is null;
update resources set slug = 'qualtrics' where url = 'https://services.dartmouth.edu/TDClient/1806/Portal/KB/ArticleDet?ID=64633' and slug is null;
update resources set slug = 'arcgis-pro' where url = 'https://services.dartmouth.edu/TDClient/1806/Portal/KB/ArticleDet?ID=144381' and slug is null;
update resources set slug = 'cloud-storage' where url = 'https://services.dartmouth.edu/TDClient/2415/Student/KB/ArticleDet?ID=107192' and slug is null;
update resources set slug = 'globalprotect-vpn' where url = 'https://services.dartmouth.edu/TDClient/1806/Portal/KB/ArticleDet?ID=66806' and slug is null;
update resources set slug = 'panopto' where url = 'https://services.dartmouth.edu/TDClient/1806/Portal/KB/ArticleDet?ID=121564' and slug is null;
update resources set slug = 'wrds' where url = 'https://researchguides.dartmouth.edu/wrds' and slug is null;
update resources set slug = 'web-of-science' where url = 'https://researchguides.dartmouth.edu/c.php?g=59725&p=9910244' and slug is null;
update resources set slug = 'scopus' where url = 'https://researchguides.dartmouth.edu/medlibresources' and slug is null;
update resources set slug = 'nexis-uni' where url = 'https://researchguides.dartmouth.edu/law/home' and slug is null;
update resources set slug = 'jstor' where url = 'https://search.library.dartmouth.edu/permalink/01DCL_INST/16rgcn8/alma991022910609705706' and slug is null;
update resources set slug = 'oreilly-learning' where url = 'https://learning.oreilly.com/accounts/login-academic-check/?idp-slug=dartmouth-college' and slug is null;
update resources set slug = 'statista' where url = 'https://www.statista.com/sso/login?connection=dartmouth-college' and slug is null;
update resources set slug = 'psycinfo' where url = 'http://search.ebscohost.com/login.aspx?authtype=ip,shib&profile=ehost&defaultdb=psyh&custid=dartcol&groupid=main' and slug is null;
update resources set slug = 'proquest' where url = 'http://dartmouth.idm.oclc.org/login?url=http://search.proquest.com/pqdtglobal/advanced?accountid=10422' and slug is null;
update resources set slug = 'programming-board-events' where url = 'https://students.dartmouth.edu/collis/organizations/student-organizations-governing-boards/programming-board' and slug is null;
update resources set slug = 'dartmouth-film-society' where url = 'https://hop.dartmouth.edu/students/film-society' and slug is null;
update resources set slug = 'advance-transit' where url = 'https://advancetransit.com/areas-we-serve/dartmouth/' and slug is null;
update resources set slug = 'cable-makerspace' where url = 'https://engineering.dartmouth.edu/makerspace' and slug is null;
update resources set slug = 'hop-woodworking-shop' where url = 'https://hop.dartmouth.edu/students/woodworking' and slug is null;
update resources set slug = 'hop-ceramics-studio' where url = 'https://hop.dartmouth.edu/students/ceramics' and slug is null;
update resources set slug = 'hop-music-practice-rooms' where url = 'https://music.dartmouth.edu/performance/facilities/practice-rooms' and slug is null;
update resources set slug = 'climbing-gym' where url = 'https://outdoors.dartmouth.edu/facilities/climbing-gym' and slug is null;
update resources set slug = 'dickey-international-internship-funding' where url = 'https://dickey.dartmouth.edu/programs/global-studies/international-internships/dickey-international-internships' and slug is null;
update resources set slug = 'rockefeller-internship-funding' where url = 'https://rockefeller.dartmouth.edu/funding/internship-funding' and slug is null;
update resources set slug = 'rockefeller-thesis-grants' where url = 'https://rockefeller.dartmouth.edu/funding/senior-honors-thesis-grants' and slug is null;
update resources set slug = 'mfa-boston-free-admission' where url = 'https://www.mfa.org/membership/universities' and slug is null;
update resources set slug = 'canva' where url = 'https://services.dartmouth.edu/TDClient/1806/Portal/KB/ArticleDet?ID=147889' and slug is null;
update resources set slug = 'bitwarden' where url = 'https://services.dartmouth.edu/TDClient/1806/Portal/KB/ArticleDet?ID=161177' and slug is null;
update resources set slug = 'atlassian-access' where url = 'https://services.dartmouth.edu/TDClient/1806/Portal/KB/ArticleDet?ID=151718' and slug is null;
update resources set slug = 'slack-enterprise' where url = 'https://services.dartmouth.edu/TDClient/1806/Portal/KB/ArticleDet?ID=94649' and slug is null;
update resources set slug = 'claude-education' where url = 'https://services.dartmouth.edu/TDClient/1806/Portal/KB/ArticleDet?ID=170487' and slug is null;
update resources set slug = 'overleaf' where url = 'https://services.dartmouth.edu/TDClient/1806/Portal/KB/ArticleDet?ID=153940' and slug is null;
update resources set slug = 'sibelius' where url = 'https://services.dartmouth.edu/TDClient/1806/Portal/KB/ArticleDet?ID=64743' and slug is null;
update resources set slug = 'stata' where url = 'https://services.dartmouth.edu/TDClient/1806/Portal/KB/ArticleDet?ID=64644' and slug is null;
update resources set slug = 'r-rstudio' where url = 'https://services.dartmouth.edu/TDClient/1806/Portal/KB/ArticleDet?ID=155831' and slug is null;
update resources set slug = 'python-jupyter' where url = 'https://services.dartmouth.edu/TDClient/1806/Portal/KB/ArticleDet?ID=155286' and slug is null;
update resources set slug = 'crashplan' where url = 'https://services.dartmouth.edu/TDClient/1806/Portal/KB/ArticleDet?ID=64863' and slug is null;
update resources set slug = 'linkedin-learning' where url = 'https://services.dartmouth.edu/TDClient/1806/Portal/KB/ArticleDet?ID=64717' and slug is null;
update resources set slug = 'docusign' where url = 'https://services.dartmouth.edu/TDClient/1806/Portal/Requests/ServiceDet?ID=32274' and slug is null;
update resources set slug = 'fastx-remote-desktop' where url = 'https://services.dartmouth.edu/TDClient/1806/Portal/KB/ArticleDet?ID=81595' and slug is null;
update resources set slug = 'mobaxterm' where url = 'https://services.dartmouth.edu/TDClient/1806/Portal/KB/ArticleDet?ID=103989' and slug is null;
update resources set slug = 'onbase-ecm' where url = 'https://services.dartmouth.edu/TDClient/1806/Portal/Requests/ServiceDet?ID=30892' and slug is null;
update resources set slug = 'windows-education' where url = 'https://services.dartmouth.edu/TDClient/1806/Portal/KB/ArticleDet?ID=97413' and slug is null;
update resources set slug = 'crowdstrike' where url = 'https://services.dartmouth.edu/TDClient/1806/Portal/KB/ArticleDet?ID=108065' and slug is null;

-- Last-resort fallback so the NOT NULL constraint can hold for any row that
-- was not present in the authored catalog (e.g. community submissions).
update resources set slug = id::text where slug is null;

create unique index if not exists resources_slug_key on resources(slug);
alter table resources alter column slug set not null;

-- ============================================================
-- H4: Ensure value/date/hidden_gem columns exist (folded in from
--     the old add-value-and-date-columns.sql migration)
-- ============================================================
alter table resources add column if not exists annual_value integer;
alter table resources add column if not exists date_added date default current_date;
alter table resources add column if not exists hidden_gem boolean not null default false;

-- ============================================================
-- H4: Ensure resource_reports exists (folded in from add-reports-table.sql)
-- ============================================================
create table if not exists resource_reports (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid references resources(id) on delete cascade,
  issue_type text not null check (issue_type in ('broken-link','wrong-info','outdated','eligibility','other')),
  details text,
  email text,
  created_at timestamptz default now(),
  status text default 'pending' check (status in ('pending','reviewed','fixed'))
);
create index if not exists idx_reports_resource_id on resource_reports(resource_id);
create index if not exists idx_reports_status on resource_reports(status);
alter table resource_reports enable row level security;

-- ============================================================
-- C2: slug-or-uuid resolver
-- ============================================================
-- Imperative so the ::uuid cast runs ONLY for uuid-shaped input — a guarded
-- cast inside a single OR/AND is not safe (Postgres may evaluate both sides).
create or replace function resolve_resource_id(p_id text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $func$
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
$func$;

-- ============================================================
-- C2 + C1: vote / report functions accept slug-or-uuid, run as definer
-- ============================================================
drop function if exists upvote_resource(uuid, text);
drop function if exists upvote_resource(text, text);
create function upvote_resource(p_id text, p_fingerprint text)
returns table(success boolean, upvotes integer, message text)
language plpgsql
security definer
set search_path = public
as $func$
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
$func$;

drop function if exists remove_upvote(uuid, text);
drop function if exists remove_upvote(text, text);
create function remove_upvote(p_id text, p_fingerprint text)
returns table(success boolean, upvotes integer, message text)
language plpgsql
security definer
set search_path = public
as $func$
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
$func$;

-- C1: reports are written only through this function (table is not anon-writable)
drop function if exists report_issue(text, text, text, text);
create function report_issue(p_id text, p_issue_type text, p_details text, p_email text)
returns boolean
language plpgsql
security definer
set search_path = public
as $func$
declare v_uuid uuid;
begin
  if p_issue_type not in ('broken-link','wrong-info','outdated','eligibility','other') then
    raise exception 'invalid issue type';
  end if;
  v_uuid := resolve_resource_id(p_id);
  insert into resource_reports (resource_id, issue_type, details, email)
    values (v_uuid, p_issue_type, left(p_details, 2000), left(p_email, 254));
  return true;
end;
$func$;

-- ============================================================
-- C1: tighten Row-Level Security
-- ============================================================
-- Votes: readable (no PII), but NOT directly writable/deletable by clients.
drop policy if exists "Users can insert votes" on votes;
drop policy if exists "Users can delete their own votes" on votes;
-- (SELECT policy "Users can read all votes" is retained for vote-state hydration.)

-- Pending submissions: insert-only for the public; the queue is NOT readable by anon.
drop policy if exists "Public can read pending resources" on pending_resources;

-- Reports: no direct anon access at all. Writes go through report_issue();
-- admin reads use the service role (which bypasses RLS).
drop policy if exists "Anyone can submit reports" on resource_reports;
drop policy if exists "Anyone can view reports" on resource_reports;

-- ============================================================
-- C1: function execution grants
-- ============================================================
grant execute on function resolve_resource_id(text) to anon, authenticated;
grant execute on function upvote_resource(text, text) to anon, authenticated;
grant execute on function remove_upvote(text, text) to anon, authenticated;
grant execute on function report_issue(text, text, text, text) to anon, authenticated;

-- ============================================================
-- M6: upvote-count reconciliation view (stored vs. actual)
-- ============================================================
create or replace view resource_vote_counts as
select r.id, r.slug, r.name, r.upvotes as stored_upvotes, count(v.id)::int as actual_votes
from resources r
left join votes v on v.resource_id = r.id
group by r.id, r.slug, r.name, r.upvotes;

commit;

-- After applying: re-seed so DB rows carry annual_value/date_added/hidden_gem
-- and slugs stay in sync with the catalog:  npm run seed
