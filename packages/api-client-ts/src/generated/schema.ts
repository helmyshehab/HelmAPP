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
        CatalogImportResult: {
            dryRun: boolean;
            /** Format: uuid */
            importRunId: string;
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
    };
    parameters: {
        Slug: string;
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
