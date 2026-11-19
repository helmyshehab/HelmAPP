import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../src/infrastructure/adapters/drizzle/schema.ts';
import { AuditService } from '../src/modules/audit/audit.service.ts';
import {
  CatalogRepository,
  DESTINATION_PARENT_HIERARCHY_LOCK_KEY,
} from '../src/modules/catalog/infrastructure/catalog.repository.ts';
import { AppException } from '../src/common/errors/app.exception.ts';

const databaseUrl = process.env.DATABASE_URL;

type Outcome = 'ok' | 'cycle' | 'deadlock' | 'lock_timeout' | 'other';

function errorBlob(err: unknown): string {
  const parts: string[] = [];
  let cur: unknown = err;
  for (let depth = 0; cur && depth < 5; depth += 1) {
    if (cur instanceof AppException) {
      parts.push(cur.message, String(cur.detail ?? ''), cur.code);
      cur = cur.cause;
      continue;
    }
    if (cur instanceof Error) {
      parts.push(cur.message);
      cur = cur.cause;
      continue;
    }
    if (cur && typeof cur === 'object' && 'message' in cur) {
      parts.push(String((cur as { message: unknown }).message));
    }
    break;
  }
  return parts.join('\n');
}

function errorCode(err: unknown): string {
  if (err instanceof AppException) return err.code;
  let cur: unknown = err;
  for (let depth = 0; cur && depth < 5; depth += 1) {
    if (cur && typeof cur === 'object' && 'code' in cur && (cur as { code: unknown }).code) {
      return String((cur as { code: unknown }).code);
    }
    cur = cur instanceof Error ? cur.cause : undefined;
  }
  return '';
}

function classifyError(err: unknown): Exclude<Outcome, 'ok'> {
  const blob = errorBlob(err);
  const code = errorCode(err);
  if (code === '40P01' || /deadlock/i.test(blob)) return 'deadlock';
  if (code === '55P03' || /lock timeout/i.test(blob)) return 'lock_timeout';
  if (
    code === 'VALIDATION_FAILED' ||
    /hierarchy cycle/i.test(blob) ||
    /cannot reference itself/i.test(blob) ||
    /parent_not_self/i.test(blob)
  ) {
    return 'cycle';
  }
  return 'other';
}

function openClient() {
  return postgres(databaseUrl!, { max: 1, prepare: false });
}

function openRepo(client: postgres.Sql) {
  const db = drizzle(client, { schema });
  return new CatalogRepository(db as never);
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

async function readEdges(sql: postgres.Sql, a: string, b: string) {
  const edges = await sql<{ id: string; parent_id: string | null }[]>`
    select id::text as id, parent_id::text as parent_id
    from catalog.destinations
    where id in (${a}::uuid, ${b}::uuid)
  `;
  const byId = Object.fromEntries(edges.map((r) => [r.id, r.parent_id]));
  return {
    aToB: byId[a] === b,
    bToA: byId[b] === a,
    byId,
  };
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
        assert.equal(classifyError(err), 'cycle');
        return true;
      },
    );

    await assert.rejects(
      () => sql`update catalog.destinations set parent_id = ${mid}::uuid where id = ${root}::uuid`,
      (err: unknown) => {
        assert.equal(classifyError(err), 'cycle');
        return true;
      },
    );

    await assert.rejects(
      () => sql`update catalog.destinations set parent_id = ${leaf}::uuid where id = ${root}::uuid`,
      (err: unknown) => {
        assert.equal(classifyError(err), 'cycle');
        return true;
      },
    );

    const rows = await sql<{ id: string; parent_id: string | null }[]>`
      select id::text as id, parent_id::text as parent_id
      from catalog.destinations
      where id in (${root}::uuid, ${mid}::uuid, ${leaf}::uuid)
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

test('app-mediated mutual parent swaps: no deadlocks across repeated races', async (t) => {
  if (!databaseUrl) {
    t.skip('DATABASE_URL not set');
    return;
  }

  const iterations = 20;
  const tallies = { ok: 0, cycle: 0, deadlock: 0, lock_timeout: 0, other: 0 };

  for (let i = 0; i < iterations; i += 1) {
    const sqlA = openClient();
    const sqlB = openClient();
    const repoA = openRepo(sqlA);
    const repoB = openRepo(sqlB);
    const a = randomUUID();
    const b = randomUUID();
    const suffix = `${i}-${a.slice(0, 6)}`;

    try {
      await insertDraft(sqlA, a, `app-a-${suffix}`);
      await insertDraft(sqlA, b, `app-b-${suffix}`);

      let ready = 0;
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const markReady = () => {
        ready += 1;
        if (ready === 2) release();
      };

      const run = async (repo: CatalogRepository, child: string, parent: string): Promise<Outcome> => {
        markReady();
        await gate;
        try {
          await repo.updateDestination(child, { parentId: parent });
          return 'ok';
        } catch (err) {
          return classifyError(err);
        }
      };

      const [r1, r2] = await Promise.all([run(repoA, a, b), run(repoB, b, a)]);
      for (const r of [r1, r2]) tallies[r] += 1;

      assert.equal(
        [r1, r2].includes('deadlock'),
        false,
        `app-mediated swap must not deadlock (iteration ${i}: ${r1}/${r2})`,
      );
      assert.equal(
        [r1, r2].includes('lock_timeout'),
        false,
        `app-mediated swap must not lock-timeout (iteration ${i}: ${r1}/${r2})`,
      );
      assert.equal(
        [r1, r2].includes('other'),
        false,
        `unexpected error in app-mediated swap (iteration ${i}: ${r1}/${r2})`,
      );

      const oks = [r1, r2].filter((x) => x === 'ok').length;
      const cycles = [r1, r2].filter((x) => x === 'cycle').length;
      assert.equal(oks, 1, `exactly one success expected (iteration ${i}: ${r1}/${r2})`);
      assert.equal(cycles, 1, `exactly one cycle rejection expected (iteration ${i}: ${r1}/${r2})`);

      const edges = await readEdges(sqlA, a, b);
      assert.equal(edges.aToB && edges.bToA, false, `cycle must not persist (iteration ${i})`);
      assert.equal(edges.aToB || edges.bToA, true, `one parent edge must remain (iteration ${i})`);
    } finally {
      await sqlA`delete from catalog.destinations where id in (${a}::uuid, ${b}::uuid)`;
      await sqlA.end({ timeout: 5 });
      await sqlB.end({ timeout: 5 });
    }
  }

  assert.equal(tallies.deadlock, 0, `deadlock count must be 0, got ${JSON.stringify(tallies)}`);
  assert.equal(tallies.lock_timeout, 0);
  assert.equal(tallies.other, 0);
  assert.equal(tallies.ok, iterations);
  assert.equal(tallies.cycle, iterations);
  console.log(
    `app-mediated concurrency tallies (${iterations} races):`,
    tallies,
    `lockKey=${DESTINATION_PARENT_HIERARCHY_LOCK_KEY}`,
  );
});

test('direct SQL mutual swaps stay acyclic; deadlocks reported separately', async (t) => {
  if (!databaseUrl) {
    t.skip('DATABASE_URL not set');
    return;
  }

  // Honest documentation test: trigger alone does not guarantee deadlock-free
  // serialization for concurrent direct UPDATEs (row lock precedes trigger).
  const iterations = 10;
  const tallies = { ok: 0, cycle: 0, deadlock: 0, lock_timeout: 0, other: 0 };
  let cyclesFormed = 0;

  for (let i = 0; i < iterations; i += 1) {
    const sqlA = openClient();
    const sqlB = openClient();
    const a = randomUUID();
    const b = randomUUID();
    const suffix = `${i}-${a.slice(0, 6)}`;

    try {
      await insertDraft(sqlA, a, `sql-a-${suffix}`);
      await insertDraft(sqlA, b, `sql-b-${suffix}`);

      let ready = 0;
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const markReady = () => {
        ready += 1;
        if (ready === 2) release();
      };

      const run = async (
        sql: postgres.Sql,
        child: string,
        parent: string,
      ): Promise<Outcome> => {
        try {
          await sql.begin(async (tx) => {
            markReady();
            await gate;
            await tx`select pg_sleep(0.02)`;
            await tx`
              update catalog.destinations
              set parent_id = ${parent}::uuid
              where id = ${child}::uuid
            `;
          });
          return 'ok';
        } catch (err) {
          return classifyError(err);
        }
      };

      const [r1, r2] = await Promise.all([run(sqlA, a, b), run(sqlB, b, a)]);
      for (const r of [r1, r2]) tallies[r] += 1;

      assert.equal(
        [r1, r2].includes('other'),
        false,
        `unexpected direct-SQL error (iteration ${i}: ${r1}/${r2})`,
      );

      const edges = await readEdges(sqlA, a, b);
      if (edges.aToB && edges.bToA) cyclesFormed += 1;
      assert.equal(edges.aToB && edges.bToA, false, `direct SQL must not leave a cycle (iteration ${i})`);

      // At most one directed edge after both finish (ok+cycle, or ok+deadlock, etc.)
      const survivingEdges = Number(edges.aToB) + Number(edges.bToA);
      assert.ok(
        survivingEdges <= 1,
        `at most one parent edge after direct race (iteration ${i})`,
      );
    } finally {
      await sqlA`delete from catalog.destinations where id in (${a}::uuid, ${b}::uuid)`;
      await sqlA.end({ timeout: 5 });
      await sqlB.end({ timeout: 5 });
    }
  }

  assert.equal(cyclesFormed, 0);
  console.log(
    `direct-SQL concurrency tallies (${iterations} races; deadlocks allowed):`,
    tallies,
  );
  // Trigger-only path is expected to deadlock often; require we observed the
  // limitation at least once so the test documents real behavior.
  assert.ok(
    tallies.deadlock > 0 || tallies.cycle > 0,
    'direct SQL race should produce deadlock and/or cycle rejection',
  );
});

test('createDestination with parentId takes hierarchy lock path and allows valid parents', async (t) => {
  if (!databaseUrl) {
    t.skip('DATABASE_URL not set');
    return;
  }
  const sql = openClient();
  const repo = openRepo(sql);
  const parentId = randomUUID();
  const suffix = parentId.slice(0, 8);
  try {
    await insertDraft(sql, parentId, `create-parent-${suffix}`);
    const child = await repo.createDestination({
      slug: `create-child-${suffix}`,
      nameEn: 'Child',
      nameAr: 'طفل',
      countryCode: 'TR',
      parentId,
    });
    assert.equal(String(child?.parentId), parentId);

    await assert.rejects(
      () =>
        repo.updateDestination(parentId, {
          parentId: String(child!.id),
        }),
      (err: unknown) => {
        assert.equal(classifyError(err), 'cycle');
        return true;
      },
    );
  } finally {
    await sql`delete from catalog.destinations where slug like ${`create-%-${suffix}`}`;
    await sql`delete from catalog.destinations where id = ${parentId}::uuid`;
    await sql.end({ timeout: 5 });
  }
});

test('trigger functions expose a safe search_path', async (t) => {
  if (!databaseUrl) {
    t.skip('DATABASE_URL not set');
    return;
  }
  const sql = openClient();
  try {
    const rows = await sql<{ proname: string; config: string[] | null }[]>`
      select p.proname, p.proconfig as config
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'catalog'
        and p.proname in (
          'enforce_destination_parent_acyclic',
          'enforce_destination_city_country'
        )
      order by p.proname
    `;
    assert.equal(rows.length, 2);
    for (const row of rows) {
      const joined = (row.config ?? []).join(',');
      assert.match(joined, /search_path=/i, `${row.proname} missing search_path`);
    }
  } finally {
    await sql.end({ timeout: 5 });
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
  } finally {
    await sql`delete from catalog.destinations where id = ${id}::uuid`;
    await sql.end({ timeout: 5 });
  }
});
