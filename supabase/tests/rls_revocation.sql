\set ON_ERROR_STOP on
-- Soft-revoke administrator and confirm has_role / draft visibility drop.
begin;
update identity.user_roles
  set revoked_at = now()
  where user_id = '77777777-7777-7777-7777-777777777777'
    and role = 'administrator'
    and revoked_at is null;

set local role helm_authenticated;
select set_config('request.jwt.claim.sub', '77777777-7777-7777-7777-777777777777', true);

do $$
declare n int; v boolean;
begin
  select identity.has_role('administrator'::identity.app_role) into v;
  if v then
    raise exception 'revoked administrator still has_role=true';
  end if;
  select count(*) into n from catalog.destinations where slug = 'draft-future-destination';
  if n <> 0 then
    raise exception 'revoked administrator still sees drafts';
  end if;
  raise notice 'RLS_REVOCATION_OK';
end $$;
rollback;
