import assert from 'node:assert/strict';
import test from 'node:test';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from '../src/infrastructure/adapters/drizzle/schema.ts';
import { AppException } from '../src/common/errors/app.exception.ts';
import { CatalogAdminService } from '../src/modules/catalog/application/catalog-admin.service.ts';
import { CatalogQueryService } from '../src/modules/catalog/application/catalog-query.service.ts';
import { CatalogRepository } from '../src/modules/catalog/infrastructure/catalog.repository.ts';
import { AuditService } from '../src/modules/audit/audit.service.ts';
import type { AuthPrincipal } from '../src/infrastructure/ports/auth.port.ts';

const databaseUrl = process.env.DATABASE_URL;

const adminActor: AuthPrincipal = {
  userId: '77777777-7777-7777-7777-777777777777',
  roles: ['administrator'],
  rolesSource: 'database',
};

const operatorActor: AuthPrincipal = {
  userId: '66666666-6666-6666-6666-666666666666',
  roles: ['operator'],
  rolesSource: 'database',
};

const customerActor: AuthPrincipal = {
  userId: '55555555-5555-5555-5555-555555555555',
  roles: ['customer'],
  rolesSource: 'database',
};

async function withServices<T>(
  fn: (ctx: {
    admin: CatalogAdminService;
    queries: CatalogQueryService;
    audit: AuditService;
    repo: CatalogRepository;
    db: ReturnType<typeof drizzle>;
  }) => Promise<T>,
): Promise<T> {
  if (!databaseUrl) throw new Error('DATABASE_URL required');
  const client = postgres(databaseUrl, { max: 1 });
  try {
    const db = drizzle(client, { schema });
    const repo = new CatalogRepository(db as never);
    const audit = new AuditService(db as never);
    const admin = new CatalogAdminService(repo, audit, db as never);
    const queries = new CatalogQueryService(repo);
    return await fn({ admin, queries, audit, repo, db });
  } finally {
    await client.end({ timeout: 5 });
  }
}

test('destination admin CRUD, lifecycle, tags, geo, audit, authz', async (t) => {
  if (!databaseUrl) {
    t.skip('DATABASE_URL not set');
    return;
  }

  await withServices(async ({ admin, queries, audit, repo, db }) => {
    const runId = `d62${Date.now()}`;
    const slug = `dest-${runId}`;
    const parentSlug = `parent-${runId}`;
    const childSlug = `child-${runId}`;

    await db.execute(sql`
      insert into geo.countries (code, name_en, name_ar, default_currency, is_active)
      values ('EG', 'Egypt', 'مصر', 'EGP', true)
      on conflict (code) do update set is_active = true
    `);
    await db.execute(sql`
      insert into geo.cities (id, country_code, slug, name_en, name_ar, timezone, is_active)
      values (
        'c5555555-5555-5555-5555-555555555555',
        'EG', 'cairo-city', 'Cairo City', 'مدينة القاهرة', 'Africa/Cairo', true
      )
      on conflict (country_code, slug) do nothing
    `);
    await db.execute(sql`
      insert into catalog.tags (slug, name_en, name_ar, is_active)
      values
        (${`beach-${runId}`}, 'Beach', 'شاطئ', true),
        (${`culture-${runId}`}, 'Culture', 'ثقافة', true)
      on conflict (slug) do nothing
    `);

    // Customer forbidden
    try {
      await admin.createDestination(customerActor, {
        slug,
        nameEn: 'X',
        nameAr: 'س',
        countryCode: 'EG',
      });
      assert.fail('customer should be forbidden');
    } catch (err) {
      assert.ok(err instanceof AppException);
      assert.equal(err.code, 'FORBIDDEN');
    }

    const created = await admin.createDestination(operatorActor, {
      slug,
      nameEn: 'Nile Draft',
      nameAr: 'مسودة النيل',
      countryCode: 'EG',
      cityId: 'c5555555-5555-5555-5555-555555555555',
      shortDescriptionEn: 'Draft destination',
      isFeatured: false,
      tagSlugs: [`beach-${runId}`],
    });
    assert.equal(created.lifecycleStatus, 'draft');
    assert.equal(created.slug, slug);
    assert.equal((created.tags as { slug: string }[]).length, 1);

    const listed = await admin.listStaffDestinations({ q: slug, limit: 10, offset: 0 });
    assert.ok(listed.items.some((d) => String(d.slug) === slug));
    assert.ok(listed.total >= 1);

    const got = await admin.getStaffDestination(String(created.id));
    assert.equal(got.slug, slug);

    const updated = await admin.updateDestination(operatorActor, String(created.id), {
      nameEn: 'Nile Updated',
      summaryEn: 'Updated summary',
    });
    assert.equal(updated.nameEn, 'Nile Updated');

    // Operator can submit for verification
    const pending = await admin.transitionDestination(
      operatorActor,
      String(created.id),
      'pending_verification',
    );
    assert.equal(pending.lifecycleStatus, 'pending_verification');

    // Admin verifies → approves → publishes
    await admin.transitionDestination(adminActor, String(created.id), 'verified');
    await admin.transitionDestination(adminActor, String(created.id), 'approved');
    const published = await admin.transitionDestination(adminActor, String(created.id), 'published');
    assert.equal(published.lifecycleStatus, 'published');

    // Published slug PATCH → 400
    try {
      await admin.updateDestination(adminActor, String(created.id), { slug: `${slug}-renamed` });
      assert.fail('published slug change should fail');
    } catch (err) {
      assert.ok(err instanceof AppException);
      assert.equal(err.code, 'VALIDATION_FAILED');
    }

    // Invalid transition
    try {
      await admin.transitionDestination(adminActor, String(created.id), 'draft');
      assert.fail('published → draft should fail');
    } catch (err) {
      assert.ok(err instanceof AppException);
      assert.equal(err.code, 'VALIDATION_FAILED');
    }

    // Tag replace (admin can edit published)
    const replaced = await admin.replaceDestinationTags(adminActor, String(created.id), [
      `culture-${runId}`,
    ]);
    assert.deepEqual(
      (replaced.tags as { slug: string }[]).map((t) => t.slug).sort(),
      [`culture-${runId}`],
    );
    const cleared = await admin.replaceDestinationTags(adminActor, String(created.id), []);
    assert.equal((cleared.tags as unknown[]).length, 0);

    // Parent hierarchy + cycle
    const parent = await admin.createDestination(adminActor, {
      slug: parentSlug,
      nameEn: 'Parent Dest',
      nameAr: 'أب',
      countryCode: 'EG',
    });
    const child = await admin.createDestination(adminActor, {
      slug: childSlug,
      nameEn: 'Child Dest',
      nameAr: 'ابن',
      countryCode: 'EG',
      parentId: String(parent.id),
    });
    assert.equal(String(child.parentId), String(parent.id));

    try {
      await admin.updateDestination(adminActor, String(parent.id), {
        parentId: String(child.id),
      });
      assert.fail('cycle should be rejected');
    } catch (err) {
      assert.ok(err instanceof AppException);
      assert.equal(err.code, 'VALIDATION_FAILED');
    }

    try {
      await admin.updateDestination(adminActor, String(parent.id), {
        parentId: String(parent.id),
      });
      assert.fail('self-parent should be rejected');
    } catch (err) {
      assert.ok(err instanceof AppException);
      assert.equal(err.code, 'VALIDATION_FAILED');
    }

    // City/country mismatch
    await db.execute(sql`
      insert into geo.countries (code, name_en, is_active)
      values ('SA', 'Saudi Arabia', true)
      on conflict (code) do nothing
    `);
    await db.execute(sql`
      insert into geo.cities (country_code, slug, name_en, is_active)
      values ('SA', ${`riyadh-${runId}`}, 'Riyadh', true)
      on conflict (country_code, slug) do nothing
    `);
    const saCity = await db.execute(sql`
      select id from geo.cities where country_code = 'SA' and slug = ${`riyadh-${runId}`} limit 1
    `);
    const saCityId = String((saCity as unknown as { id: string }[])[0].id);
    try {
      await admin.createDestination(adminActor, {
        slug: `bad-geo-${runId}`,
        nameEn: 'Bad Geo',
        nameAr: 'جغرافيا',
        countryCode: 'EG',
        cityId: saCityId,
      });
      assert.fail('mismatched city should fail');
    } catch (err) {
      assert.ok(err instanceof AppException);
      assert.equal(err.code, 'VALIDATION_FAILED');
    }

    // Geo public endpoints
    const countries = await queries.listCountries({ limit: 50, offset: 0 });
    assert.ok(countries.items.some((c) => String(c.code) === 'EG'));
    const cities = await queries.listCities({ country: 'EG', limit: 50, offset: 0 });
    assert.ok(cities.items.some((c) => String(c.slug) === 'cairo-city'));

    // Audit list
    const events = await audit.listByEntity({
      entityType: 'destination',
      entityId: String(created.id),
      limit: 50,
      offset: 0,
    });
    assert.ok(events.total >= 1);
    assert.ok(events.items.some((e) => e.action === 'catalog.destination.create'));
    assert.ok(events.items.some((e) => e.action === 'catalog.destination.published'));

    // Public destination still works for published
    const publicDest = await queries.getPublicDestination(slug);
    assert.equal(publicDest.slug, slug);
    assert.equal(publicDest.status, 'published');

    // Cleanup
    await db.execute(sql`delete from catalog.destinations where slug in (${slug}, ${parentSlug}, ${childSlug})`);
    await db.execute(sql`delete from catalog.tags where slug in (${`beach-${runId}`}, ${`culture-${runId}`})`);
    void repo;
  });
});

test('createDestination + invalid initial tags rolls back destination row', async (t) => {
  if (!databaseUrl) {
    t.skip('DATABASE_URL not set');
    return;
  }

  await withServices(async ({ admin, db }) => {
    const runId = `atom${Date.now()}`;
    const slug = `atomic-fail-${runId}`;
    await db.execute(sql`
      insert into geo.countries (code, name_en, is_active)
      values ('EG', 'Egypt', true)
      on conflict (code) do update set is_active = true
    `);

    try {
      await admin.createDestination(adminActor, {
        slug,
        nameEn: 'Atomic Fail',
        nameAr: 'فشل',
        countryCode: 'EG',
        tagSlugs: [`does-not-exist-${runId}`],
      });
      assert.fail('invalid tags should fail create');
    } catch (err) {
      assert.ok(err instanceof AppException);
      assert.equal(err.code, 'VALIDATION_FAILED');
    }

    const leftover = await db.execute(sql`
      select id from catalog.destinations where slug = ${slug} limit 1
    `);
    assert.equal((leftover as unknown as unknown[]).length, 0);
  });
});

test('createDestination persists valid initial tags atomically', async (t) => {
  if (!databaseUrl) {
    t.skip('DATABASE_URL not set');
    return;
  }

  await withServices(async ({ admin, db }) => {
    const runId = `oktag${Date.now()}`;
    const slug = `atomic-ok-${runId}`;
    const tagA = `alpha-${runId}`;
    const tagB = `beta-${runId}`;
    await db.execute(sql`
      insert into geo.countries (code, name_en, is_active)
      values ('EG', 'Egypt', true)
      on conflict (code) do update set is_active = true
    `);
    await db.execute(sql`
      insert into catalog.tags (slug, name_en, name_ar, is_active)
      values (${tagA}, 'Alpha', 'أ', true), (${tagB}, 'Beta', 'ب', true)
      on conflict (slug) do nothing
    `);

    const created = await admin.createDestination(adminActor, {
      slug,
      nameEn: 'Atomic Ok',
      nameAr: 'نجاح',
      countryCode: 'EG',
      tagSlugs: [tagA, tagB],
    });
    assert.equal(created.lifecycleStatus, 'draft');
    assert.deepEqual(
      (created.tags as { slug: string }[]).map((x) => x.slug).sort(),
      [tagA, tagB].sort(),
    );

    await db.execute(sql`delete from catalog.destinations where id = ${String(created.id)}::uuid`);
    await db.execute(sql`delete from catalog.tags where slug in (${tagA}, ${tagB})`);
  });
});

test('PUT tag replace rolls back on invalid tag and keeps prior tags', async (t) => {
  if (!databaseUrl) {
    t.skip('DATABASE_URL not set');
    return;
  }

  await withServices(async ({ admin, db }) => {
    const runId = `repl${Date.now()}`;
    const slug = `replace-${runId}`;
    const keep = `keep-${runId}`;
    const next = `next-${runId}`;
    await db.execute(sql`
      insert into geo.countries (code, name_en, is_active)
      values ('EG', 'Egypt', true)
      on conflict (code) do update set is_active = true
    `);
    await db.execute(sql`
      insert into catalog.tags (slug, name_en, name_ar, is_active)
      values (${keep}, 'Keep', 'ك', true), (${next}, 'Next', 'ن', true)
      on conflict (slug) do nothing
    `);

    const created = await admin.createDestination(adminActor, {
      slug,
      nameEn: 'Replace Target',
      nameAr: 'استبدال',
      countryCode: 'EG',
      tagSlugs: [keep],
    });
    const id = String(created.id);

    const replaced = await admin.replaceDestinationTags(adminActor, id, [next]);
    assert.deepEqual(
      (replaced.tags as { slug: string }[]).map((x) => x.slug),
      [next],
    );

    const cleared = await admin.replaceDestinationTags(adminActor, id, []);
    assert.equal((cleared.tags as unknown[]).length, 0);

    await admin.replaceDestinationTags(adminActor, id, [keep]);
    try {
      await admin.replaceDestinationTags(adminActor, id, [`missing-${runId}`, next]);
      assert.fail('invalid tag replace should fail');
    } catch (err) {
      assert.ok(err instanceof AppException);
      assert.equal(err.code, 'VALIDATION_FAILED');
    }

    const afterFail = await admin.getStaffDestination(id);
    assert.deepEqual(
      (afterFail.tags as { slug: string }[]).map((x) => x.slug),
      [keep],
      'prior tags must remain after failed replace',
    );

    await db.execute(sql`delete from catalog.destinations where id = ${id}::uuid`);
    await db.execute(sql`delete from catalog.tags where slug in (${keep}, ${next})`);
  });
});

test('stale lifecycle transition is rejected with CONFLICT (optimistic concurrency)', async (t) => {
  if (!databaseUrl) {
    t.skip('DATABASE_URL not set');
    return;
  }

  await withServices(async ({ admin, repo, db }) => {
    const runId = `race${Date.now()}`;
    const slug = `race-${runId}`;
    await db.execute(sql`
      insert into geo.countries (code, name_en, is_active)
      values ('EG', 'Egypt', true)
      on conflict (code) do update set is_active = true
    `);

    const created = await admin.createDestination(adminActor, {
      slug,
      nameEn: 'Race Dest',
      nameAr: 'سباق',
      countryCode: 'EG',
    });
    const id = String(created.id);

    const pending = await admin.transitionDestination(adminActor, id, 'pending_verification');
    assert.equal(pending.lifecycleStatus, 'pending_verification');

    // Stale writer still believes status is draft — optimistic WHERE must no-op.
    const stale = await repo.transitionDestination({
      id,
      from: 'draft',
      to: 'rejected',
      actorId: adminActor.userId,
      rejectionReason: 'stale writer',
    });
    assert.equal(stale, null, 'optimistic update must not overwrite newer status');

    const stillPending = await admin.getStaffDestination(id);
    assert.equal(stillPending.lifecycleStatus, 'pending_verification');

    // Service maps a missed optimistic update to HTTP 409 CONFLICT.
    // Simulate: wrap repo so the first lifecycle read sees draft, but the row is already pending.
    const originalGet = repo.getDestinationLifecycle.bind(repo);
    let reads = 0;
    repo.getDestinationLifecycle = async (destId: string) => {
      reads += 1;
      if (reads === 1) {
        return { id: destId, slug, lifecycleStatus: 'draft' };
      }
      return originalGet(destId);
    };
    try {
      await admin.transitionDestination(adminActor, id, 'archived');
      assert.fail('stale service transition should conflict');
    } catch (err) {
      assert.ok(err instanceof AppException);
      assert.equal(err.code, 'CONFLICT');
      assert.equal(err.getStatus(), 409);
    } finally {
      repo.getDestinationLifecycle = originalGet;
    }

    const unchanged = await admin.getStaffDestination(id);
    assert.equal(unchanged.lifecycleStatus, 'pending_verification');

    await db.execute(sql`delete from catalog.destinations where id = ${id}::uuid`);
  });
});
