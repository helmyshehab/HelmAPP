import assert from 'node:assert/strict';
import test from 'node:test';
import { AppException } from '../src/common/errors/app.exception.ts';
import { CatalogAdminService } from '../src/modules/catalog/application/catalog-admin.service.ts';
import type { AuthPrincipal } from '../src/infrastructure/ports/auth.port.ts';

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

async function expectCode(fn: () => Promise<unknown>, code: string) {
  try {
    await fn();
    assert.fail(`expected ${code}`);
  } catch (err) {
    assert.ok(err instanceof AppException);
    assert.equal(err.code, code);
  }
}

const draftId = 'a1111111-1111-1111-1111-111111111111';
const publishedId = 'a2222222-2222-2222-2222-222222222222';

test('createDestination always inserts draft and rejects customers', async () => {
  let insertedLifecycle: string | undefined;
  const repo = {
    countryExists: async () => true,
    getCity: async () => null,
    wouldCreateParentCycle: async () => false,
    createDestination: async () => {
      insertedLifecycle = 'draft';
      return { id: draftId, slug: 'cairo', lifecycleStatus: 'draft' };
    },
    replaceDestinationTags: async () => undefined,
    getDestinationById: async () => ({
      id: draftId,
      slug: 'cairo',
      nameEn: 'Cairo',
      nameAr: 'القاهرة',
      countryCode: 'EG',
      lifecycleStatus: 'draft',
    }),
    listDestinationTags: async () => [],
    listDestinationSources: async () => [],
    listDestinationMedia: async () => [],
  };
  const audit = { record: async () => undefined };
  const admin = new CatalogAdminService(repo as never, audit as never, null);

  await expectCode(
    () =>
      admin.createDestination(principal(['customer']), {
        slug: 'cairo',
        nameEn: 'Cairo',
        nameAr: 'القاهرة',
        countryCode: 'EG',
      }),
    'FORBIDDEN',
  );

  const created = await admin.createDestination(principal(['operator']), {
    slug: 'cairo',
    nameEn: 'Cairo',
    nameAr: 'القاهرة',
    countryCode: 'EG',
  });
  assert.equal(insertedLifecycle, 'draft');
  assert.equal(created.lifecycleStatus, 'draft');
});

test('published slug PATCH is rejected with validation error', async () => {
  const repo = {
    getDestinationById: async () => ({
      id: publishedId,
      slug: 'luxor',
      nameEn: 'Luxor',
      nameAr: 'الأقصر',
      countryCode: 'EG',
      lifecycleStatus: 'published',
      cityId: null,
      parentId: null,
    }),
    updateDestination: async () => {
      throw new Error('should not update');
    },
  };
  const audit = { record: async () => undefined };
  const admin = new CatalogAdminService(repo as never, audit as never, null);
  await expectCode(
    () =>
      admin.updateDestination(principal(['administrator']), publishedId, {
        slug: 'luxor-new',
      }),
    'VALIDATION_FAILED',
  );
});

test('parent cannot be itself', async () => {
  const repo = {
    countryExists: async () => true,
    getCity: async () => null,
    wouldCreateParentCycle: async () => {
      throw new Error('should short-circuit before cycle walk');
    },
    createDestination: async () => {
      throw new Error('should not create');
    },
  };
  const audit = { record: async () => undefined };
  const admin = new CatalogAdminService(repo as never, audit as never, null);
  // create with parentId == future id is N/A; update path:
  const updateRepo = {
    getDestinationById: async () => ({
      id: draftId,
      slug: 'aswan',
      nameEn: 'Aswan',
      nameAr: 'أسوان',
      countryCode: 'EG',
      lifecycleStatus: 'draft',
      cityId: null,
      parentId: null,
    }),
    countryExists: async () => true,
    getCity: async () => null,
    wouldCreateParentCycle: async () => false,
    updateDestination: async () => {
      throw new Error('should not update');
    },
  };
  const updateAdmin = new CatalogAdminService(updateRepo as never, audit as never, null);
  await expectCode(
    () =>
      updateAdmin.updateDestination(principal(['operator']), draftId, {
        parentId: draftId,
      }),
    'VALIDATION_FAILED',
  );
  void repo;
});

test('parent cycles are rejected', async () => {
  const repo = {
    countryExists: async () => true,
    getCity: async () => null,
    wouldCreateParentCycle: async () => true,
    createDestination: async () => {
      throw new Error('should not create');
    },
  };
  const audit = { record: async () => undefined };
  const admin = new CatalogAdminService(repo as never, audit as never, null);
  await expectCode(
    () =>
      admin.createDestination(principal(['operator']), {
        slug: 'child',
        nameEn: 'Child',
        nameAr: 'طفل',
        countryCode: 'EG',
        parentId: 'b3333333-3333-3333-3333-333333333333',
      }),
    'VALIDATION_FAILED',
  );
});

test('country/city consistency validation', async () => {
  const repo = {
    countryExists: async () => true,
    getCity: async () => ({ id: 'c4444444-4444-4444-4444-444444444444', countryCode: 'SA' }),
    wouldCreateParentCycle: async () => false,
    createDestination: async () => {
      throw new Error('should not create');
    },
  };
  const audit = { record: async () => undefined };
  const admin = new CatalogAdminService(repo as never, audit as never, null);
  await expectCode(
    () =>
      admin.createDestination(principal(['operator']), {
        slug: 'mismatched',
        nameEn: 'Mismatched',
        nameAr: 'غير متطابق',
        countryCode: 'EG',
        cityId: 'c4444444-4444-4444-4444-444444444444',
      }),
    'VALIDATION_FAILED',
  );
});

test('admin-only lifecycle targets enforced; invalid transition 400', async () => {
  const approvedRepo = {
    getDestinationLifecycle: async () => ({
      id: draftId,
      slug: 'x',
      lifecycleStatus: 'approved',
    }),
    transitionDestination: async () => {
      throw new Error('should not transition');
    },
  };
  const pendingRepo = {
    getDestinationLifecycle: async () => ({
      id: draftId,
      slug: 'x',
      lifecycleStatus: 'pending_verification',
    }),
    transitionDestination: async () => {
      throw new Error('should not transition');
    },
  };
  const draftRepo = {
    getDestinationLifecycle: async () => ({
      id: draftId,
      slug: 'x',
      lifecycleStatus: 'draft',
    }),
    transitionDestination: async () => {
      throw new Error('should not transition');
    },
  };
  const audit = { record: async () => undefined };
  const approvedAdmin = new CatalogAdminService(approvedRepo as never, audit as never, null);
  const pendingAdmin = new CatalogAdminService(pendingRepo as never, audit as never, null);
  const draftAdmin = new CatalogAdminService(draftRepo as never, audit as never, null);

  await expectCode(
    () => approvedAdmin.transitionDestination(principal(['operator']), draftId, 'published'),
    'FORBIDDEN',
  );
  await expectCode(
    () => pendingAdmin.transitionDestination(principal(['operator']), draftId, 'verified'),
    'FORBIDDEN',
  );
  await expectCode(
    () => draftAdmin.transitionDestination(principal(['administrator']), draftId, 'published'),
    'VALIDATION_FAILED',
  );
});

test('fail-closed when rolesSource is fallback', async () => {
  const repo = {
    createDestination: async () => {
      throw new Error('should not call repo');
    },
  };
  const audit = { record: async () => undefined };
  const admin = new CatalogAdminService(repo as never, audit as never, null);
  await expectCode(
    () =>
      admin.createDestination(principal(['administrator'], 'fallback'), {
        slug: 'x',
        nameEn: 'X',
        nameAr: 'س',
        countryCode: 'EG',
      }),
    'FORBIDDEN',
  );
});

test('stale lifecycle transition returns CONFLICT when expected from no longer matches', async () => {
  const repo = {
    getDestinationLifecycle: async () => ({
      id: draftId,
      slug: 'x',
      lifecycleStatus: 'draft',
    }),
    transitionDestination: async () => null,
  };
  const audit = { record: async () => undefined };
  const admin = new CatalogAdminService(repo as never, audit as never, null);
  await expectCode(
    () =>
      admin.transitionDestination(
        principal(['operator']),
        draftId,
        'pending_verification',
      ),
    'CONFLICT',
  );
});

test('tag replacement clears with empty array; operator blocked on published', async () => {
  let replacedWith: string[] | undefined;
  const draftRepo = {
    getDestinationById: async () => ({
      id: draftId,
      slug: 'x',
      lifecycleStatus: 'draft',
      nameEn: 'X',
      nameAr: 'س',
      countryCode: 'EG',
    }),
    replaceDestinationTags: async (_id: string, slugs: string[]) => {
      replacedWith = slugs;
    },
    listDestinationTags: async () => [],
    listDestinationSources: async () => [],
    listDestinationMedia: async () => [],
  };
  const audit = { record: async () => undefined };
  const draftAdmin = new CatalogAdminService(draftRepo as never, audit as never, null);
  await draftAdmin.replaceDestinationTags(principal(['operator']), draftId, []);
  assert.deepEqual(replacedWith, []);

  const publishedRepo = {
    getDestinationById: async () => ({
      id: publishedId,
      slug: 'y',
      lifecycleStatus: 'published',
      nameEn: 'Y',
      nameAr: 'ص',
      countryCode: 'EG',
    }),
    replaceDestinationTags: async () => {
      throw new Error('should not replace');
    },
  };
  const publishedAdmin = new CatalogAdminService(publishedRepo as never, audit as never, null);
  await expectCode(
    () => publishedAdmin.replaceDestinationTags(principal(['operator']), publishedId, ['beach']),
    'FORBIDDEN',
  );
});
