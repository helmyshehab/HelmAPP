-- Step 4 pre-merge hardening: revoked roles must not satisfy has_role*;
-- restrict assign_role EXECUTE away from PUBLIC.

create or replace function identity.has_role(required identity.app_role)
returns boolean
language sql
stable
security definer
set search_path = identity, auth, pg_temp
as $$
  select exists (
    select 1
    from identity.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = required
      and ur.revoked_at is null
  );
$$;

create or replace function identity.has_any_role(required identity.app_role[])
returns boolean
language sql
stable
security definer
set search_path = identity, auth, pg_temp
as $$
  select exists (
    select 1
    from identity.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = any (required)
      and ur.revoked_at is null
  );
$$;

create or replace function identity.assign_role(
  p_user_id uuid,
  p_role identity.app_role,
  p_granted_by uuid
) returns uuid
language plpgsql
security definer
set search_path = identity, ops, auth, pg_temp
as $$
declare
  v_id uuid;
begin
  if p_role = 'customer'::identity.app_role then
    if auth.uid() is distinct from p_user_id and not identity.has_any_role(
      array['administrator','super-administrator']::identity.app_role[]
    ) then
      raise exception 'not authorized to assign customer role';
    end if;
  else
    if not identity.has_role('super-administrator'::identity.app_role) then
      raise exception 'not authorized to assign privileged role';
    end if;
  end if;

  insert into identity.user_roles (user_id, role, granted_by)
  values (p_user_id, p_role, p_granted_by)
  returning id into v_id;

  insert into ops.audit_events (actor_user_id, action, entity_type, entity_id, after_json)
  values (
    p_granted_by,
    'role.assign',
    'identity.user_roles',
    v_id,
    jsonb_build_object('user_id', p_user_id, 'role', p_role::text)
  );

  return v_id;
end;
$$;

revoke all on function identity.assign_role(uuid, identity.app_role, uuid) from public;
grant execute on function identity.assign_role(uuid, identity.app_role, uuid) to helm_authenticated;
