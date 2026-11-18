-- Assumes: current_user = helm_authenticated, inside a transaction.
\set ON_ERROR_STOP on

do $$
declare
  n int;
begin
  perform set_config('request.jwt.claim.sub', '55555555-5555-5555-5555-555555555555', true);

  select count(*) into n from catalog.destinations;
  if n <> 2 then
    raise exception 'customer destinations expected 2 published, got %', n;
  end if;

  select count(*) into n from catalog.destinations where slug = 'draft-future-destination';
  if n <> 0 then
    raise exception 'customer must not see draft destinations';
  end if;

  select count(*) into n from identity.user_roles;
  if n <> 1 then
    raise exception 'customer should see only own roles, got %', n;
  end if;

  select count(*) into n from identity.customer_profiles;
  if n <> 1 then
    raise exception 'customer should see own profile only, got %', n;
  end if;

  select count(*) into n from identity.user_accounts
    where id = '88888888-8888-8888-8888-888888888888';
  if n <> 0 then
    raise exception 'customer must not read other accounts';
  end if;

  begin
    insert into identity.user_roles (user_id, role)
    values ('55555555-5555-5555-5555-555555555555', 'administrator');
    raise exception 'customer privilege escalation was allowed';
  exception
    when others then
      if sqlerrm like '%row-level security%' or sqlerrm like '%policy%' then
        null;
      else
        raise;
      end if;
  end;

  perform set_config('request.jwt.claim.sub', '77777777-7777-7777-7777-777777777777', true);
  select count(*) into n from catalog.destinations where slug = 'draft-future-destination';
  if n <> 1 then
    raise exception 'administrator should see draft destinations, got %', n;
  end if;

  select count(*) into n from catalog.destinations;
  if n < 3 then
    raise exception 'administrator should see all destinations including drafts, got %', n;
  end if;

  raise notice 'RLS_STEP4_OK';
end $$;
