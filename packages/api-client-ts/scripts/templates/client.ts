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
export type TripDraft = components["schemas"]["TripDraft"];
export type TripDraftQuote = components["schemas"]["TripDraftQuote"];
export type DemoTripBooking = components["schemas"]["DemoTripBooking"];
export type DemoBookingService = components["schemas"]["DemoBookingService"];
export type DemoTripBookingList = components["schemas"]["DemoTripBookingList"];
export type StaffDemoTripBooking = components["schemas"]["StaffDemoTripBooking"];
export type StaffDemoTripBookingList = components["schemas"]["StaffDemoTripBookingList"];
export type CreateDemoTripBookingRequest = components["schemas"]["CreateDemoTripBookingRequest"];
export type TripDraftListResponse = components["schemas"]["TripDraftListResponse"];
export type CreateTripDraftRequest = components["schemas"]["CreateTripDraftRequest"];
export type UpdateTripDraftRequest = components["schemas"]["UpdateTripDraftRequest"];
export type TripDraftItineraryResponse =
  components["schemas"]["TripDraftItineraryResponse"];
export type TripDraftItineraryDay = components["schemas"]["TripDraftItineraryDay"];
export type TripDraftItineraryItem = components["schemas"]["TripDraftItineraryItem"];
export type DestinationListResponse = components["schemas"]["DestinationListResponse"];
export type DestinationPublic = components["schemas"]["DestinationPublic"];
export type DestinationCoverPublic = components["schemas"]["DestinationCoverPublic"];
export type UpdateDestinationCoverAltRequest =
  components["schemas"]["UpdateDestinationCoverAltRequest"];
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
    async listTripDrafts(accessToken?: string): Promise<TripDraftListResponse> {
      const token = accessToken ?? options.accessToken;
      if (!token) throw new Error("listTripDrafts requires an access token");
      const res = await fetchImpl(`${base}/v1/trips/drafts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`listTripDrafts failed: ${res.status}`);
      return (await res.json()) as TripDraftListResponse;
    },
    async createTripDraft(
      body: CreateTripDraftRequest,
      accessToken?: string,
    ): Promise<TripDraft> {
      const token = accessToken ?? options.accessToken;
      if (!token) throw new Error("createTripDraft requires an access token");
      return sendJson<TripDraft>("/v1/trips/drafts", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
    },
    async getTripDraft(id: string, accessToken?: string): Promise<TripDraft> {
      const token = accessToken ?? options.accessToken;
      if (!token) throw new Error("getTripDraft requires an access token");
      const res = await fetchImpl(`${base}/v1/trips/drafts/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`getTripDraft failed: ${res.status}`);
      return (await res.json()) as TripDraft;
    },
    async getTripDraftItinerary(
      id: string,
      accessToken?: string,
    ): Promise<TripDraftItineraryResponse> {
      const token = accessToken ?? options.accessToken;
      if (!token) throw new Error("getTripDraftItinerary requires an access token");
      const res = await fetchImpl(
        `${base}/v1/trips/drafts/${encodeURIComponent(id)}/itinerary`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) throw new Error(`getTripDraftItinerary failed: ${res.status}`);
      return (await res.json()) as TripDraftItineraryResponse;
    },
    async listStaffDemoTripBookings(id?: string): Promise<StaffDemoTripBookingList> {
      if (!options.accessToken) throw new Error("listStaffDemoTripBookings requires an access token");
      const query = id ? `?id=${encodeURIComponent(id)}` : "";
      const res = await fetchImpl(`${base}/v1/admin/trips/demo-bookings${query}`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${options.accessToken}` },
      });
      if (!res.ok) throw new Error(`listStaffDemoTripBookings failed: ${res.status}`);
      return (await res.json()) as StaffDemoTripBookingList;
    },
    async confirmDemoBookingService(
      id: string,
      kind: DemoBookingService["kind"],
      accessToken?: string,
    ): Promise<DemoTripBooking> {
      const token = accessToken ?? options.accessToken;
      if (!token) throw new Error("confirmDemoBookingService requires an access token");
      const path = `/v1/admin/trips/demo-bookings/${encodeURIComponent(id)}/services/${encodeURIComponent(kind)}`;
      const res = await fetchImpl(`${base}${path}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`confirmDemoBookingService failed: ${res.status}`);
      return (await res.json()) as DemoTripBooking;
    },
    async listDemoTripBookings(accessToken?: string): Promise<DemoTripBookingList> {
      const token = accessToken ?? options.accessToken;
      if (!token) throw new Error("listDemoTripBookings requires an access token");
      const res = await fetchImpl(`${base}/v1/trips/demo-bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`listDemoTripBookings failed: ${res.status}`);
      return (await res.json()) as DemoTripBookingList;
    },
    async createDemoTripBooking(
      body: CreateDemoTripBookingRequest,
      accessToken?: string,
    ): Promise<DemoTripBooking> {
      const token = accessToken ?? options.accessToken;
      if (!token) throw new Error("createDemoTripBooking requires an access token");
      const res = await fetchImpl(`${base}/v1/trips/demo-bookings`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`createDemoTripBooking failed: ${res.status}`);
      return (await res.json()) as DemoTripBooking;
    },
    async createTripDraftQuote(
      id: string,
      accessToken?: string,
      expectedConstraints?: Record<string, unknown>,
    ): Promise<TripDraftQuote> {
      const token = accessToken ?? options.accessToken;
      if (!token) throw new Error("createTripDraftQuote requires an access token");
      const res = await fetchImpl(`${base}/v1/trips/drafts/${encodeURIComponent(id)}/quote`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(expectedConstraints === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: expectedConstraints === undefined ? undefined : JSON.stringify({ expectedConstraints }),
      });
      if (!res.ok) throw new Error(`createTripDraftQuote failed: ${res.status}`);
      return (await res.json()) as TripDraftQuote;
    },
    async getTripDraftQuote(id: string, accessToken?: string): Promise<TripDraftQuote> {
      const token = accessToken ?? options.accessToken;
      if (!token) throw new Error("getTripDraftQuote requires an access token");
      const res = await fetchImpl(`${base}/v1/trips/drafts/${encodeURIComponent(id)}/quote`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`getTripDraftQuote failed: ${res.status}`);
      return (await res.json()) as TripDraftQuote;
    },
    async updateTripDraft(
      id: string,
      body: UpdateTripDraftRequest,
      accessToken?: string,
    ): Promise<TripDraft> {
      const token = accessToken ?? options.accessToken;
      if (!token) throw new Error("updateTripDraft requires an access token");
      return sendJson<TripDraft>(`/v1/trips/drafts/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
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
    async adminUploadDestinationCover(
      id: string,
      input: {
        file: Blob;
        altTextEn: string;
        altTextAr?: string;
        fileName?: string;
      },
    ): Promise<DestinationAdmin> {
      const form = new FormData();
      form.append("file", input.file, input.fileName ?? "cover");
      form.append("altTextEn", input.altTextEn);
      if (input.altTextAr !== undefined) {
        form.append("altTextAr", input.altTextAr);
      }
      const headers = new Headers();
      if (options.accessToken) {
        headers.set("Authorization", `Bearer ${options.accessToken}`);
      }
      const path = `/v1/admin/catalog/destinations/${encodeURIComponent(id)}/cover`;
      const res = await fetchImpl(`${base}${path}`, {
        method: "POST",
        headers,
        body: form,
      });
      if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
      return (await res.json()) as DestinationAdmin;
    },
    async adminUpdateDestinationCoverAlt(
      id: string,
      body: UpdateDestinationCoverAltRequest,
    ): Promise<DestinationAdmin> {
      return sendJson<DestinationAdmin>(
        `/v1/admin/catalog/destinations/${encodeURIComponent(id)}/cover`,
        { method: "PATCH", body: JSON.stringify(body) },
      );
    },
    async adminDeleteDestinationCover(id: string): Promise<DestinationAdmin> {
      const headers = new Headers();
      if (options.accessToken) {
        headers.set("Authorization", `Bearer ${options.accessToken}`);
      }
      const path = `/v1/admin/catalog/destinations/${encodeURIComponent(id)}/cover`;
      const res = await fetchImpl(`${base}${path}`, { method: "DELETE", headers });
      if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
      return (await res.json()) as DestinationAdmin;
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
