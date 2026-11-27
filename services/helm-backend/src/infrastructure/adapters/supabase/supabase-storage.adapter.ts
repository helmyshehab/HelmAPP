import { Inject, Injectable } from '@nestjs/common';
import { AppException } from '../../../common/errors/app.exception';
import { APP_ENV, type AppEnv } from '../../config/env';
import { CATALOG_MEDIA_BUCKET, PLACE_COVER_BUCKET } from '../../ports/storage.port';
import type {
  StoragePort,
  UploadPublicObjectInput,
  UploadPublicObjectResult,
} from '../../ports/storage.port';
import {
  assertCatalogMediaBucket,
  assertSafeObjectPath,
} from '../../storage/catalog-media';

type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: Uint8Array | string;
  },
) => Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  text(): Promise<string>;
  json(): Promise<unknown>;
}>;

/**
 * Thin Supabase Storage REST adapter — no @supabase/supabase-js.
 * Uses service-role key server-side only. Public URLs are permanent for public buckets.
 */
@Injectable()
export class SupabaseStorageAdapter implements StoragePort {
  private readonly baseUrl: string;
  private readonly serviceRoleKey: string;
  private fetchFn: FetchLike;

  constructor(@Inject(APP_ENV) env: AppEnv) {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        'SupabaseStorageAdapter requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
      );
    }
    this.baseUrl = env.SUPABASE_URL.replace(/\/$/, '');
    this.serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
    this.fetchFn = globalThis.fetch.bind(globalThis) as FetchLike;
  }

  /** Test seam — swap global fetch without Nest DI for the second ctor arg. */
  replaceFetchForTests(fetchFn: FetchLike): void {
    this.fetchFn = fetchFn;
  }

  async createSignedDownloadUrl(
    path: string,
    expiresInSeconds: number,
    bucketName = CATALOG_MEDIA_BUCKET,
  ): Promise<string> {
    const objectPath = assertSafeObjectPath(path);
    const bucket = assertCatalogMediaBucket(bucketName);
    const url = `${this.baseUrl}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${encodeObjectPath(objectPath)}`;
    const response = await this.fetchFn(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.serviceRoleKey}`,
        apikey: this.serviceRoleKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresIn: expiresInSeconds }),
    });
    if (!response.ok) {
      const detail = await safeErrorDetail(response);
      throw AppException.validation(
        `Failed to create signed download URL (${response.status}): ${detail}`,
      );
    }
    const payload = (await response.json()) as { signedURL?: string; signedUrl?: string };
    const signed = payload.signedURL ?? payload.signedUrl;
    if (!signed || typeof signed !== 'string') {
      throw AppException.validation('Storage sign response missing signedURL');
    }
    if (signed.startsWith('http://') || signed.startsWith('https://')) {
      return signed;
    }
    return `${this.baseUrl}/storage/v1${signed.startsWith('/') ? '' : '/'}${signed}`;
  }

  async uploadPublicObject(
    input: UploadPublicObjectInput,
  ): Promise<UploadPublicObjectResult> {
    const publicUrl = this.publicObjectUrl(input.bucket, input.path);
    const { bucket, path } = await this.uploadObject(input);
    return { bucket, path, publicUrl, contentType: input.contentType, byteSize: input.body.byteLength };
  }

  async uploadPrivateObject(input: UploadPublicObjectInput): Promise<void> {
    if (input.bucket !== PLACE_COVER_BUCKET) {
      throw AppException.validation('Expected private place cover bucket');
    }
    await this.uploadObject(input);
  }

  private async uploadObject(input: UploadPublicObjectInput) {
    const bucket = assertCatalogMediaBucket(input.bucket);
    const path = assertSafeObjectPath(input.path);
    if (!(input.body instanceof Uint8Array) || input.body.byteLength === 0) {
      throw AppException.validation('Upload body is required');
    }

    const url = `${this.baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeObjectPath(path)}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.serviceRoleKey}`,
      apikey: this.serviceRoleKey,
      'Content-Type': input.contentType,
      'x-upsert': input.upsert ? 'true' : 'false',
    };

    const response = await this.fetchFn(url, {
      method: 'POST',
      headers,
      body: input.body,
    });

    if (!response.ok) {
      const detail = await safeErrorDetail(response);
      throw AppException.validation(
        `Failed to upload object (${response.status}): ${detail}`,
      );
    }

    return { bucket, path };
  }

  async removeObject(bucket: string, path: string): Promise<void> {
    const safeBucket = assertCatalogMediaBucket(bucket);
    const safePath = assertSafeObjectPath(path);
    const url = `${this.baseUrl}/storage/v1/object/${encodeURIComponent(safeBucket)}`;
    const response = await this.fetchFn(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${this.serviceRoleKey}`,
        apikey: this.serviceRoleKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prefixes: [safePath] }),
    });

    // 404 = already gone (idempotent success)
    if (response.status === 404) return;
    if (!response.ok) {
      const detail = await safeErrorDetail(response);
      throw AppException.validation(
        `Failed to remove object (${response.status}): ${detail}`,
      );
    }
  }

  publicObjectUrl(bucket: string, path: string): string {
    const safeBucket = assertCatalogMediaBucket(bucket);
    if (safeBucket !== CATALOG_MEDIA_BUCKET) {
      throw AppException.validation('Public URL requires the public catalog bucket');
    }
    const safePath = assertSafeObjectPath(path);
    return `${this.baseUrl}/storage/v1/object/public/${encodeURIComponent(safeBucket)}/${encodeObjectPath(safePath)}`;
  }
}

function encodeObjectPath(path: string): string {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

async function safeErrorDetail(response: {
  statusText: string;
  text(): Promise<string>;
}): Promise<string> {
  try {
    const text = await response.text();
    return text.trim() || response.statusText || 'unknown error';
  } catch {
    return response.statusText || 'unknown error';
  }
}
