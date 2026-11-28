import { Injectable } from '@nestjs/common';
import { AppException } from '../../../common/errors/app.exception';
import { CATALOG_MEDIA_BUCKET } from '../../ports/storage.port';
import type {
  StoragePort,
  UploadPublicObjectInput,
  UploadPublicObjectResult,
} from '../../ports/storage.port';
import {
  assertCatalogMediaBucket,
  assertSafeObjectPath,
} from '../../storage/catalog-media';

/**
 * MOCK storage adapter — in-memory public objects for tests/local MVP.
 * No network I/O. Service-role semantics are not simulated beyond path checks.
 */
@Injectable()
export class MockStorageAdapter implements StoragePort {
  /** Exposed for focused tests. */
  readonly objects = new Map<string, { body: Uint8Array; contentType: string }>();

  private key(bucket: string, path: string): string {
    return `${bucket}:${path}`;
  }

  async createSignedDownloadUrl(path: string, expiresInSeconds: number, bucket = CATALOG_MEDIA_BUCKET): Promise<string> {
    const safePath = assertSafeObjectPath(path);
    assertCatalogMediaBucket(bucket);
    return `mock://storage/signed?path=${encodeURIComponent(safePath)}&exp=${expiresInSeconds}`;
  }

  async uploadPublicObject(
    input: UploadPublicObjectInput,
  ): Promise<UploadPublicObjectResult> {
    const publicUrl = this.publicObjectUrl(input.bucket, input.path);
    const { bucket, path } = this.uploadObject(input);
    return { bucket, path, publicUrl, contentType: input.contentType, byteSize: input.body.byteLength };
  }

  async uploadPrivateObject(input: UploadPublicObjectInput): Promise<void> {
    this.uploadObject(input);
  }

  private uploadObject(input: UploadPublicObjectInput) {
    const bucket = assertCatalogMediaBucket(input.bucket);
    const path = assertSafeObjectPath(input.path);
    const key = this.key(bucket, path);
    if (!input.upsert && this.objects.has(key)) {
      throw AppException.conflict(`Mock storage object already exists: ${key}`);
    }
    this.objects.set(key, {
      body: Uint8Array.from(input.body),
      contentType: input.contentType,
    });
    return { bucket, path };
  }

  async removeObject(bucket: string, path: string): Promise<void> {
    const safeBucket = assertCatalogMediaBucket(bucket);
    const safePath = assertSafeObjectPath(path);
    this.objects.delete(this.key(safeBucket, safePath));
  }

  publicObjectUrl(bucket: string, path: string): string {
    const safeBucket = assertCatalogMediaBucket(bucket);
    if (safeBucket !== CATALOG_MEDIA_BUCKET) {
      throw AppException.validation('Public URL requires the public catalog bucket');
    }
    const safePath = assertSafeObjectPath(path);
    return `mock://storage/public/${safeBucket}/${safePath}`;
  }
}
