import assert from 'node:assert/strict';
import test from 'node:test';
import { AppException } from '../src/common/errors/app.exception.ts';
import { CatalogAdminService } from '../src/modules/catalog/application/catalog-admin.service.ts';
import { CatalogQueryService } from '../src/modules/catalog/application/catalog-query.service.ts';
import { toPublicCatalogCover } from '../src/modules/catalog/application/destination-cover.mapper.ts';
import { MockStorageAdapter } from '../src/infrastructure/adapters/mock/mock-storage.adapter.ts';
import { CATALOG_MEDIA_BUCKET, PLACE_COVER_BUCKET } from '../src/infrastructure/ports/storage.port.ts';
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

const placeId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

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
    id: placeId,
    slug: 'ubud-ivy-cafe',
    nameEn: 'Ivy Cafe',
    nameAr: 'مقهى آيفي',
    category: 'cafe',
    lifecycleStatus: 'published',
    publishedAt: '2026-01-01T00:00:00.000Z',
    destinationSlug: 'ubud',
  };
}

test('toPublicCatalogCover resolves place cover URL without bucket/path leak', () => {
  const storage = new MockStorageAdapter();
  const cover = toPublicCatalogCover(
    {
      storageBucket: CATALOG_MEDIA_BUCKET,
      storagePath: `places/${placeId}/cover/cccccccc-cccc-4ccc-8ccc-cccccccccccc.jpg`,
      altTextEn: 'Cafe terrace',
      altTextAr: 'تراس المقهى',
    },
    storage,
  );
  assert.equal(
    cover.url,
    `mock://storage/public/catalog-media/places/${placeId}/cover/cccccccc-cccc-4ccc-8ccc-cccccccccccc.jpg`,
  );
  assert.equal(cover.altTextEn, 'Cafe terrace');
  assert.equal(cover.altTextAr, 'تراس المقهى');
  assert.equal('storageBucket' in cover, false);
  assert.equal('storagePath' in cover, false);
});

test('uploadPlaceCover forbids operators and customers', async () => {
  const storage = new MockStorageAdapter();
  const repo = {
    getPlaceById: async () => hydrateStub(),
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
      admin.uploadPlaceCover(
        principal(['operator']),
        placeId,
        { buffer: jpegBytes(), mimetype: 'image/jpeg' },
        'Cafe cover',
      ),
    'FORBIDDEN',
  );
  await expectCode(
    () =>
      admin.uploadPlaceCover(
        principal(['customer']),
        placeId,
        { buffer: jpegBytes(), mimetype: 'image/jpeg' },
        'Cafe cover',
      ),
    'FORBIDDEN',
  );
});

test('uploadPlaceCover validates file and required EN alt', async () => {
  const storage = new MockStorageAdapter();
  const repo = {
    getPlaceById: async () => hydrateStub(),
    replacePlaceCover: async () => {
      throw new Error('should not replace');
    },
    listPlaceMedia: async () => [],
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
      admin.uploadPlaceCover(
        principal(['administrator']),
        placeId,
        { buffer: jpegBytes(), mimetype: 'image/jpeg' },
        '   ',
      ),
    'VALIDATION_FAILED',
  );
  await expectCode(
    () =>
      admin.uploadPlaceCover(
        principal(['administrator']),
        placeId,
        undefined,
        'Missing file',
      ),
    'VALIDATION_FAILED',
  );
});

test('draft place cover uses private storage and retires the old cover', async () => {
  const storage = new MockStorageAdapter();
  const oldPath = `places/${placeId}/cover/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg`;
  await storage.uploadPublicObject({
    bucket: CATALOG_MEDIA_BUCKET,
    path: oldPath,
    body: jpegBytes(),
    contentType: 'image/jpeg',
  });

  let capturedPath: string | undefined;
  const repo = {
    getPlaceById: async () => ({ ...hydrateStub(), lifecycleStatus: 'draft' }),
    replacePlaceCover: async (input: { storagePath: string; mediaId: string; storageBucket: string }) => {
      assert.equal(input.storageBucket, PLACE_COVER_BUCKET);
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
    listPlaceMedia: async () => [{
      isCover: true,
      storageBucket: PLACE_COVER_BUCKET,
      storagePath: capturedPath,
    }],
  };
  const audit = { record: async () => undefined };
  const admin = new CatalogAdminService(
    repo as never,
    audit as never,
    null,
    storage,
  );

  const result = await admin.uploadPlaceCover(
    principal(['super-administrator']),
    placeId,
    { buffer: jpegBytes(), mimetype: 'image/jpeg' },
    'Cafe cover',
  );

  assert.equal(result.lifecycleStatus, 'draft');
  assert.match(result.coverPreviewUrl ?? '', /^mock:\/\/storage\/signed/);
  assert.ok(capturedPath?.startsWith(`places/${placeId}/cover/`));
  assert.equal(storage.objects.has(`${CATALOG_MEDIA_BUCKET}:${oldPath}`), false);
  assert.equal(storage.objects.has(`${CATALOG_MEDIA_BUCKET}:${capturedPath}`), false);
  assert.equal(storage.objects.has(`${PLACE_COVER_BUCKET}:${capturedPath}`), true);
  assert.throws(() => storage.publicObjectUrl(PLACE_COVER_BUCKET, capturedPath!));
});

test('deletePlaceCover removes unreferenced storage', async () => {
  const storage = new MockStorageAdapter();
  const path = `places/${placeId}/cover/dddddddd-dddd-4ddd-8ddd-dddddddddddd.jpg`;
  await storage.uploadPublicObject({
    bucket: CATALOG_MEDIA_BUCKET,
    path,
    body: jpegBytes(),
    contentType: 'image/jpeg',
  });

  const repo = {
    getPlaceById: async () => hydrateStub(),
    deactivatePlaceCover: async () => ({
      mediaId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      storageBucket: CATALOG_MEDIA_BUCKET,
      storagePath: path,
    }),
    countActiveMediaReferences: async () => 0,
    deactivateMediaAsset: async () => undefined,
    listPlaceMedia: async () => [],
  };
  const audit = { record: async () => undefined };
  const admin = new CatalogAdminService(
    repo as never,
    audit as never,
    null,
    storage,
  );

  await admin.deletePlaceCover(principal(['administrator']), placeId);
  assert.equal(storage.objects.has(`${CATALOG_MEDIA_BUCKET}:${path}`), false);
});

test('public place list and detail attach resolved cover; legacy media remains', async () => {
  const storage = new MockStorageAdapter();
  const coverPath = `places/${placeId}/cover/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee.jpg`;
  const legacyPath = `places/${placeId}/gallery.jpg`;
  const signedUrl = `mock://storage/signed?path=${encodeURIComponent(coverPath)}&exp=300`;
  const repo = {
    listPlaces: async () => ({
      items: [hydrateStub()],
      total: 1,
      limit: 20,
      offset: 0,
    }),
    listPublicPlaceCovers: async () =>
      new Map([
        [
          placeId,
          {
            placeId,
            storageBucket: PLACE_COVER_BUCKET,
            storagePath: coverPath,
            altTextEn: 'Cafe terrace',
            altTextAr: null,
          },
        ],
      ]),
    getPlaceBySlug: async () => hydrateStub(),
    getActivePlaceCover: async () => ({
      placeId,
      storageBucket: PLACE_COVER_BUCKET,
      storagePath: coverPath,
      altTextEn: 'Cafe terrace',
      altTextAr: null,
    }),
    listPublicMediaForPlace: async () => [
      {
        id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        storageBucket: CATALOG_MEDIA_BUCKET,
        storagePath: legacyPath,
        altTextEn: 'Gallery view',
        isCover: false,
        sortOrder: 0,
      },
    ],
    listPublicTagsForPlace: async () => [],
    getPublicPlaceDetails: async () => null,
  };
  const query = new CatalogQueryService(repo as never, storage);

  const list = await query.listPublicPlaces({});
  assert.equal(list.items.length, 1);
  const listed = list.items[0] as Record<string, unknown>;
  const listCover = listed.cover as Record<string, unknown>;
  assert.equal(
    listCover.url,
    signedUrl,
  );
  assert.equal(listCover.altTextEn, 'Cafe terrace');
  assert.equal('storageBucket' in listCover, false);
  assert.equal('storagePath' in listCover, false);

  const detail = (await query.getPublicPlace('ubud-ivy-cafe')) as Record<
    string,
    unknown
  >;
  const detailCover = detail.cover as Record<string, unknown>;
  assert.equal(
    detailCover.url,
    signedUrl,
  );
  assert.equal('storageBucket' in detailCover, false);
  const media = detail.media as Array<Record<string, unknown>>;
  assert.equal(media.length, 1);
  assert.equal(media[0]?.storageBucket, CATALOG_MEDIA_BUCKET);
  assert.equal(media[0]?.storagePath, legacyPath);
});
