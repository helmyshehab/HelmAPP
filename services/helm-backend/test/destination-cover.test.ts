import assert from 'node:assert/strict';
import test from 'node:test';
import { AppException } from '../src/common/errors/app.exception.ts';
import { CatalogAdminService } from '../src/modules/catalog/application/catalog-admin.service.ts';
import { CatalogQueryService } from '../src/modules/catalog/application/catalog-query.service.ts';
import { toPublicDestinationCover } from '../src/modules/catalog/application/destination-cover.mapper.ts';
import { MockStorageAdapter } from '../src/infrastructure/adapters/mock/mock-storage.adapter.ts';
import {
  CATALOG_MEDIA_BUCKET,
} from '../src/infrastructure/ports/storage.port.ts';
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

const destinationId = 'df027529-5744-4486-a36d-56d2a2170a0c';

function jpegBytes(): Uint8Array {
  const body = new Uint8Array(32);
  body[0] = 0xff;
  body[1] = 0xd8;
  body[2] = 0xff;
  body[3] = 0xd9;
  return body;
}

function hydrateStub() {
  return {
    id: destinationId,
    slug: 'ubud',
    nameEn: 'Ubud',
    nameAr: 'أبود',
    countryCode: 'ID',
    lifecycleStatus: 'published',
    publishedAt: '2026-01-01T00:00:00.000Z',
    tags: [],
    sources: [],
    media: [],
  };
}

test('toPublicDestinationCover resolves URL without bucket/path leak', () => {
  const url = 'https://example.test/signed-cover';
  const cover = toPublicDestinationCover(
    {
      storageBucket: CATALOG_MEDIA_BUCKET,
      storagePath: 'destinations/df027529-5744-4486-a36d-56d2a2170a0c/cover/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.jpg',
      altTextEn: 'Rice terraces',
      altTextAr: 'مدرجات الأرز',
    },
    url,
  );
  assert.equal(
    cover.url,
    url,
  );
  assert.equal(cover.altTextEn, 'Rice terraces');
  assert.equal(cover.altTextAr, 'مدرجات الأرز');
  assert.equal('storageBucket' in cover, false);
  assert.equal('storagePath' in cover, false);
});

test('uploadDestinationCover forbids operators and customers', async () => {
  const storage = new MockStorageAdapter();
  const repo = {
    getDestinationById: async () => hydrateStub(),
  };
  const audit = { record: async () => undefined };
  const admin = new CatalogAdminService(
    repo as never,
    audit as never,
    null,
    storage,
  );

  await expectCode(
    () =>
      admin.uploadDestinationCover(
        principal(['operator']),
        destinationId,
        { buffer: jpegBytes(), mimetype: 'image/jpeg' },
        'Ubud cover',
      ),
    'FORBIDDEN',
  );
  await expectCode(
    () =>
      admin.uploadDestinationCover(
        principal(['customer']),
        destinationId,
        { buffer: jpegBytes(), mimetype: 'image/jpeg' },
        'Ubud cover',
      ),
    'FORBIDDEN',
  );
});

test('uploadDestinationCover validates file and required EN alt', async () => {
  const storage = new MockStorageAdapter();
  const repo = {
    getDestinationById: async () => hydrateStub(),
    replaceDestinationCover: async () => {
      throw new Error('should not replace');
    },
    listDestinationTags: async () => [],
    listDestinationSources: async () => [],
    listDestinationMedia: async () => [],
  };
  const audit = { record: async () => undefined };
  const admin = new CatalogAdminService(
    repo as never,
    audit as never,
    null,
    storage,
  );

  await expectCode(
    () =>
      admin.uploadDestinationCover(
        principal(['administrator']),
        destinationId,
        { buffer: jpegBytes(), mimetype: 'image/jpeg' },
        '   ',
      ),
    'VALIDATION_FAILED',
  );

  await expectCode(
    () =>
      admin.uploadDestinationCover(
        principal(['administrator']),
        destinationId,
        { buffer: Uint8Array.from([0x00, 0x01, 0x02]), mimetype: 'image/jpeg' },
        'Bad bytes',
      ),
    'VALIDATION_FAILED',
  );

  await expectCode(
    () =>
      admin.uploadDestinationCover(
        principal(['administrator']),
        destinationId,
        undefined,
        'Missing file',
      ),
    'VALIDATION_FAILED',
  );
});

test('uploadDestinationCover uploads first, replaces atomically, cleans up on DB failure', async () => {
  const storage = new MockStorageAdapter();
  let replaceCalls = 0;
  const repo = {
    getDestinationById: async () => hydrateStub(),
    replaceDestinationCover: async () => {
      replaceCalls += 1;
      throw AppException.conflict('Another cover update is in progress; retry the upload');
    },
    listDestinationTags: async () => [],
    listDestinationSources: async () => [],
    listDestinationMedia: async () => [],
  };
  const audit = { record: async () => undefined };
  const admin = new CatalogAdminService(
    repo as never,
    audit as never,
    null,
    storage,
  );

  await expectCode(
    () =>
      admin.uploadDestinationCover(
        principal(['administrator']),
        destinationId,
        { buffer: jpegBytes(), mimetype: 'image/jpeg' },
        'Ubud cover',
      ),
    'CONFLICT',
  );

  assert.equal(replaceCalls, 1);
  // Compensating cleanup removed the uploaded object.
  assert.equal(storage.objects.size, 0);
});

test('uploadDestinationCover success retires unreferenced prior cover', async () => {
  const storage = new MockStorageAdapter();
  const oldPath =
    'destinations/df027529-5744-4486-a36d-56d2a2170a0c/cover/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg';
  await storage.uploadPublicObject({
    bucket: CATALOG_MEDIA_BUCKET,
    path: oldPath,
    body: jpegBytes(),
    contentType: 'image/jpeg',
  });

  let capturedPath: string | undefined;
  const repo = {
    getDestinationById: async () => hydrateStub(),
    replaceDestinationCover: async (input: { storagePath: string; mediaId: string }) => {
      capturedPath = input.storagePath;
      return {
        mediaId: input.mediaId,
        replaced: [
          {
            mediaId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            storageBucket: CATALOG_MEDIA_BUCKET,
            storagePath: oldPath,
          },
        ],
      };
    },
    countActiveMediaReferences: async () => 0,
    deactivateMediaAsset: async () => undefined,
    listDestinationTags: async () => [],
    listDestinationSources: async () => [],
    listDestinationMedia: async () => [],
  };
  const audit = { record: async () => undefined };
  const admin = new CatalogAdminService(
    repo as never,
    audit as never,
    null,
    storage,
  );

  const result = await admin.uploadDestinationCover(
    principal(['super-administrator']),
    destinationId,
    { buffer: jpegBytes(), mimetype: 'image/jpeg' },
    'Ubud cover',
    'غطاء أبود',
  );

  assert.equal(result.lifecycleStatus, 'published');
  assert.equal(result.publishedAt, '2026-01-01T00:00:00.000Z');
  assert.ok(capturedPath?.startsWith('destinations/df027529-5744-4486-a36d-56d2a2170a0c/cover/'));
  assert.equal(storage.objects.has(`${CATALOG_MEDIA_BUCKET}:${oldPath}`), false);
  assert.equal(storage.objects.has(`${CATALOG_MEDIA_BUCKET}:${capturedPath}`), true);
});

test('uploadDestinationCover never deletes assets still referenced elsewhere', async () => {
  const storage = new MockStorageAdapter();
  const oldPath =
    'destinations/df027529-5744-4486-a36d-56d2a2170a0c/cover/cccccccc-cccc-4ccc-8ccc-cccccccccccc.jpg';
  await storage.uploadPublicObject({
    bucket: CATALOG_MEDIA_BUCKET,
    path: oldPath,
    body: jpegBytes(),
    contentType: 'image/jpeg',
  });

  let deactivated = false;
  const repo = {
    getDestinationById: async () => hydrateStub(),
    replaceDestinationCover: async (input: { mediaId: string; storagePath: string }) => ({
      mediaId: input.mediaId,
      replaced: [
        {
          mediaId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          storageBucket: CATALOG_MEDIA_BUCKET,
          storagePath: oldPath,
        },
      ],
    }),
    countActiveMediaReferences: async () => 1,
    deactivateMediaAsset: async () => {
      deactivated = true;
    },
    listDestinationTags: async () => [],
    listDestinationSources: async () => [],
    listDestinationMedia: async () => [],
  };
  const audit = { record: async () => undefined };
  const admin = new CatalogAdminService(
    repo as never,
    audit as never,
    null,
    storage,
  );

  await admin.uploadDestinationCover(
    principal(['administrator']),
    destinationId,
    { buffer: jpegBytes(), mimetype: 'image/jpeg' },
    'Shared asset',
  );

  assert.equal(deactivated, false);
  assert.equal(storage.objects.has(`${CATALOG_MEDIA_BUCKET}:${oldPath}`), true);
});

test('deleteDestinationCover requires admin and removes unreferenced storage', async () => {
  const storage = new MockStorageAdapter();
  const path =
    'destinations/df027529-5744-4486-a36d-56d2a2170a0c/cover/dddddddd-dddd-4ddd-8ddd-dddddddddddd.jpg';
  await storage.uploadPublicObject({
    bucket: CATALOG_MEDIA_BUCKET,
    path,
    body: jpegBytes(),
    contentType: 'image/jpeg',
  });

  const repo = {
    getDestinationById: async () => hydrateStub(),
    deactivateDestinationCover: async () => ({
      mediaId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      storageBucket: CATALOG_MEDIA_BUCKET,
      storagePath: path,
    }),
    countActiveMediaReferences: async () => 0,
    deactivateMediaAsset: async () => undefined,
    listDestinationTags: async () => [],
    listDestinationSources: async () => [],
    listDestinationMedia: async () => [],
  };
  const audit = { record: async () => undefined };
  const admin = new CatalogAdminService(
    repo as never,
    audit as never,
    null,
    storage,
  );

  await expectCode(
    () => admin.deleteDestinationCover(principal(['operator']), destinationId),
    'FORBIDDEN',
  );

  const result = await admin.deleteDestinationCover(
    principal(['administrator']),
    destinationId,
  );
  assert.equal(result.lifecycleStatus, 'published');
  assert.equal(storage.objects.has(`${CATALOG_MEDIA_BUCKET}:${path}`), false);
});

test('updateDestinationCoverAlt validates and forbids operators', async () => {
  const storage = new MockStorageAdapter();
  const repo = {
    getDestinationById: async () => hydrateStub(),
    updateDestinationCoverAltTexts: async () => ({ mediaId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' }),
    listDestinationTags: async () => [],
    listDestinationSources: async () => [],
    listDestinationMedia: async () => [],
  };
  const audit = { record: async () => undefined };
  const admin = new CatalogAdminService(
    repo as never,
    audit as never,
    null,
    storage,
  );

  await expectCode(
    () =>
      admin.updateDestinationCoverAlt(principal(['operator']), destinationId, {
        altTextEn: 'Nope',
      }),
    'FORBIDDEN',
  );

  await expectCode(
    () =>
      admin.updateDestinationCoverAlt(principal(['administrator']), destinationId, {
        altTextEn: '  ',
      }),
    'VALIDATION_FAILED',
  );

  const updated = await admin.updateDestinationCoverAlt(
    principal(['administrator']),
    destinationId,
    { altTextEn: 'Updated', altTextAr: null },
  );
  assert.equal(updated.slug, 'ubud');
});

test('public list/detail attach cover without N+1 and omit when missing', async () => {
  const storage = new MockStorageAdapter();
  let coverBatchCalls = 0;
  const repo = {
    listDestinations: async () => ({
      items: [
        {
          id: destinationId,
          slug: 'ubud',
          nameEn: 'Ubud',
          nameAr: 'أبود',
          countryCode: 'ID',
          lifecycleStatus: 'published',
        },
        {
          id: 'f1bbb4e3-0365-4adb-9da8-705b2be6a66f',
          slug: 'istanbul',
          nameEn: 'Istanbul',
          nameAr: 'إسطنبول',
          countryCode: 'TR',
          lifecycleStatus: 'published',
        },
      ],
      total: 2,
      limit: 20,
      offset: 0,
    }),
    listPublicDestinationCovers: async (ids: string[]) => {
      coverBatchCalls += 1;
      assert.deepEqual(ids.sort(), [
        destinationId,
        'f1bbb4e3-0365-4adb-9da8-705b2be6a66f',
      ].sort());
      return new Map([
        [
          destinationId,
          {
            destinationId,
            storageBucket: CATALOG_MEDIA_BUCKET,
            storagePath:
              'destinations/df027529-5744-4486-a36d-56d2a2170a0c/cover/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.jpg',
            altTextEn: 'Ubud',
            altTextAr: null,
          },
        ],
      ]);
    },
    getDestinationBySlug: async (slug: string) =>
      slug === 'ubud'
        ? {
            id: destinationId,
            slug: 'ubud',
            nameEn: 'Ubud',
            nameAr: 'أبود',
            countryCode: 'ID',
            lifecycleStatus: 'published',
          }
        : null,
    getActiveDestinationCover: async () => ({
      destinationId,
      storageBucket: CATALOG_MEDIA_BUCKET,
      storagePath:
        'destinations/df027529-5744-4486-a36d-56d2a2170a0c/cover/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.jpg',
      altTextEn: 'Ubud',
      altTextAr: null,
    }),
  };

  const queries = new CatalogQueryService(repo as never, storage);
  const list = await queries.listPublicDestinations({});
  assert.equal(coverBatchCalls, 1);
  assert.equal(list.items.length, 2);
  assert.match((list.items[0] as { cover?: { url: string } }).cover?.url ?? '', /^mock:\/\/storage\/signed/);
  assert.equal('cover' in (list.items[1] as object), false);
  assert.equal('storageBucket' in (list.items[0] as object), false);

  const detail = await queries.getPublicDestination('ubud');
  assert.ok((detail as { cover?: { url: string } }).cover?.url);
  assert.equal((detail as { status: string }).status, 'published');
});

test('public destinations remain compatible when storage is unavailable', async () => {
  const repo = {
    listDestinations: async () => ({
      items: [
        {
          id: destinationId,
          slug: 'ubud',
          nameEn: 'Ubud',
          nameAr: 'أبود',
          countryCode: 'ID',
          lifecycleStatus: 'published',
        },
      ],
      total: 1,
      limit: 20,
      offset: 0,
    }),
    listPublicDestinationCovers: async () =>
      new Map([
        [
          destinationId,
          {
            destinationId,
            storageBucket: CATALOG_MEDIA_BUCKET,
            storagePath: 'destinations/x/cover/y.jpg',
            altTextEn: 'Ubud',
            altTextAr: null,
          },
        ],
      ]),
  };
  const queries = new CatalogQueryService(repo as never, null);
  const list = await queries.listPublicDestinations({});
  assert.equal('cover' in (list.items[0] as object), false);
  assert.equal((list.items[0] as { slug: string }).slug, 'ubud');
});
