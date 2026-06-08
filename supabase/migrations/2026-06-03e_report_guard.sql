-- Hotfix: report_issue() inserted a row with resource_id = NULL when the id
-- couldn't be resolved, letting anyone submit orphan/garbage reports. Reject
-- unknown resources, matching upvote_resource / remove_upvote.
-- Apply ONCE in the Supabase SQL editor. Idempotent.

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
