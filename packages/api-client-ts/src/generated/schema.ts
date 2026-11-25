/**
 * DO NOT EDIT.
 * Generated from packages/openapi/openapi.yaml
 * Run: pnpm --filter @helm/api-client-ts codegen
 */

export interface paths {
    "/v1/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Liveness probe */
        get: operations["getHealth"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/ready": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Readiness probe */
        get: operations["getReady"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/meta": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Service metadata */
        get: operations["getMeta"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Current authenticated principal */
        get: operations["getMe"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/customer/profile/bootstrap": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Ensure Helm account and customer profile for the authenticated subject
         * @description Idempotent onboarding for a verified JWT subject.
         *     Account id is taken only from the JWT `sub` (never looked up or linked by email).
         *     Creates `identity.user_accounts` and `identity.customer_profiles` when missing.
         *     Repeated and concurrent calls are safe: existing account status, profile fields,
         *     and roles are preserved. If the JWT email is already used by another account,
         *     the caller's account is still created/ensured with a null primary email (no email linking).
         */
        post: operations["bootstrapCustomerProfile"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/trips/drafts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List the caller's private trip drafts
         * @description Returns only drafts owned by the verified JWT subject.
         *     Status is always `draft` (server-controlled).
         */
        get: operations["listTripDrafts"];
        put?: never;
        /**
         * Create a private trip draft for the authenticated subject
         * @description Ownership is taken only from the verified JWT `sub`.
         *     `destinationId` and `title` may be null or omitted.
         *     `constraints` must be a JSON object when provided (defaults to `{}`).
         *     Status is always set to `draft` by the server.
         *     When `clientRequestKey` is provided, create is idempotent for that
         *     authenticated owner: replaying the same key returns the original draft
         *     (same `id`) instead of inserting a second row.
         */
        post: operations["createTripDraft"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/trips/drafts/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get one of the caller's trip drafts by id
         * @description Returns 404 when the draft is missing or owned by another customer.
         */
        get: operations["getTripDraft"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Partially update one of the caller's trip drafts
         * @description Omitted fields are preserved. Explicit null clears nullable fields
         *     (`destinationId`, `title`). `constraints` must be a JSON object when
         *     provided. Status remains server-controlled as `draft`.
         *     Returns 404 when the draft is missing or owned by another customer.
         */
        patch: operations["updateTripDraft"];
        trace?: never;
    };
    "/v1/trips/drafts/{id}/itinerary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get the caller's private itinerary for a trip draft
         * @description Returns ordered days and nested items for a draft owned by the
         *     verified JWT subject. Days and items are ordered by ascending
         *     `position`. An owned draft with no itinerary returns `{ "days": [] }`.
         *     A day with no items returns `items: []`. Nullable `label`, `title`,
         *     and `notes` are preserved as stored.
         *     Returns 400 when `{id}` is not a UUID.
         *     Returns 404 when the draft is missing or owned by another customer
         *     (same public error in both cases).
         */
        get: operations["getTripDraftItinerary"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/destinations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List published destinations */
        get: operations["listDestinations"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/destinations/{slug}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get a published destination by slug */
        get: operations["getDestination"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/catalog/places": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Search published catalog places */
        get: operations["listCatalogPlaces"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/catalog/places/{slug}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get a published place by slug */
        get: operations["getCatalogPlace"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/catalog/categories": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Catalog category taxonomy */
        get: operations["listCatalogCategories"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/catalog/tags": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Active catalog tags */
        get: operations["listCatalogTags"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/geo/countries": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List countries (public read-only)
         * @description Canonical `geo.countries` lookup for pickers. Read-only; no write methods on `/v1/geo/*`.
         */
        get: operations["listGeoCountries"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/geo/cities": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List cities (public read-only)
         * @description Canonical `geo.cities` lookup. Prefer filtering by `country` (ISO-3166-1 alpha-2).
         *     Read-only; no write methods on `/v1/geo/*`.
         */
        get: operations["listGeoCities"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/catalog/destinations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Staff list of catalog destinations (includes unpublished) */
        get: operations["adminListCatalogDestinations"];
        put?: never;
        /**
         * Create a draft catalog destination
         * @description Always creates `lifecycleStatus=draft` for every actor (operator or administrator).
         *     Clients must not supply a lifecycle status; any such field is rejected by the implementation.
         */
        post: operations["adminCreateCatalogDestination"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/catalog/destinations/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get a catalog destination by id (staff) */
        get: operations["adminGetCatalogDestination"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Update a catalog destination
         * @description Operators may update only curatable lifecycles (draft, pending_verification, rejected).
         *     Slug may be changed only before publication. Published slugs are immutable via this
         *     endpoint; exceptional post-publish renames require a dedicated audited redirect/alias
         *     flow (not part of this contract surface).
         */
        patch: operations["adminUpdateCatalogDestination"];
        trace?: never;
    };
    "/v1/admin/catalog/destinations/{id}/transition": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Transition destination lifecycle
         * @description Follows the shared catalog lifecycle state machine (same edges as Step 5 places).
         *     Allowed from → to transitions (runtime-validated against the current DB status):
         *
         *     - draft → pending_verification, archived, rejected
         *     - pending_verification → verified, rejected, draft
         *     - verified → approved, rejected, pending_verification
         *     - approved → published, rejected, archived
         *     - published → archived
         *     - rejected → draft, pending_verification, archived
         *     - archived → draft
         *
         *     Same-status transitions (`from === to`) are allowed for every status (no-op).
         *     Invalid edges return HTTP 400.
         *     Stale concurrent updates (row lifecycle no longer matches the expected
         *     from-status used for optimistic concurrency) return HTTP 409.
         *
         *     Admin-only target statuses: verified, approved, published, archived.
         *     Operators may submit for verification (and other non-admin targets); reaching
         *     those admin-only targets requires administrator or super-administrator.
         */
        post: operations["adminTransitionCatalogDestination"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/catalog/destinations/{id}/tags": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Replace destination tags (explicit set)
         * @description Manual tag editing uses explicit replacement semantics — the provided `tagSlugs`
         *     become the full tag set for the destination (transactional). JSON import remains
         *     additive and is unchanged by this contract.
         */
        put: operations["adminReplaceCatalogDestinationTags"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/audit-events": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List audit events for an entity
         * @description Restricted to administrator and super-administrator. Operators must rely on
         *     lifecycle actor timestamps on the destination resource instead of this API.
         */
        get: operations["adminListAuditEvents"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/catalog/places": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Staff list of catalog places (includes unpublished) */
        get: operations["adminListCatalogPlaces"];
        put?: never;
        /** Create a draft catalog place */
        post: operations["adminCreateCatalogPlace"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/catalog/places/{id}/transition": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Transition place lifecycle (verify/approve/publish/reject/archive) */
        post: operations["adminTransitionCatalogPlace"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/catalog/import-runs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List catalog import runs (newest first)
         * @description Staff-readable history of dry-run and apply runs from catalog.import_runs.
         *     Does not return original JSON payloads (not stored). Use GET by id for error details.
         *     Pagination total is authoritative for the filtered set — do not invent global totals.
         */
        get: operations["adminListCatalogImportRuns"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/catalog/import-runs/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get one catalog import run with error report
         * @description Returns run metadata, summary counts, and stored error_report.
         *     Does not include the original import JSON (not persisted).
         *     For actor audit trail, use GET /v1/admin/audit-events?entityType=import_run&entityId=…
         */
        get: operations["adminGetCatalogImportRun"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/catalog/import": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Validate or apply curated JSON catalog import */
        post: operations["adminImportCatalog"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        HealthResponse: {
            /** @enum {string} */
            status: "ok";
            /** @example helm-backend */
            service: string;
            /** Format: date-time */
            timestamp?: string;
        };
        ReadyResponse: {
            /** @enum {string} */
            status: "ok" | "degraded" | "unavailable";
            /** @example helm-backend */
            service: string;
            checks: {
                /** @enum {string} */
                database: "ok" | "skipped" | "failed";
            };
            detail?: string;
            /** Format: date-time */
            timestamp?: string;
        };
        MetaResponse: {
            /** @example Helm حلم */
            name: string;
            /** @example 0.1.0 */
            version: string;
            /** @example v1 */
            apiVersion: string;
        };
        MeResponse: {
            /** Format: uuid */
            userId: string;
            /** Format: email */
            email?: string;
            roles: components["schemas"]["AppRole"][];
            /**
             * @description database = identity.user_roles; fallback = fail-closed customer-only
             * @enum {string}
             */
            rolesSource: "database" | "fallback";
        };
        BootstrapCustomerProfileResponse: {
            /**
             * Format: uuid
             * @description Always equal to the verified JWT subject
             */
            userId: string;
            /**
             * Format: email
             * @description Account primary email when present (may be omitted on email collision)
             */
            email?: string | null;
            /**
             * @description Preserved when the account already existed
             * @example active
             */
            accountStatus: string;
            displayName?: string | null;
            /** @example ar */
            preferredLocale: string;
            /** @example EGP */
            preferredCurrency: string;
            /** @description True when this call inserted the Helm account row */
            accountCreated: boolean;
            /** @description True when this call inserted the customer profile row */
            profileCreated: boolean;
        };
        /**
         * @description Server-controlled trip draft lifecycle (Draft-only in v1)
         * @enum {string}
         */
        TripDraftStatus: "draft";
        TripDraft: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            destinationId: string | null;
            title: string | null;
            /** @description Opaque JSON object (dates, budget, party, pace, interests, …) */
            constraints: {
                [key: string]: unknown;
            };
            status: components["schemas"]["TripDraftStatus"];
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
        };
        TripDraftListResponse: {
            items: components["schemas"]["TripDraft"][];
        };
        CreateTripDraftRequest: {
            /** Format: uuid */
            destinationId?: string | null;
            title?: string | null;
            /** @description Must be a JSON object; defaults to `{}` when omitted */
            constraints?: {
                [key: string]: unknown;
            };
            /**
             * @description Optional owner-scoped idempotency key. Replaying create with the
             *     same key for the same authenticated subject returns the original
             *     draft without creating another row.
             */
            clientRequestKey?: string;
        };
        /**
         * @description Partial update. Omitted fields are preserved.
         *     Explicit null clears `destinationId` or `title`.
         */
        UpdateTripDraftRequest: {
            /** Format: uuid */
            destinationId?: string | null;
            title?: string | null;
            /** @description Must be a JSON object when provided */
            constraints?: {
                [key: string]: unknown;
            };
        };
        TripDraftItineraryItem: {
            /** Format: uuid */
            id: string;
            /** @description 1-based order within the parent day */
            position: number;
            title: string | null;
            notes: string | null;
        };
        TripDraftItineraryDay: {
            /** Format: uuid */
            id: string;
            /** @description 1-based order within the parent draft */
            position: number;
            label: string | null;
            items: components["schemas"]["TripDraftItineraryItem"][];
        };
        TripDraftItineraryResponse: {
            /** @description Days ordered by ascending position */
            days: components["schemas"]["TripDraftItineraryDay"][];
        };
        /** @enum {string} */
        AppRole: "customer" | "operator" | "administrator" | "super-administrator";
        /** @enum {string} */
        LifecycleStatus: "draft" | "pending_verification" | "verified" | "approved" | "published" | "rejected" | "archived";
        /** @enum {string} */
        PlaceCategory: "accommodation" | "restaurant" | "cafe" | "bar" | "beach_club" | "attraction" | "activity" | "nightlife" | "transport";
        DestinationPublic: {
            /** Format: uuid */
            id: string;
            slug: string;
            nameEn: string;
            nameAr: string;
            summaryEn?: string;
            summaryAr?: string;
            countryCode: string;
            /** Format: uuid */
            cityId?: string;
            timezone?: string;
            latitude?: number;
            longitude?: number;
            isFeatured?: boolean;
            tags?: string[];
            /** @enum {string} */
            status: "published";
            /** Format: date-time */
            publishedAt?: string;
            /** Format: date-time */
            updatedAt?: string;
        };
        DestinationListResponse: {
            items: components["schemas"]["DestinationPublic"][];
            total: number;
            limit: number;
            offset: number;
        };
        PlacePublic: {
            /** Format: uuid */
            id: string;
            slug: string;
            nameEn: string;
            nameAr: string;
            category: components["schemas"]["PlaceCategory"];
            subcategory?: string;
            shortDescriptionEn?: string;
            shortDescriptionAr?: string;
            descriptionEn?: string;
            descriptionAr?: string;
            /** Format: uuid */
            destinationId?: string;
            destinationSlug?: string;
            countryCode?: string;
            /** Format: uuid */
            cityId?: string;
            /** Format: uuid */
            areaId?: string;
            latitude?: number;
            longitude?: number;
            addressText?: string;
            websiteUrl?: string;
            priceLevel?: number;
            ratingValue?: number;
            ratingScale?: number;
            ratingSource?: string;
            reviewCount?: number;
            /** Format: date-time */
            ratingObservedAt?: string;
            isFeatured?: boolean;
            /** @enum {string} */
            status: "published";
            /** @description Active public tag slugs (detail responses only; list may omit) */
            tags?: string[];
            /** @description Present on place detail responses only */
            media?: components["schemas"]["PublicMediaRef"][];
            /**
             * @description Category-specific public detail object for the place detail route only.
             *     `null` when no detail row exists. List endpoints omit this field.
             *     Discriminated by `type`: accommodation | dining | attraction | activity | nightlife | transport.
             */
            details?: (components["schemas"]["PlaceAccommodationDetails"] | components["schemas"]["PlaceDiningDetails"] | components["schemas"]["PlaceAttractionDetails"] | components["schemas"]["PlaceActivityDetails"] | components["schemas"]["PlaceNightlifeDetails"] | components["schemas"]["PlaceTransportDetails"]) | null;
            /** Format: date-time */
            updatedAt?: string;
        };
        PlaceAccommodationDetails: {
            /** @enum {string} */
            type: "accommodation";
            accommodationType?: string;
            starRating?: number | null;
            amenities?: string[];
            roomFeatures?: string[];
            checkInTime?: string | null;
            checkOutTime?: string | null;
        };
        PlaceDiningDetails: {
            /** @enum {string} */
            type: "dining";
            cuisineTypes?: string[];
            mealTypes?: string[];
            dietaryOptions?: string[];
            openingHours?: {
                [key: string]: unknown;
            };
        };
        PlaceAttractionDetails: {
            /** @enum {string} */
            type: "attraction";
            attractionType?: string;
            typicalDurationMinutes?: number | null;
            bookingRequired?: boolean | null;
            suitableFor?: string[];
            seasonalNotes?: string | null;
        };
        PlaceActivityDetails: {
            /** @enum {string} */
            type: "activity";
            activityType?: string;
            typicalDurationMinutes?: number | null;
            bookingRequired?: boolean | null;
            suitableFor?: string[];
            seasonalAvailability?: string | null;
        };
        PlaceNightlifeDetails: {
            /** @enum {string} */
            type: "nightlife";
            venueType?: string;
            musicGenres?: string[];
            ageRestriction?: number | null;
            eventNotes?: string | null;
        };
        PlaceTransportDetails: {
            /** @enum {string} */
            type: "transport";
            transportType?: string;
            serviceNotes?: string | null;
        };
        PlaceListResponse: {
            items: components["schemas"]["PlacePublic"][];
            total: number;
            limit: number;
            offset: number;
        };
        PublicMediaRef: {
            /** Format: uuid */
            id: string;
            storageBucket: string;
            storagePath: string;
            altTextEn?: string;
            altTextAr?: string;
            attribution?: string;
            sortOrder?: number;
            isCover?: boolean;
        };
        CategoryListResponse: {
            items: {
                id: string;
                labelEn: string;
                labelAr: string;
                categories: string[];
                subcategories: string[];
            }[];
        };
        TagListResponse: {
            items: {
                /** Format: uuid */
                id: string;
                slug: string;
                nameEn: string;
                nameAr: string;
                category?: string | null;
                isActive?: boolean;
            }[];
        };
        CreatePlaceRequest: {
            /** Format: uuid */
            destinationId: string;
            category: components["schemas"]["PlaceCategory"];
            subcategory?: string;
            slug: string;
            nameEn: string;
            nameAr: string;
            shortDescriptionEn?: string;
            descriptionEn?: string;
            externalKey?: string;
        };
        /**
         * @description Creates a destination in draft only. Do not include lifecycleStatus —
         *     the server always sets draft regardless of actor.
         */
        CreateDestinationRequest: {
            slug: string;
            nameEn: string;
            nameAr: string;
            shortDescriptionEn?: string;
            shortDescriptionAr?: string;
            summaryEn?: string;
            summaryAr?: string;
            descriptionEn?: string;
            descriptionAr?: string;
            /** @description Must resolve to an existing geo.countries row */
            countryCode: string;
            /**
             * Format: uuid
             * @description Optional; when set must belong to the same countryCode
             */
            cityId?: string | null;
            /**
             * Format: uuid
             * @description Optional parent destination; cycles are rejected
             */
            parentId?: string | null;
            timezone?: string;
            latitude?: number | null;
            longitude?: number | null;
            addressText?: string;
            /** Format: uri */
            websiteUrl?: string;
            /** @default false */
            isFeatured: boolean;
            externalKey?: string;
            /** @description Initial tags (optional); subsequent form edits use PUT replace */
            tagSlugs?: string[];
        };
        /**
         * @description Partial update. Slug changes are allowed only before publication.
         *     Published slugs are immutable through this request.
         */
        UpdateDestinationRequest: {
            /**
             * @description If the destination is published, including this field is a validation
             *     error (HTTP 400). Published slug changes require the separate audited
             *     redirect/alias operation (not this endpoint).
             */
            slug?: string;
            nameEn?: string;
            nameAr?: string;
            shortDescriptionEn?: string | null;
            shortDescriptionAr?: string | null;
            summaryEn?: string | null;
            summaryAr?: string | null;
            descriptionEn?: string | null;
            descriptionAr?: string | null;
            countryCode?: string;
            /** Format: uuid */
            cityId?: string | null;
            /** Format: uuid */
            parentId?: string | null;
            timezone?: string | null;
            latitude?: number | null;
            longitude?: number | null;
            addressText?: string | null;
            /** Format: uri */
            websiteUrl?: string | null;
            isFeatured?: boolean;
            externalKey?: string | null;
        };
        ReplaceDestinationTagsRequest: {
            /** @description Full replacement set of active tag slugs (may be empty) */
            tagSlugs: string[];
        };
        DestinationProvenance: {
            /** Format: uuid */
            id: string;
            sourceType: string;
            name: string;
            url?: string | null;
            referenceCode?: string | null;
            notes?: string | null;
            /** Format: date-time */
            collectedAt?: string | null;
            verificationStatus?: string | null;
            confidence?: number | null;
        };
        /** @description Staff destination view (includes unpublished and internal workflow fields) */
        DestinationAdmin: {
            /** Format: uuid */
            id: string;
            slug: string;
            nameEn: string;
            nameAr: string;
            shortDescriptionEn?: string | null;
            shortDescriptionAr?: string | null;
            summaryEn?: string | null;
            summaryAr?: string | null;
            descriptionEn?: string | null;
            descriptionAr?: string | null;
            countryCode: string;
            /** Format: uuid */
            cityId?: string | null;
            /** Format: uuid */
            parentId?: string | null;
            timezone?: string | null;
            latitude?: number | null;
            longitude?: number | null;
            addressText?: string | null;
            websiteUrl?: string | null;
            isFeatured?: boolean;
            externalKey?: string | null;
            lifecycleStatus: components["schemas"]["LifecycleStatus"];
            /** Format: uuid */
            verifiedBy?: string | null;
            /** Format: date-time */
            verifiedAt?: string | null;
            /** Format: uuid */
            approvedBy?: string | null;
            /** Format: date-time */
            approvedAt?: string | null;
            /** Format: uuid */
            rejectedBy?: string | null;
            /** Format: date-time */
            rejectedAt?: string | null;
            rejectionReason?: string | null;
            /** Format: date-time */
            archivedAt?: string | null;
            /** Format: date-time */
            publishedAt?: string | null;
            /** Format: date-time */
            createdAt?: string;
            /** Format: date-time */
            updatedAt?: string;
            tags?: {
                /** Format: uuid */
                id?: string;
                slug: string;
                nameEn: string;
                nameAr: string;
            }[];
            sources?: components["schemas"]["DestinationProvenance"][];
            /** @description Existing media references only (no upload in Step 6) */
            media?: components["schemas"]["PublicMediaRef"][];
        };
        DestinationAdminListResponse: {
            items: components["schemas"]["DestinationAdmin"][];
            total: number;
            limit: number;
            offset: number;
        };
        GeoCountry: {
            code: string;
            nameEn: string;
            nameAr?: string | null;
            defaultCurrency?: string | null;
            phoneCode?: string | null;
            isActive: boolean;
        };
        GeoCountryListResponse: {
            items: components["schemas"]["GeoCountry"][];
            total: number;
            limit: number;
            offset: number;
        };
        GeoCity: {
            /** Format: uuid */
            id: string;
            countryCode: string;
            /** Format: uuid */
            regionId?: string | null;
            slug: string;
            nameEn: string;
            nameAr?: string | null;
            timezone?: string | null;
            latitude?: number | null;
            longitude?: number | null;
            isActive: boolean;
        };
        GeoCityListResponse: {
            items: components["schemas"]["GeoCity"][];
            total: number;
            limit: number;
            offset: number;
        };
        AuditEvent: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            actorUserId?: string | null;
            action: string;
            entityType: string;
            /** Format: uuid */
            entityId?: string | null;
            before?: {
                [key: string]: unknown;
            } | null;
            after?: {
                [key: string]: unknown;
            } | null;
            /** Format: date-time */
            createdAt: string;
        };
        AuditEventListResponse: {
            items: components["schemas"]["AuditEvent"][];
            total: number;
            limit: number;
            offset: number;
        };
        PlaceAdminSummary: {
            /** Format: uuid */
            id: string;
            slug: string;
            lifecycleStatus: components["schemas"]["LifecycleStatus"];
        };
        LifecycleTransitionRequest: {
            to: components["schemas"]["LifecycleStatus"];
            /** @description Required when transitioning to rejected */
            rejectionReason?: string;
        };
        CatalogImportRequest: {
            /** @default true */
            dryRun: boolean;
            /** @description Canonical helm.catalog.import.v1 document */
            payload: {
                [key: string]: unknown;
            };
        };
        /**
         * @description Persisted import-run lifecycle (catalog.import_runs.status).
         *     completed = no row-level errors; partial = some successes with errors (or dry-run with preview errors);
         *     failed = apply with errors and zero destination/place mutations.
         * @enum {string}
         */
        CatalogImportRunStatus: "completed" | "partial" | "failed";
        CatalogImportResult: {
            dryRun: boolean;
            /** Format: uuid */
            importRunId: string;
            /** @description Optional for backward compatibility; mirrors persisted import_runs.status */
            status?: components["schemas"]["CatalogImportRunStatus"];
            placesInPayload?: number;
            destinationsInPayload?: number;
            destinationsWouldCreate?: number;
            destinationsWouldUpdate?: number;
            destinationsWouldSkip?: number;
            placesWouldCreate?: number;
            placesWouldUpdate?: number;
            placesWouldSkip?: number;
            destinationsCreated?: number;
            destinationsUpdated?: number;
            destinationsSkipped?: number;
            placesCreated?: number;
            placesUpdated?: number;
            placesSkipped?: number;
            /** @description Aggregate destinations+places would-create (dry-run) */
            wouldCreate?: number;
            wouldUpdate?: number;
            wouldSkip?: number;
            /** @description Aggregate destinations+places created */
            created?: number;
            updated?: number;
            skipped?: number;
            errors?: {
                path?: string;
                message?: string;
            }[];
        };
        /** @description Useful counts extracted from import_runs.summary (shape varies dry-run vs apply) */
        CatalogImportRunSummaryCounts: {
            destinationsInPayload?: number;
            placesInPayload?: number;
            destinationsWouldCreate?: number;
            destinationsWouldUpdate?: number;
            destinationsWouldSkip?: number;
            placesWouldCreate?: number;
            placesWouldUpdate?: number;
            placesWouldSkip?: number;
            destinationsCreated?: number;
            destinationsUpdated?: number;
            destinationsSkipped?: number;
            placesCreated?: number;
            placesUpdated?: number;
            placesSkipped?: number;
            wouldCreate?: number;
            wouldUpdate?: number;
            wouldSkip?: number;
            created?: number;
            updated?: number;
            skipped?: number;
        } & {
            [key: string]: unknown;
        };
        CatalogImportRunListItem: {
            /** Format: uuid */
            id: string;
            dryRun: boolean;
            status: components["schemas"]["CatalogImportRunStatus"];
            sourceLabel?: string | null;
            /** Format: uuid */
            actorUserId?: string | null;
            /** Format: date-time */
            createdAt: string;
            errorCount: number;
            summary: components["schemas"]["CatalogImportRunSummaryCounts"];
        };
        CatalogImportRunListResponse: {
            items: components["schemas"]["CatalogImportRunListItem"][];
            /** @description Total rows matching filters (not a global unfiltered aggregate unless filters omitted) */
            total: number;
            limit: number;
            offset: number;
        };
        CatalogImportRunDetail: components["schemas"]["CatalogImportRunListItem"] & {
            errors: {
                path?: string;
                message?: string;
            }[];
        };
        /** @description RFC 7807 problem+json */
        Problem: {
            /** Format: uri */
            type: string;
            title: string;
            status: number;
            detail?: string;
            code?: string;
            request_id?: string;
        };
    };
    responses: {
        /** @description Validation failed */
        BadRequest: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
        /** @description Missing or invalid access token */
        Unauthorized: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
        /** @description Insufficient permissions */
        Forbidden: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
        /** @description Resource not found */
        NotFound: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
        /**
         * @description Resource state conflict (for example, a stale concurrent lifecycle
         *     transition where the expected from-status no longer matches)
         */
        Conflict: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
    };
    parameters: {
        Slug: string;
        DestinationId: string;
        TripDraftId: string;
        CountryFilter: string;
        FeaturedFilter: "true" | "false";
        SearchQuery: string;
        Limit: number;
        Offset: number;
    };
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    getHealth: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Service process is alive */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HealthResponse"];
                };
            };
        };
    };
    getReady: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Service is ready to accept traffic */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReadyResponse"];
                };
            };
            /** @description Service is not ready (e.g. database configured but unreachable) */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReadyResponse"];
                };
            };
        };
    };
    getMeta: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Build / API metadata */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MetaResponse"];
                };
            };
        };
    };
    getMe: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authenticated caller profile foundation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MeResponse"];
                };
            };
            /** @description Missing or invalid access token */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    bootstrapCustomerProfile: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Account and customer profile ensured for the caller */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BootstrapCustomerProfileResponse"];
                };
            };
            401: components["responses"]["Unauthorized"];
            /** @description Database is not configured or unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    listTripDrafts: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Owner-scoped trip draft list */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TripDraftListResponse"];
                };
            };
            401: components["responses"]["Unauthorized"];
            /** @description Database is not configured or unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    createTripDraft: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateTripDraftRequest"];
            };
        };
        responses: {
            /** @description Trip draft created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TripDraft"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            /** @description Database is not configured or unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getTripDraft: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["TripDraftId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Trip draft detail */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TripDraft"];
                };
            };
            401: components["responses"]["Unauthorized"];
            404: components["responses"]["NotFound"];
            /** @description Database is not configured or unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    updateTripDraft: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["TripDraftId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateTripDraftRequest"];
            };
        };
        responses: {
            /** @description Updated trip draft */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TripDraft"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            404: components["responses"]["NotFound"];
            /** @description Database is not configured or unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getTripDraftItinerary: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["TripDraftId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Owner-scoped itinerary for the draft */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TripDraftItineraryResponse"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            404: components["responses"]["NotFound"];
            /** @description Database is not configured or unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    listDestinations: {
        parameters: {
            query?: {
                country?: components["parameters"]["CountryFilter"];
                featured?: components["parameters"]["FeaturedFilter"];
                q?: components["parameters"]["SearchQuery"];
                limit?: components["parameters"]["Limit"];
                offset?: components["parameters"]["Offset"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Paginated published destinations */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DestinationListResponse"];
                };
            };
            400: components["responses"]["BadRequest"];
        };
    };
    getDestination: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                slug: components["parameters"]["Slug"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Published destination */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DestinationPublic"];
                };
            };
            404: components["responses"]["NotFound"];
        };
    };
    listCatalogPlaces: {
        parameters: {
            query?: {
                country?: components["parameters"]["CountryFilter"];
                city?: string;
                area?: string;
                /** @description Optional exact match on the place's destination slug. When omitted, destination filtering is unchanged. When provided, must be nonblank and at most 120 characters. */
                destinationSlug?: string;
                category?: components["schemas"]["PlaceCategory"];
                subcategory?: string;
                minRating?: number;
                priceLevel?: number;
                tag?: string;
                featured?: components["parameters"]["FeaturedFilter"];
                q?: components["parameters"]["SearchQuery"];
                sort?: "name" | "rating" | "updated";
                limit?: components["parameters"]["Limit"];
                offset?: components["parameters"]["Offset"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Paginated published places */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PlaceListResponse"];
                };
            };
            400: components["responses"]["BadRequest"];
        };
    };
    getCatalogPlace: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                slug: components["parameters"]["Slug"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Published place with public media */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PlacePublic"];
                };
            };
            404: components["responses"]["NotFound"];
        };
    };
    listCatalogCategories: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Category groups and subcategories */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CategoryListResponse"];
                };
            };
        };
    };
    listCatalogTags: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Active tags */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TagListResponse"];
                };
            };
        };
    };
    listGeoCountries: {
        parameters: {
            query?: {
                /** @description When true, only active countries (default true when omitted by clients that pass it) */
                active?: "true" | "false";
                q?: components["parameters"]["SearchQuery"];
                limit?: components["parameters"]["Limit"];
                offset?: components["parameters"]["Offset"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Country list */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GeoCountryListResponse"];
                };
            };
            400: components["responses"]["BadRequest"];
        };
    };
    listGeoCities: {
        parameters: {
            query?: {
                country?: components["parameters"]["CountryFilter"];
                q?: components["parameters"]["SearchQuery"];
                limit?: components["parameters"]["Limit"];
                offset?: components["parameters"]["Offset"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description City list */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GeoCityListResponse"];
                };
            };
            400: components["responses"]["BadRequest"];
        };
    };
    adminListCatalogDestinations: {
        parameters: {
            query?: {
                q?: components["parameters"]["SearchQuery"];
                country?: components["parameters"]["CountryFilter"];
                featured?: components["parameters"]["FeaturedFilter"];
                lifecycleStatus?: components["schemas"]["LifecycleStatus"];
                /** @description Filter by parent destination id; omit for any */
                parentId?: string;
                /** @description When true, only destinations with no parent */
                topLevelOnly?: "true" | "false";
                limit?: components["parameters"]["Limit"];
                offset?: components["parameters"]["Offset"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Staff destination list */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DestinationAdminListResponse"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
        };
    };
    adminCreateCatalogDestination: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateDestinationRequest"];
            };
        };
        responses: {
            /** @description Draft destination created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DestinationAdmin"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
        };
    };
    adminGetCatalogDestination: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["DestinationId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Staff destination detail */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DestinationAdmin"];
                };
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    adminUpdateCatalogDestination: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["DestinationId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateDestinationRequest"];
            };
        };
        responses: {
            /** @description Updated destination */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DestinationAdmin"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    adminTransitionCatalogDestination: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["DestinationId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LifecycleTransitionRequest"];
            };
        };
        responses: {
            /** @description Updated destination lifecycle */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DestinationAdmin"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    adminReplaceCatalogDestinationTags: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["DestinationId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReplaceDestinationTagsRequest"];
            };
        };
        responses: {
            /** @description Destination with replaced tags */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DestinationAdmin"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    adminListAuditEvents: {
        parameters: {
            query: {
                entityType: "destination" | "place" | "import_run" | "poi" | "media" | "rating" | "price";
                entityId: string;
                limit?: components["parameters"]["Limit"];
                offset?: components["parameters"]["Offset"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Paginated audit events */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuditEventListResponse"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
        };
    };
    adminListCatalogPlaces: {
        parameters: {
            query?: {
                category?: string;
                q?: components["parameters"]["SearchQuery"];
                limit?: components["parameters"]["Limit"];
                offset?: components["parameters"]["Offset"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Staff place list */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PlaceListResponse"];
                };
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
        };
    };
    adminCreateCatalogPlace: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreatePlaceRequest"];
            };
        };
        responses: {
            /** @description Draft place created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PlaceAdminSummary"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
        };
    };
    adminTransitionCatalogPlace: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LifecycleTransitionRequest"];
            };
        };
        responses: {
            /** @description Updated place lifecycle */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PlaceAdminSummary"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    adminListCatalogImportRuns: {
        parameters: {
            query?: {
                status?: components["schemas"]["CatalogImportRunStatus"];
                /** @description When set, filter dry-run vs apply runs */
                dryRun?: boolean;
                /** @description Case-insensitive substring match on source_label */
                sourceLabel?: string;
                limit?: components["parameters"]["Limit"];
                offset?: components["parameters"]["Offset"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Paginated import runs */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CatalogImportRunListResponse"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
        };
    };
    adminGetCatalogImportRun: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Import run detail */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CatalogImportRunDetail"];
                };
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    adminImportCatalog: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CatalogImportRequest"];
            };
        };
        responses: {
            /** @description Import preview or apply result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CatalogImportResult"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
        };
    };
}
