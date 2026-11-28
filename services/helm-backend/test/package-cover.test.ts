import assert from 'node:assert/strict';
import test from 'node:test';
import { AppException } from '../src/common/errors/app.exception.ts';
import { MockStorageAdapter } from '../src/infrastructure/adapters/mock/mock-storage.adapter.ts';
import { CATALOG_MEDIA_BUCKET, PACKAGE_COVER_BUCKET } from '../src/infrastructure/ports/storage.port.ts';
import type { AuthPrincipal } from '../src/infrastructure/ports/auth.port.ts';
import { toPublicCatalogCover } from '../src/modules/catalog/application/destination-cover.mapper.ts';
import { PackagesService } from '../src/modules/packages/application/packages.service.ts';

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

const packageId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

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
    id: packageId,
    slug: 'ubud-culture-week',
    titleEn: 'Ubud culture week',
    titleAr: 'أسبوع ثقافة أوبود',
    summaryEn: null,
    summaryAr: null,
    durationDays: 5,
    publishStatus: 'published' as const,
    destinationId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    destinationSlug: 'ubud',
    marketCode: 'EG_OUTBOUND',
    content: {
      kind: 'ubud_trip_preview',
      version: 1,
      answers: {
        budgetEgp: 85000,
        destination: 'ubud',
        travelerCount: 2,
        lifestyle: 'culture',
        nights: 2,
        amenities: ['Pool'],
      },
      selections: {
        flightId: 'economy-example',
        hotelSlug: 'ubud-village-hotel',
        includedActivitySlugs: ['ubud-sacred-monkey-forest'],
      },
      itinerary: {
        days: [
          { dayNumber: 1, stopSlugs: ['ubud-sacred-monkey-forest', 'ubud-moksa'] },
          { dayNumber: 2, stopSlugs: ['ubud-moksa'] },
        ],
      },
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function packagesService(
  repo: Record<string, unknown>,
  storage: MockStorageAdapter,
) {
  const audit = { record: async () => undefined };
  return new PackagesService(repo as never, audit as never, storage);
}

test('toPublicCatalogCover resolves package cover URL without bucket/path leak', () => {
  const url = 'https://example.test/signed-cover';
  const cover = toPublicCatalogCover(
    {
      storageBucket: PACKAGE_COVER_BUCKET,
      storagePath: `packages/${packageId}/cover/cccccccc-cccc-4ccc-8ccc-cccccccccccc.jpg`,
      altTextEn: 'Rice terraces at sunrise',
      altTextAr: null,
    },
    url,
  );
  assert.equal(cover.url, url);
  assert.equal(cover.altTextEn, 'Rice terraces at sunrise');
  assert.equal('storageBucket' in cover, false);
  assert.equal('storagePath' in cover, false);
});

test('uploadPackageCover forbids operators and customers', async () => {
  const storage = new MockStorageAdapter();
  const repo = {
    getById: async () => hydrateStub(),
  };
  const svc = packagesService(repo, storage);

  await expectCode(
    () =>
      svc.uploadPackageCover(
        principal(['operator']),
        packageId,
        { buffer: jpegBytes(), mimetype: 'image/jpeg' },
        'Package cover',
      ),
    'FORBIDDEN',
  );
  await expectCode(
    () =>
      svc.uploadPackageCover(
        principal(['customer']),
        packageId,
        { buffer: jpegBytes(), mimetype: 'image/jpeg' },
        'Package cover',
      ),
    'FORBIDDEN',
  );
});

test('uploadPackageCover validates file and required EN alt', async () => {
  const storage = new MockStorageAdapter();
  const repo = {
    getById: async () => hydrateStub(),
    replacePackageCover: async () => {
      throw new Error('should not replace');
    },
    listPackageMedia: async () => [],
  };
  const svc = packagesService(repo, storage);

  await expectCode(
    () =>
      svc.uploadPackageCover(
        principal(['administrator']),
        packageId,
        { buffer: jpegBytes(), mimetype: 'image/jpeg' },
        '   ',
      ),
    'VALIDATION_FAILED',
  );
  await expectCode(
    () =>
      svc.uploadPackageCover(
        principal(['administrator']),
        packageId,
        undefined,
        'Missing file',
      ),
    'VALIDATION_FAILED',
  );
});

test('draft package cover uses private storage and retires the old cover', async () => {
  const storage = new MockStorageAdapter();
  const oldPath = `packages/${packageId}/cover/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg`;
  await storage.uploadPublicObject({
    bucket: CATALOG_MEDIA_BUCKET,
    path: oldPath,
    body: jpegBytes(),
    contentType: 'image/jpeg',
  });

  let capturedPath: string | undefined;
  const repo = {
    getById: async () => ({ ...hydrateStub(), publishStatus: 'unpublished' }),
    replacePackageCover: async (input: { storagePath: string; mediaId: string; storageBucket: string }) => {
      assert.equal(input.storageBucket, PACKAGE_COVER_BUCKET);
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
    listPackageMedia: async () => [{
      isCover: true,
      storageBucket: PACKAGE_COVER_BUCKET,
      storagePath: capturedPath,
    }],
  };
  const svc = packagesService(repo, storage);

  const result = await svc.uploadPackageCover(
    principal(['super-administrator']),
    packageId,
    { buffer: jpegBytes(), mimetype: 'image/jpeg' },
    'Package cover',
  );

  assert.equal(result.publishStatus, 'unpublished');
  assert.match(result.coverPreviewUrl ?? '', /^mock:\/\/storage\/signed/);
  assert.ok(capturedPath?.startsWith(`packages/${packageId}/cover/`));
  assert.equal(storage.objects.has(`${CATALOG_MEDIA_BUCKET}:${oldPath}`), false);
  assert.equal(storage.objects.has(`${PACKAGE_COVER_BUCKET}:${capturedPath}`), true);
  assert.throws(() => storage.publicObjectUrl(PACKAGE_COVER_BUCKET, capturedPath!));
});

test('deletePackageCover removes unreferenced storage', async () => {
  const storage = new MockStorageAdapter();
  const path = `packages/${packageId}/cover/dddddddd-dddd-4ddd-8ddd-dddddddddddd.jpg`;
  await storage.uploadPublicObject({
    bucket: CATALOG_MEDIA_BUCKET,
    path,
    body: jpegBytes(),
    contentType: 'image/jpeg',
  });

  const repo = {
    getById: async () => hydrateStub(),
    deactivatePackageCover: async () => ({
      mediaId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      storageBucket: CATALOG_MEDIA_BUCKET,
      storagePath: path,
    }),
    countActiveMediaReferences: async () => 0,
    deactivateMediaAsset: async () => undefined,
    listPackageMedia: async () => [],
  };
  const svc = packagesService(repo, storage);

  await svc.deletePackageCover(principal(['administrator']), packageId);
  assert.equal(storage.objects.has(`${CATALOG_MEDIA_BUCKET}:${path}`), false);
});

test('public package list attaches resolved cover for published packages only', async () => {
  const storage = new MockStorageAdapter();
  const coverPath = `packages/${packageId}/cover/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee.jpg`;
  const signedUrl = `mock://storage/signed?path=${encodeURIComponent(coverPath)}&exp=300`;
  const row = hydrateStub();
  const repo = {
    list: async () => [row],
    listPublicPackageCovers: async () =>
      new Map([
        [
          packageId,
          {
            packageId,
            storageBucket: PACKAGE_COVER_BUCKET,
            storagePath: coverPath,
            altTextEn: 'Rice terraces',
            altTextAr: null,
          },
        ],
      ]),
  };
  const svc = packagesService(repo, storage);

  const list = await svc.listPublic();
  assert.equal(list.items.length, 1);
  const cover = list.items[0]?.cover as Record<string, unknown> | undefined;
  assert.equal(cover?.url, signedUrl);
  assert.equal(cover?.altTextEn, 'Rice terraces');
  assert.equal('storageBucket' in (cover ?? {}), false);
});