import assert from 'node:assert/strict';
import test from 'node:test';
import { AppException } from '../src/common/errors/app.exception';
import {
  CATALOG_COVER_MAX_BYTES,
  CATALOG_MEDIA_BUCKET,
} from '../src/infrastructure/ports/storage.port';
import {
  assertSafeObjectPath,
  buildDestinationCoverObjectPath,
  buildPlaceCoverObjectPath,
  buildPackageCoverObjectPath,
  detectCatalogCoverMime,
  validateCatalogCoverImage,
} from '../src/infrastructure/storage/catalog-media';

/** Minimal JPEG SOI + filler (magic-byte detectable). */
function jpegBytes(size = 32): Uint8Array {
  const body = new Uint8Array(size);
  body[0] = 0xff;
  body[1] = 0xd8;
  body[2] = 0xff;
  body[3] = 0xd9;
  return body;
}

function pngBytes(): Uint8Array {
  return Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);
}

function webpBytes(): Uint8Array {
  // RIFF....WEBP
  return Uint8Array.from([
    0x52, 0x49, 0x46, 0x46, 0x2c, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  ]);
}

test('detectCatalogCoverMime recognizes jpeg png webp', () => {
  assert.equal(detectCatalogCoverMime(jpegBytes()), 'image/jpeg');
  assert.equal(detectCatalogCoverMime(pngBytes()), 'image/png');
  assert.equal(detectCatalogCoverMime(webpBytes()), 'image/webp');
  assert.equal(detectCatalogCoverMime(Uint8Array.from([0x00, 0x01, 0x02])), null);
});

test('validateCatalogCoverImage accepts matching content and rejects mismatches', () => {
  const ok = validateCatalogCoverImage(pngBytes(), 'image/png');
  assert.equal(ok.mimeType, 'image/png');
  assert.equal(ok.extension, 'png');
  assert.equal(ok.byteSize, pngBytes().byteLength);

  assert.throws(
    () => validateCatalogCoverImage(pngBytes(), 'image/jpeg'),
    (err: unknown) => {
      assert.ok(err instanceof AppException);
      assert.equal(err.code, 'VALIDATION_FAILED');
      return true;
    },
  );

  assert.throws(
    () => validateCatalogCoverImage(Uint8Array.from([0x3c, 0x68, 0x74, 0x6d, 0x6c])),
    (err: unknown) => err instanceof AppException && err.code === 'VALIDATION_FAILED',
  );
});

test('validateCatalogCoverImage enforces 5 MiB max', () => {
  const tooBig = new Uint8Array(CATALOG_COVER_MAX_BYTES + 1);
  tooBig[0] = 0xff;
  tooBig[1] = 0xd8;
  tooBig[2] = 0xff;
  assert.throws(
    () => validateCatalogCoverImage(tooBig),
    (err: unknown) => err instanceof AppException && err.code === 'VALIDATION_FAILED',
  );
});

test('buildDestinationCoverObjectPath uses UUID segments only', () => {
  const destinationId = 'df027529-5744-4486-a36d-56d2a2170a0c';
  const objectId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
  const path = buildDestinationCoverObjectPath({
    destinationId,
    objectId,
    extension: 'jpg',
  });
  assert.equal(
    path,
    `destinations/${destinationId}/cover/${objectId}.jpg`,
  );

  assert.throws(
    () =>
      buildDestinationCoverObjectPath({
        destinationId: '../etc',
        extension: 'png',
      }),
    (err: unknown) => err instanceof AppException,
  );

  assert.throws(
    () =>
      buildDestinationCoverObjectPath({
        destinationId,
        objectId: 'not-a-uuid',
        extension: 'png',
      }),
    (err: unknown) => err instanceof AppException,
  );
});

test('buildPlaceCoverObjectPath uses UUID segments only', () => {
  const placeId = 'a1027529-5744-4486-a36d-56d2a2170a0c';
  const objectId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
  assert.equal(
    buildPlaceCoverObjectPath({ placeId, objectId, extension: 'jpg' }),
    `places/${placeId}/cover/${objectId}.jpg`,
  );
  assert.equal(
    buildPlaceCoverObjectPath({
      placeId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      objectId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      extension: 'webp',
    }),
    'places/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/cover/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.webp',
  );

  assert.throws(
    () =>
      buildPlaceCoverObjectPath({
        placeId: '../etc',
        extension: 'png',
      }),
    (err: unknown) => err instanceof AppException,
  );

  assert.throws(
    () =>
      buildPlaceCoverObjectPath({
        placeId,
        objectId: 'not-a-uuid',
        extension: 'png',
      }),
    (err: unknown) => err instanceof AppException,
  );
});

test('buildPackageCoverObjectPath uses UUID segments only', () => {
  const packageId = 'a1027529-5744-4486-a36d-56d2a2170a0c';
  const objectId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
  assert.equal(
    buildPackageCoverObjectPath({ packageId, objectId, extension: 'jpg' }),
    `packages/${packageId}/cover/${objectId}.jpg`,
  );
});

test('assertSafeObjectPath rejects traversal', () => {
  assert.equal(
    assertSafeObjectPath('destinations/a/cover/b.jpg'),
    'destinations/a/cover/b.jpg',
  );
  assert.throws(() => assertSafeObjectPath('../secret'), (err: unknown) => {
    return err instanceof AppException;
  });
  assert.throws(() => assertSafeObjectPath('/absolute'), (err: unknown) => {
    return err instanceof AppException;
  });
  assert.equal(CATALOG_MEDIA_BUCKET, 'catalog-media');
});
