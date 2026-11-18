-- Helm حلم — Step 4 RLS attack harness (realistic JWT claim contexts)
-- Assumes: current_user = helm_authenticated, inside a transaction.
\set ON_ERROR_STOP on

do $$
declare
  n int;
begin
  -- ========== Customer ==========
  perform set_config('request.jwt.claim.sub', '55555555-5555-5555-5555-555555555555', true);

  select count(*) into n from catalog.destinations;
  if n <> 2 then
    raise exception 'customer destinations expected 2 published, got %', n;
  end if;

  select count(*) into n from catalog.destinations where slug = 'draft-future-destination';
  if n <> 0 then
    raise exception 'customer must not see draft destinations';
  end if;

  select count(*) into n from catalog.places
    where publish_status <> 'published' or verification_status <> 'verified';
  if n <> 0 then
    raise exception 'customer must not see unpublished/unverified places';
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

  -- Cannot self-assign staff roles via INSERT
  begin
    insert into identity.user_roles (user_id, role)
    values ('55555555-5555-5555-5555-555555555555', 'administrator');
    raise exception 'customer privilege escalation via INSERT was allowed';
  exception
    when others then
      if sqlerrm like '%row-level security%' or sqlerrm like '%policy%' then null; else raise; end if;
  end;

  begin
    insert into identity.user_roles (user_id, role)
    values ('55555555-5555-5555-5555-555555555555', 'operator');
    raise exception 'customer operator escalation via INSERT was allowed';
  exception
    when others then
      if sqlerrm like '%row-level security%' or sqlerrm like '%policy%' then null; else raise; end if;
  end;

  begin
    insert into identity.user_roles (user_id, role)
    values ('55555555-5555-5555-5555-555555555555', 'super-administrator');
    raise exception 'customer super-admin escalation via INSERT was allowed';
  exception
    when others then
      if sqlerrm like '%row-level security%' or sqlerrm like '%policy%' then null; else raise; end if;
  end;

  -- Cannot assign/modify another user's roles
  begin
    insert into identity.user_roles (user_id, role)
    values ('66666666-6666-6666-6666-666666666666', 'customer');
    raise exception 'customer assigned role to another user';
  exception
    when others then
      if sqlerrm like '%row-level security%' or sqlerrm like '%policy%' then null; else raise; end if;
  end;

  begin
    update identity.user_roles
      set revoked_at = now()
      where user_id = '66666666-6666-6666-6666-666666666666';
    get diagnostics n = row_count;
    if n <> 0 then
      raise exception 'customer revoked another user role (% rows)', n;
    end if;
  end;

  begin
    delete from identity.user_roles
      where user_id = '66666666-6666-6666-6666-666666666666';
    get diagnostics n = row_count;
    if n <> 0 then
      raise exception 'customer deleted another user role (% rows)', n;
    end if;
  end;

  begin
    perform identity.assign_role(
      '55555555-5555-5555-5555-555555555555',
      'administrator'::identity.app_role,
      '55555555-5555-5555-5555-555555555555'
    );
    raise exception 'assign_role allowed customer to become administrator';
  exception
    when others then
      if sqlerrm like '%not authorized%' then null; else raise; end if;
  end;

  -- ========== Operator ==========
  perform set_config('request.jwt.claim.sub', '66666666-6666-6666-6666-666666666666', true);

  select count(*) into n from catalog.destinations where slug = 'draft-future-destination';
  if n <> 1 then
    raise exception 'operator should see draft destinations for ops, got %', n;
  end if;

  begin
    update catalog.destinations set name_en = 'Hacked' where slug = 'istanbul';
    get diagnostics n = row_count;
    if n <> 0 then
      raise exception 'operator updated destination (% rows)', n;
    end if;
  end;

  begin
    insert into catalog.places (
      destination_id, category, slug, name_en, name_ar, verification_status, publish_status
    ) values (
      '11111111-1111-1111-1111-111111111111',
      'cafe', 'evil-cafe', 'Evil', 'شر', 'verified', 'published'
    );
    raise exception 'operator inserted place';
  exception
    when others then
      if sqlerrm like '%row-level security%' or sqlerrm like '%policy%' then null; else raise; end if;
  end;

  begin
    insert into identity.user_roles (user_id, role)
    values ('55555555-5555-5555-5555-555555555555', 'administrator');
    raise exception 'operator granted administrator';
  exception
    when others then
      if sqlerrm like '%row-level security%' or sqlerrm like '%policy%' then null; else raise; end if;
  end;

  -- ========== Administrator ==========
  perform set_config('request.jwt.claim.sub', '77777777-7777-7777-7777-777777777777', true);
  select count(*) into n from catalog.destinations where slug = 'draft-future-destination';
  if n <> 1 then
    raise exception 'administrator should see draft destinations, got %', n;
  end if;

  select count(*) into n from catalog.destinations;
  if n < 3 then
    raise exception 'administrator should see all destinations including drafts, got %', n;
  end if;

  begin
    insert into identity.user_roles (user_id, role)
    values ('55555555-5555-5555-5555-555555555555', 'operator');
    raise exception 'administrator granted operator role';
  exception
    when others then
      if sqlerrm like '%row-level security%' or sqlerrm like '%policy%' then null; else raise; end if;
  end;

  raise notice 'RLS_STEP4_OK';
end $$;
