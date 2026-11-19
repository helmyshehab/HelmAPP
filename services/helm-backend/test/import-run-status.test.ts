import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveImportRunStatus } from '../src/modules/catalog/domain/import-run-status.ts';
import { CatalogAdminService } from '../src/modules/catalog/application/catalog-admin.service.ts';
import type { AuthPrincipal } from '../src/infrastructure/ports/auth.port.ts';
import { AppException } from '../src/common/errors/app.exception.ts';

test('resolveImportRunStatus distinguishes completed partial failed', () => {
  assert.equal(
    resolveImportRunStatus({ dryRun: true, errorCount: 0, created: 0, updated: 0 }),
    'completed',
  );
  assert.equal(
    resolveImportRunStatus({ dryRun: true, errorCount: 2, created: 0, updated: 0 }),
    'partial',
  );
  assert.equal(
    resolveImportRunStatus({ dryRun: false, errorCount: 0, created: 4, updated: 1 }),
    'completed',
  );
  assert.equal(
    resolveImportRunStatus({ dryRun: false, errorCount: 1, created: 2, updated: 0 }),
    'partial',
  );
  assert.equal(
    resolveImportRunStatus({ dryRun: false, errorCount: 3, created: 0, updated: 0 }),
    'failed',
  );
});

function principal(
  roles: AuthPrincipal['roles'],
  rolesSource: AuthPrincipal['rolesSource'] = 'database',
): AuthPrincipal {
  return {
    userId: '55555555-5555-5555-5555-555555555555',
    roles,
    rolesSource,
  };
}

test('listImportRuns requires staff database roles', async () => {
  const repo = {
    listImportRuns: async () => ({ items: [], total: 0 }),
  };
  const audit = { record: async () => undefined };
  const admin = new CatalogAdminService(repo as never, audit as never, null);

  await assert.rejects(
    () => admin.listImportRuns(principal(['customer']), {}),
    (err: unknown) => err instanceof AppException && err.code === 'FORBIDDEN',
  );

  const empty = await admin.listImportRuns(principal(['operator']), {
    limit: 10,
    offset: 0,
  });
  assert.equal(empty.total, 0);
  assert.deepEqual(empty.items, []);
});

test('getImportRun maps detail and 404', async () => {
  const repo = {
    getImportRunById: async (id: string) =>
      id === 'a1111111-1111-1111-1111-111111111111'
        ? {
            id,
            dryRun: true,
            status: 'partial',
            sourceLabel: 'demo',
            actorUserId: null,
            createdAt: new Date('2026-11-19T00:00:00.000Z'),
            summary: { wouldCreate: 1, placesInPayload: 1 },
            errorReport: [{ path: 'places.0', message: 'bad' }],
            errorCount: 1,
          }
        : null,
  };
  const audit = { record: async () => undefined };
  const admin = new CatalogAdminService(repo as never, audit as never, null);

  const detail = await admin.getImportRun(
    principal(['administrator']),
    'a1111111-1111-1111-1111-111111111111',
  );
  assert.equal(detail.status, 'partial');
  assert.equal(detail.errorCount, 1);
  assert.equal(detail.errors.length, 1);
  assert.equal(detail.summary.wouldCreate, 1);

  await assert.rejects(
    () =>
      admin.getImportRun(
        principal(['administrator']),
        'b2222222-2222-2222-2222-222222222222',
      ),
    (err: unknown) => err instanceof AppException && err.code === 'NOT_FOUND',
  );
});
