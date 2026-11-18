import assert from 'node:assert/strict';
import test from 'node:test';
import { AppException } from '../src/common/errors/app.exception.ts';
import { CatalogAdminService } from '../src/modules/catalog/application/catalog-admin.service.ts';
import type { AuthPrincipal } from '../src/infrastructure/ports/auth.port.ts';

function principal(roles: AuthPrincipal['roles'], rolesSource: AuthPrincipal['rolesSource'] = 'database'): AuthPrincipal {
  return {
    userId: '55555555-5555-5555-5555-555555555555',
    roles,
    rolesSource,
  };
}

async function expectForbidden(fn: () => Promise<unknown>) {
  try {
    await fn();
    assert.fail('expected forbidden');
  } catch (err) {
    assert.ok(err instanceof AppException);
    assert.equal(err.code, 'FORBIDDEN');
  }
}

test('customer cannot create catalog places', async () => {
  const repo = {
    createPlace: async () => {
      throw new Error('should not call repo');
    },
  };
  const audit = { record: async () => undefined };
  const admin = new CatalogAdminService(repo as never, audit as never);
  await expectForbidden(() =>
    admin.createPlace(principal(['customer']), {
      destinationId: '11111111-1111-1111-1111-111111111111',
      category: 'cafe',
      slug: 'x',
      nameEn: 'X',
      nameAr: 'س',
    }),
  );
});

test('operator cannot publish', async () => {
  const repo = {
    getPlaceLifecycle: async () => ({
      id: 'a2222222-2222-2222-2222-222222222222',
      lifecycleStatus: 'approved',
      slug: 'x',
      nameEn: 'X',
    }),
    transitionPlace: async () => {
      throw new Error('should not transition');
    },
  };
  const audit = { record: async () => undefined };
  const admin = new CatalogAdminService(repo as never, audit as never);
  await expectForbidden(() =>
    admin.transitionPlace(principal(['operator']), 'a2222222-2222-2222-2222-222222222222', 'published'),
  );
});

test('fail-closed when rolesSource is not database', async () => {
  const repo = {
    createPlace: async () => {
      throw new Error('should not call repo');
    },
  };
  const audit = { record: async () => undefined };
  const admin = new CatalogAdminService(repo as never, audit as never);
  await expectForbidden(() =>
    admin.createPlace(principal(['administrator'], 'fallback'), {
      destinationId: '11111111-1111-1111-1111-111111111111',
      category: 'cafe',
      slug: 'x',
      nameEn: 'X',
      nameAr: 'س',
    }),
  );
});

test('dry-run import never writes places', async () => {
  const calls: string[] = [];
  const repo = {
    findDestinationBySlug: async () => ({ id: '11111111-1111-1111-1111-111111111111', slug: 'istanbul' }),
    findPlaceByExternalKey: async () => null,
    upsertImportedPlace: async () => {
      calls.push('upsert');
      return { id: 'x', action: 'created' as const };
    },
    insertImportRun: async () => {
      calls.push('import_run');
      return { id: 'd1111111-1111-1111-1111-111111111111' };
    },
  };
  const audit = { record: async () => undefined };
  const admin = new CatalogAdminService(repo as never, audit as never);
  const result = await admin.importCatalog(
    principal(['operator']),
    {
      formatVersion: 'helm.catalog.import.v1',
      places: [
        {
          externalKey: 'test:cafe-1',
          destinationSlug: 'istanbul',
          category: 'cafe',
          subcategory: 'cafe',
          slug: 'test-cafe-1',
          nameEn: 'Test Cafe',
          nameAr: 'مقهى',
          updateIfExists: false,
        },
      ],
    },
    { dryRun: true },
  );
  assert.equal(result.dryRun, true);
  assert.equal(calls.includes('upsert'), false);
  assert.equal(calls.includes('import_run'), true);
  assert.equal((result as { wouldCreate?: number }).wouldCreate, 1);
});
