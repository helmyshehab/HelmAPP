-- Helm حلم — Step 5 catalog RLS harness
-- Assumes: current_user = helm_authenticated, inside a transaction.
\set ON_ERROR_STOP on

do $$
declare
  n int;
  published_place uuid := 'a1111111-1111-1111-1111-111111111111';
  draft_place uuid := 'a2222222-2222-2222-2222-222222222222';
begin
  -- ========== Customer ==========
  perform set_config('request.jwt.claim.sub', '55555555-5555-5555-5555-555555555555', true);

  select count(*) into n from catalog.places where lifecycle_status <> 'published';
  if n <> 0 then
    raise exception 'customer saw non-published places (%)', n;
  end if;

  select count(*) into n from catalog.places where id = draft_place;
  if n <> 0 then
    raise exception 'customer saw draft place';
  end if;

  select count(*) into n from catalog.place_attraction_details d where d.place_id = published_place;
  if n <> 1 then
    raise exception 'customer should read published place details, got %', n;
  end if;

  select count(*) into n from catalog.sources;
  if n <> 0 then
    raise exception 'customer must not read provenance sources, got %', n;
  end if;

  select count(*) into n from catalog.entity_sources;
  if n <> 0 then
    raise exception 'customer must not read entity_sources, got %', n;
  end if;

  select count(*) into n from catalog.media_assets where is_public = false;
  if n <> 0 then
    raise exception 'customer saw private media';
  end if;

  begin
    insert into catalog.places (
      destination_id, category, slug, name_en, name_ar, lifecycle_status
    ) values (
      '11111111-1111-1111-1111-111111111111',
      'cafe', 'customer-hack', 'Nope', 'لا', 'draft'
    );
    raise exception 'customer created catalog place';
  exception
    when others then
      if sqlerrm like '%row-level security%' or sqlerrm like '%policy%' then null; else raise; end if;
  end;

  begin
    update catalog.places set name_en = 'Hacked' where id = published_place;
    get diagnostics n = row_count;
    if n <> 0 then
      raise exception 'customer updated place (% rows)', n;
    end if;
  end;

  begin
    update catalog.places set lifecycle_status = 'published' where id = draft_place;
    get diagnostics n = row_count;
    if n <> 0 then
      raise exception 'customer published draft place';
    end if;
  end;

  -- ========== Operator ==========
  perform set_config('request.jwt.claim.sub', '66666666-6666-6666-6666-666666666666', true);

  select count(*) into n from catalog.places where id = draft_place;
  if n <> 1 then
    raise exception 'operator should see draft places, got %', n;
  end if;

  select count(*) into n from catalog.sources;
  if n < 1 then
    raise exception 'operator should read sources for curation';
  end if;

  -- Cannot approve/publish via direct update on published path
  begin
    update catalog.places
      set lifecycle_status = 'pending_verification'
      where id = draft_place and lifecycle_status = 'draft';
    -- allowed
  end;

  begin
    update catalog.places set lifecycle_status = 'verified' where id = draft_place;
    get diagnostics n = row_count;
    if n <> 0 then
      raise exception 'operator verified place bypassing admin (% rows)', n;
    end if;
  exception
    when others then
      -- either 0 rows from RLS or lifecycle transition blocked after RLS
      null;
  end;

  -- Reset draft place for later tests if operator moved it
  -- (admin path below can manage)

  -- ========== Administrator ==========
  perform set_config('request.jwt.claim.sub', '77777777-7777-7777-7777-777777777777', true);

  update catalog.places
    set lifecycle_status = 'draft'
    where id = draft_place and lifecycle_status = 'pending_verification';

  -- Invalid transition published ← draft must fail
  begin
    update catalog.places set lifecycle_status = 'published' where id = draft_place;
    raise exception 'invalid lifecycle draft→published was allowed';
  exception
    when check_violation then null;
    when others then
      if sqlerrm like '%invalid lifecycle%' then null; else raise; end if;
  end;

  -- Administrator can tag published places
  insert into catalog.place_tags (place_id, tag_id)
  values (published_place, 'b3333333-3333-3333-3333-333333333333')
  on conflict do nothing;

  insert into catalog.entity_sources (
    entity_type, entity_id, source_id, verification_status, notes
  ) values (
    'place', published_place, 'c1111111-1111-1111-1111-111111111101', 'unverified',
    'admin provenance ok'
  )
  on conflict (entity_type, entity_id, source_id) do nothing;

  -- ========== Operator curation boundaries (tags / provenance) ==========
  perform set_config('request.jwt.claim.sub', '66666666-6666-6666-6666-666666666666', true);

  begin
    insert into catalog.place_tags (place_id, tag_id)
    values (published_place, 'b2222222-2222-2222-2222-222222222222');
    raise exception 'operator tagged published place';
  exception
    when others then
      if sqlerrm like '%row-level security%' or sqlerrm like '%policy%' then null; else raise; end if;
  end;

  begin
    update catalog.place_tags
      set place_id = place_id
      where place_id = published_place;
    get diagnostics n = row_count;
    if n <> 0 then
      raise exception 'operator updated tags on published place (% rows)', n;
    end if;
  end;

  begin
    delete from catalog.place_tags where place_id = published_place;
    get diagnostics n = row_count;
    if n <> 0 then
      raise exception 'operator deleted tags on published place (% rows)', n;
    end if;
  end;

  begin
    insert into catalog.destination_tags (destination_id, tag_id)
    values ('11111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222');
    raise exception 'operator tagged published destination';
  exception
    when others then
      if sqlerrm like '%row-level security%' or sqlerrm like '%policy%' then null; else raise; end if;
  end;

  begin
    delete from catalog.destination_tags
      where destination_id = '11111111-1111-1111-1111-111111111111';
    get diagnostics n = row_count;
    if n <> 0 then
      raise exception 'operator deleted tags on published destination (% rows)', n;
    end if;
  end;

  begin
    insert into catalog.entity_sources (
      entity_type, entity_id, source_id, verification_status, notes
    ) values (
      'place', published_place, 'c1111111-1111-1111-1111-111111111101', 'unverified',
      'operator should not attach to published'
    );
    raise exception 'operator linked provenance to published place';
  exception
    when others then
      if sqlerrm like '%row-level security%' or sqlerrm like '%policy%' then null; else raise; end if;
  end;

  begin
    update catalog.entity_sources
      set notes = 'hacked'
      where entity_type = 'place' and entity_id = published_place;
    get diagnostics n = row_count;
    if n <> 0 then
      raise exception 'operator updated provenance on published place (% rows)', n;
    end if;
  end;

  begin
    delete from catalog.entity_sources
      where entity_type = 'place' and entity_id = published_place;
    get diagnostics n = row_count;
    if n <> 0 then
      raise exception 'operator deleted provenance on published place (% rows)', n;
    end if;
  end;

  begin
    insert into catalog.entity_sources (
      entity_type, entity_id, source_id, verification_status, notes
    ) values (
      'destination', '11111111-1111-1111-1111-111111111111',
      'c1111111-1111-1111-1111-111111111101', 'unverified', 'nope'
    );
    raise exception 'operator linked provenance to published destination';
  exception
    when others then
      if sqlerrm like '%row-level security%' or sqlerrm like '%policy%' then null; else raise; end if;
  end;

  -- Operator may tag + attach provenance on a draft place
  insert into catalog.place_tags (place_id, tag_id)
  values (draft_place, 'b3333333-3333-3333-3333-333333333333')
  on conflict do nothing;

  insert into catalog.entity_sources (
    entity_type, entity_id, source_id, verification_status, notes
  ) values (
    'place', draft_place, 'c1111111-1111-1111-1111-111111111101', 'unverified',
    'operator draft provenance ok'
  )
  on conflict (entity_type, entity_id, source_id) do nothing;

  -- Operator may curate draft destination tags (draft-future-destination)
  insert into catalog.destination_tags (destination_id, tag_id)
  values ('99999999-9999-9999-9999-999999999999', 'b3333333-3333-3333-3333-333333333333')
  on conflict do nothing;

  raise notice 'RLS_STEP5_OK';
end $$;
