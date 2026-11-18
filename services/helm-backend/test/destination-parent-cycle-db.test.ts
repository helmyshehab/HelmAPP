import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { AuditService } from '../src/modules/audit/audit.service.ts';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../src/infrastructure/adapters/drizzle/schema.ts';

const databaseUrl = process.env.DATABASE_URL;

function openClient() {
  return postgres(databaseUrl!, { max: 1, prepare: false });
}

async function insertDraft(
  sql: postgres.Sql,
  id: string,
  slug: string,
  countryCode = 'TR',
) {
  await sql`
    insert into catalog.destinations (
      id, slug, name_en, name_ar, country_code, lifecycle_status
    ) values (
      ${id}::uuid, ${slug}, ${'Node ' + slug}, ${'عقدة'}, ${countryCode}, 'draft'
    )
  `;
}

test('DB rejects self-parent, direct cycle, and indirect cycle; keeps valid trees', async (t) => {
  if (!databaseUrl) {
    t.skip('DATABASE_URL not set');
    return;
  }
  const sql = openClient();
  const root = randomUUID();
  const mid = randomUUID();
  const leaf = randomUUID();
  const suffix = root.slice(0, 8);
  try {
    await insertDraft(sql, root, `db-root-${suffix}`);
    await insertDraft(sql, mid, `db-mid-${suffix}`);
    await insertDraft(sql, leaf, `db-leaf-${suffix}`);

    await sql`update catalog.destinations set parent_id = ${root}::uuid where id = ${mid}::uuid`;
    await sql`update catalog.destinations set parent_id = ${mid}::uuid where id = ${leaf}::uuid`;

    await assert.rejects(
      () => sql`update catalog.destinations set parent_id = ${root}::uuid where id = ${root}::uuid`,
      (err: unknown) => {
        assert.match(String(err), /cannot reference itself|parent_not_self|check/i);
        return true;
      },
    );

    await assert.rejects(
      () => sql`update catalog.destinations set parent_id = ${mid}::uuid where id = ${root}::uuid`,
      (err: unknown) => {
        assert.match(String(err), /hierarchy cycle/i);
        return true;
      },
    );

    await assert.rejects(
      () => sql`update catalog.destinations set parent_id = ${leaf}::uuid where id = ${root}::uuid`,
      (err: unknown) => {
        assert.match(String(err), /hierarchy cycle/i);
        return true;
      },
    );

    const rows = await sql<{ id: string; parent_id: string | null }[]>`
      select id::text as id, parent_id::text as parent_id
      from catalog.destinations
      where id in (${root}::uuid, ${mid}::uuid, ${leaf}::uuid)
      order by slug
    `;
    const byId = Object.fromEntries(rows.map((r) => [r.id, r.parent_id]));
    assert.equal(byId[root], null);
    assert.equal(byId[mid], root);
    assert.equal(byId[leaf], mid);
  } finally {
    await sql`delete from catalog.destinations where id in (${root}::uuid, ${mid}::uuid, ${leaf}::uuid)`;
    await sql.end({ timeout: 5 });
  }
});

test('concurrent parent swaps cannot both succeed (advisory lock + cycle check)', async (t) => {
  if (!databaseUrl) {
    t.skip('DATABASE_URL not set');
    return;
  }

  // Independent connections — do not share a pool or mock locking.
  const sqlA = openClient();
  const sqlB = openClient();
  const a = randomUUID();
  const b = randomUUID();
  const suffix = a.slice(0, 8);

  try {
    await insertDraft(sqlA, a, `race-a-${suffix}`);
    await insertDraft(sqlA, b, `race-b-${suffix}`);

    // Start both transactions, then each tries to parent the other.
    // With the xact advisory lock, one commits first; the second must fail.
    const started: { resolve: () => void } = { resolve: () => undefined };
    const bothStarted = new Promise<void>((resolve) => {
      started.resolve = resolve;
    });
    let readyCount = 0;
    const markReady = () => {
      readyCount += 1;
      if (readyCount === 2) started.resolve();
    };

    const runSwap = async (
      sql: postgres.Sql,
      childId: string,
      parentId: string,
    ): Promise<'ok' | 'rejected'> => {
      try {
        await sql.begin(async (tx) => {
          markReady();
          await bothStarted;
          // Small stagger so both are inside a transaction before either UPDATE.
          await tx`select pg_sleep(0.05)`;
          await tx`
            update catalog.destinations
            set parent_id = ${parentId}::uuid
            where id = ${childId}::uuid
          `;
        });
        return 'ok';
      } catch (err) {
        assert.match(String(err), /hierarchy cycle|deadlock|could not serialize/i);
        return 'rejected';
      }
    };

    const [r1, r2] = await Promise.all([
      runSwap(sqlA, a, b),
      runSwap(sqlB, b, a),
    ]);

    const oks = [r1, r2].filter((r) => r === 'ok').length;
    const rejects = [r1, r2].filter((r) => r === 'rejected').length;
    assert.equal(oks, 1, `exactly one swap should succeed, got ok=${oks} rejected=${rejects}`);
    assert.equal(rejects, 1, `exactly one swap should be rejected, got ok=${oks} rejected=${rejects}`);

    const edges = await sqlA<{ id: string; parent_id: string | null }[]>`
      select id::text as id, parent_id::text as parent_id
      from catalog.destinations
      where id in (${a}::uuid, ${b}::uuid)
    `;
    const byId = Object.fromEntries(edges.map((r) => [r.id, r.parent_id]));
    // Exactly one directed edge; no mutual cycle.
    const aToB = byId[a] === b;
    const bToA = byId[b] === a;
    assert.equal(aToB && bToA, false, 'must not form A↔B cycle');
    assert.equal(aToB || bToA, true, 'exactly one parent edge should remain');
  } finally {
    await sqlA`delete from catalog.destinations where id in (${a}::uuid, ${b}::uuid)`;
    await sqlA.end({ timeout: 5 });
    await sqlB.end({ timeout: 5 });
  }
});

test('audit listByEntity pagination is deterministic with entity index', async (t) => {
  if (!databaseUrl) {
    t.skip('DATABASE_URL not set');
    return;
  }
  const client = openClient();
  const db = drizzle(client, { schema });
  const audit = new AuditService(db as never);
  const entityId = randomUUID();
  try {
    for (let i = 0; i < 5; i += 1) {
      await audit.record({
        action: `step6_3_test_${i}`,
        entityType: 'destination',
        entityId,
        after: { i },
      });
    }
    const page1 = await audit.listByEntity({
      entityType: 'destination',
      entityId,
      limit: 2,
      offset: 0,
    });
    const page2 = await audit.listByEntity({
      entityType: 'destination',
      entityId,
      limit: 2,
      offset: 2,
    });
    assert.equal(page1.total, 5);
    assert.equal(page1.items.length, 2);
    assert.equal(page2.items.length, 2);
    const ids = [...page1.items, ...page2.items].map((x) => x.id);
    assert.equal(new Set(ids).size, ids.length, 'pages must not overlap');
    // Stable chronological desc: createdAt/id ordering
    const all = await audit.listByEntity({
      entityType: 'destination',
      entityId,
      limit: 100,
      offset: 0,
    });
    for (let i = 1; i < all.items.length; i += 1) {
      const prev = all.items[i - 1]!;
      const cur = all.items[i]!;
      const prevKey = `${prev.createdAt}|${prev.id}`;
      const curKey = `${cur.createdAt}|${cur.id}`;
      assert.ok(prevKey >= curKey, 'must be ordered created_at desc, id desc');
    }
  } finally {
    await client`delete from ops.audit_events where entity_id = ${entityId}::uuid`;
    await client.end({ timeout: 5 });
  }
});

test('geo country FK and city/country match reject invalid references', async (t) => {
  if (!databaseUrl) {
    t.skip('DATABASE_URL not set');
    return;
  }
  const sql = openClient();
  const id = randomUUID();
  const slug = `geo-bad-${id.slice(0, 8)}`;
  try {
    await insertDraft(sql, id, slug, 'TR');

    await assert.rejects(
      () =>
        sql`update catalog.destinations set country_code = 'ZZ' where id = ${id}::uuid`,
      (err: unknown) => {
        assert.match(String(err), /foreign key|destinations_country_code_fkey/i);
        return true;
      },
    );

    await assert.rejects(
      () => sql`
        update catalog.destinations
        set city_id = 'c2222222-2222-2222-2222-222222222222'::uuid
        where id = ${id}::uuid
      `,
      (err: unknown) => {
        assert.match(String(err), /does not match country_code/i);
        return true;
      },
    );

    await sql`
      update catalog.destinations
      set city_id = 'c1111111-1111-1111-1111-111111111111'::uuid
      where id = ${id}::uuid
    `;
    const row = await sql<{ city_id: string }[]>`
      select city_id::text as city_id from catalog.destinations where id = ${id}::uuid
    `;
    assert.equal(row[0]?.city_id, 'c1111111-1111-1111-1111-111111111111');
  } finally {
    await sql`delete from catalog.destinations where id = ${id}::uuid`;
    await sql.end({ timeout: 5 });
  }
});
