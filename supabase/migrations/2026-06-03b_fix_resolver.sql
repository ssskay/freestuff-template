-- Hotfix: resolve_resource_id threw "invalid input syntax for type uuid" for
-- slug input because the ::uuid cast was guarded inside an OR/AND, which
-- Postgres does not evaluate with guaranteed short-circuit. Rewritten as
-- plpgsql so the cast runs only for uuid-shaped input.
-- Apply ONCE in the Supabase SQL editor. Idempotent.

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
