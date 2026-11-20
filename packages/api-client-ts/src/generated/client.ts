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
export type BootstrapCustomerProfileResponse =
  components["schemas"]["BootstrapCustomerProfileResponse"];
export type DestinationListResponse = components["schemas"]["DestinationListResponse"];
export type DestinationPublic = components["schemas"]["DestinationPublic"];
export type PlaceListResponse = components["schemas"]["PlaceListResponse"];
export type PlacePublic = components["schemas"]["PlacePublic"];
export type CategoryListResponse = components["schemas"]["CategoryListResponse"];
export type TagListResponse = components["schemas"]["TagListResponse"];
export type PlaceAdminSummary = components["schemas"]["PlaceAdminSummary"];
export type CatalogImportResult = components["schemas"]["CatalogImportResult"];
export type CatalogImportRunStatus = components["schemas"]["CatalogImportRunStatus"];
export type CatalogImportRunListItem = components["schemas"]["CatalogImportRunListItem"];
export type CatalogImportRunListResponse = components["schemas"]["CatalogImportRunListResponse"];
export type CatalogImportRunDetail = components["schemas"]["CatalogImportRunDetail"];
export type CreatePlaceRequest = components["schemas"]["CreatePlaceRequest"];
export type LifecycleTransitionRequest = components["schemas"]["LifecycleTransitionRequest"];
export type CatalogImportRequest = components["schemas"]["CatalogImportRequest"];
export type DestinationAdmin = components["schemas"]["DestinationAdmin"];
export type DestinationAdminListResponse = components["schemas"]["DestinationAdminListResponse"];
export type CreateDestinationRequest = components["schemas"]["CreateDestinationRequest"];
export type UpdateDestinationRequest = components["schemas"]["UpdateDestinationRequest"];
export type ReplaceDestinationTagsRequest = components["schemas"]["ReplaceDestinationTagsRequest"];
export type GeoCountryListResponse = components["schemas"]["GeoCountryListResponse"];
export type GeoCityListResponse = components["schemas"]["GeoCityListResponse"];
export type AuditEventListResponse = components["schemas"]["AuditEventListResponse"];
export type LifecycleStatus = components["schemas"]["LifecycleStatus"];

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
    async bootstrapCustomerProfile(
      accessToken?: string,
    ): Promise<BootstrapCustomerProfileResponse> {
      const token = accessToken ?? options.accessToken;
      if (!token) throw new Error("bootstrapCustomerProfile requires an access token");
      const res = await fetchImpl(`${base}/v1/customer/profile/bootstrap`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`bootstrapCustomerProfile failed: ${res.status}`);
      return (await res.json()) as BootstrapCustomerProfileResponse;
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
      destinationSlug?: string;
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
          destinationSlug: params?.destinationSlug,
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
    async listGeoCountries(params?: {
      active?: boolean;
      q?: string;
      limit?: number;
      offset?: number;
    }): Promise<GeoCountryListResponse> {
      return getJson<GeoCountryListResponse>(
        `/v1/geo/countries${qs({
          active: params?.active,
          q: params?.q,
          limit: params?.limit,
          offset: params?.offset,
        })}`,
      );
    },
    async listGeoCities(params?: {
      country?: string;
      q?: string;
      limit?: number;
      offset?: number;
    }): Promise<GeoCityListResponse> {
      return getJson<GeoCityListResponse>(
        `/v1/geo/cities${qs({
          country: params?.country,
          q: params?.q,
          limit: params?.limit,
          offset: params?.offset,
        })}`,
      );
    },
    async adminListCatalogDestinations(params?: {
      q?: string;
      country?: string;
      featured?: boolean;
      lifecycleStatus?: LifecycleStatus;
      parentId?: string;
      topLevelOnly?: boolean;
      limit?: number;
      offset?: number;
    }): Promise<DestinationAdminListResponse> {
      return getJson<DestinationAdminListResponse>(
        `/v1/admin/catalog/destinations${qs({
          q: params?.q,
          country: params?.country,
          featured: params?.featured,
          lifecycleStatus: params?.lifecycleStatus,
          parentId: params?.parentId,
          topLevelOnly: params?.topLevelOnly,
          limit: params?.limit,
          offset: params?.offset,
        })}`,
      );
    },
    async adminGetCatalogDestination(id: string): Promise<DestinationAdmin> {
      return getJson<DestinationAdmin>(
        `/v1/admin/catalog/destinations/${encodeURIComponent(id)}`,
      );
    },
    async adminCreateCatalogDestination(
      body: CreateDestinationRequest,
    ): Promise<DestinationAdmin> {
      return sendJson<DestinationAdmin>("/v1/admin/catalog/destinations", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    async adminUpdateCatalogDestination(
      id: string,
      body: UpdateDestinationRequest,
    ): Promise<DestinationAdmin> {
      return sendJson<DestinationAdmin>(
        `/v1/admin/catalog/destinations/${encodeURIComponent(id)}`,
        { method: "PATCH", body: JSON.stringify(body) },
      );
    },
    async adminTransitionCatalogDestination(
      id: string,
      body: LifecycleTransitionRequest,
    ): Promise<DestinationAdmin> {
      return sendJson<DestinationAdmin>(
        `/v1/admin/catalog/destinations/${encodeURIComponent(id)}/transition`,
        { method: "POST", body: JSON.stringify(body) },
      );
    },
    async adminReplaceCatalogDestinationTags(
      id: string,
      body: ReplaceDestinationTagsRequest,
    ): Promise<DestinationAdmin> {
      return sendJson<DestinationAdmin>(
        `/v1/admin/catalog/destinations/${encodeURIComponent(id)}/tags`,
        { method: "PUT", body: JSON.stringify(body) },
      );
    },
    async adminListAuditEvents(params: {
      entityType: string;
      entityId: string;
      limit?: number;
      offset?: number;
    }): Promise<AuditEventListResponse> {
      return getJson<AuditEventListResponse>(
        `/v1/admin/audit-events${qs({
          entityType: params.entityType,
          entityId: params.entityId,
          limit: params.limit,
          offset: params.offset,
        })}`,
      );
    },
    async adminListCatalogPlaces(params?: {
      category?: string;
      q?: string;
      limit?: number;
      offset?: number;
    }): Promise<PlaceListResponse> {
      return getJson<PlaceListResponse>(
        `/v1/admin/catalog/places${qs({
          category: params?.category,
          q: params?.q,
          limit: params?.limit,
          offset: params?.offset,
        })}`,
      );
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
    async adminListCatalogImportRuns(params?: {
      status?: CatalogImportRunStatus;
      dryRun?: boolean;
      sourceLabel?: string;
      limit?: number;
      offset?: number;
    }): Promise<CatalogImportRunListResponse> {
      return getJson<CatalogImportRunListResponse>(
        `/v1/admin/catalog/import-runs${qs({
          status: params?.status,
          dryRun: params?.dryRun,
          sourceLabel: params?.sourceLabel,
          limit: params?.limit,
          offset: params?.offset,
        })}`,
      );
    },
    async adminGetCatalogImportRun(id: string): Promise<CatalogImportRunDetail> {
      return getJson<CatalogImportRunDetail>(
        `/v1/admin/catalog/import-runs/${encodeURIComponent(id)}`,
      );
    },
  };
}
