/**
 * DO NOT EDIT.
 * Generated from packages/openapi/openapi.yaml
 * Run: pnpm --filter @helm/api-client-ts codegen
 */

import type { components } from "./schema.js";

export type HealthResponse = components["schemas"]["HealthResponse"];
export type ReadyResponse = components["schemas"]["ReadyResponse"];
export type MetaResponse = components["schemas"]["MetaResponse"];
export type MeResponse = components["schemas"]["MeResponse"];
export type DestinationListResponse = components["schemas"]["DestinationListResponse"];
export type DestinationPublic = components["schemas"]["DestinationPublic"];
export type PlaceListResponse = components["schemas"]["PlaceListResponse"];
export type PlacePublic = components["schemas"]["PlacePublic"];
export type CategoryListResponse = components["schemas"]["CategoryListResponse"];
export type TagListResponse = components["schemas"]["TagListResponse"];
export type PlaceAdminSummary = components["schemas"]["PlaceAdminSummary"];
export type CatalogImportResult = components["schemas"]["CatalogImportResult"];
export type CreatePlaceRequest = components["schemas"]["CreatePlaceRequest"];
export type LifecycleTransitionRequest = components["schemas"]["LifecycleTransitionRequest"];
export type CatalogImportRequest = components["schemas"]["CatalogImportRequest"];

export type HelmClientOptions = {
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
  accessToken?: string;
};

export function createHelmClient(options: HelmClientOptions) {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const base = options.baseUrl.replace(/\/$/, "");

  async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers);
    if (options.accessToken) {
      headers.set("Authorization", `Bearer ${options.accessToken}`);
    }
    const res = await fetchImpl(`${base}${path}`, { ...init, headers });
    if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
    return (await res.json()) as T;
  }

  async function sendJson<T>(path: string, init: RequestInit): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    if (options.accessToken) {
      headers.set("Authorization", `Bearer ${options.accessToken}`);
    }
    const res = await fetchImpl(`${base}${path}`, { ...init, headers });
    if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
    return (await res.json()) as T;
  }

  function qs(params: Record<string, string | number | boolean | undefined>): string {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined) continue;
      sp.set(k, String(v));
    }
    const s = sp.toString();
    return s ? `?${s}` : "";
  }

  return {
    async getHealth(): Promise<HealthResponse> {
      return getJson<HealthResponse>("/v1/health");
    },
    async getReady(): Promise<ReadyResponse> {
      const res = await fetchImpl(`${base}/v1/ready`);
      if (res.status !== 200 && res.status !== 503) {
        throw new Error(`getReady failed: ${res.status}`);
      }
      return (await res.json()) as ReadyResponse;
    },
    async getMeta(): Promise<MetaResponse> {
      return getJson<MetaResponse>("/v1/meta");
    },
    async getMe(accessToken?: string): Promise<MeResponse> {
      const token = accessToken ?? options.accessToken;
      if (!token) throw new Error("getMe requires an access token");
      const res = await fetchImpl(`${base}/v1/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`getMe failed: ${res.status}`);
      return (await res.json()) as MeResponse;
    },
    async listDestinations(params?: {
      country?: string;
      featured?: boolean;
      q?: string;
      limit?: number;
      offset?: number;
    }): Promise<DestinationListResponse> {
      return getJson<DestinationListResponse>(
        `/v1/destinations${qs({
          country: params?.country,
          featured: params?.featured,
          q: params?.q,
          limit: params?.limit,
          offset: params?.offset,
        })}`,
      );
    },
    async getDestination(slug: string): Promise<DestinationPublic> {
      return getJson<DestinationPublic>(`/v1/destinations/${encodeURIComponent(slug)}`);
    },
    async listCatalogPlaces(params?: {
      country?: string;
      city?: string;
      area?: string;
      category?: string;
      subcategory?: string;
      minRating?: number;
      priceLevel?: number;
      tag?: string;
      featured?: boolean;
      q?: string;
      sort?: "name" | "rating" | "updated";
      limit?: number;
      offset?: number;
    }): Promise<PlaceListResponse> {
      return getJson<PlaceListResponse>(
        `/v1/catalog/places${qs({
          country: params?.country,
          city: params?.city,
          area: params?.area,
          category: params?.category,
          subcategory: params?.subcategory,
          minRating: params?.minRating,
          priceLevel: params?.priceLevel,
          tag: params?.tag,
          featured: params?.featured,
          q: params?.q,
          sort: params?.sort,
          limit: params?.limit,
          offset: params?.offset,
        })}`,
      );
    },
    async getCatalogPlace(slug: string): Promise<PlacePublic> {
      return getJson<PlacePublic>(`/v1/catalog/places/${encodeURIComponent(slug)}`);
    },
    async listCatalogCategories(): Promise<CategoryListResponse> {
      return getJson<CategoryListResponse>("/v1/catalog/categories");
    },
    async listCatalogTags(): Promise<TagListResponse> {
      return getJson<TagListResponse>("/v1/catalog/tags");
    },
    async adminCreateCatalogPlace(body: CreatePlaceRequest): Promise<PlaceAdminSummary> {
      return sendJson<PlaceAdminSummary>("/v1/admin/catalog/places", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    async adminTransitionCatalogPlace(
      id: string,
      body: LifecycleTransitionRequest,
    ): Promise<PlaceAdminSummary> {
      return sendJson<PlaceAdminSummary>(
        `/v1/admin/catalog/places/${encodeURIComponent(id)}/transition`,
        { method: "POST", body: JSON.stringify(body) },
      );
    },
    async adminImportCatalog(body: CatalogImportRequest): Promise<CatalogImportResult> {
      return sendJson<CatalogImportResult>("/v1/admin/catalog/import", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
  };
}
