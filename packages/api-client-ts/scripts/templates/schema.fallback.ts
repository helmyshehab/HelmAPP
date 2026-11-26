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
        /** Ensure Helm account and customer profile for the authenticated subject */
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
        /** List the caller's private trip drafts */
        get: operations["listTripDrafts"];
        put?: never;
        /** Create a private trip draft for the authenticated subject */
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
        /** Get one of the caller's trip drafts by id */
        get: operations["getTripDraft"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Partially update one of the caller's trip drafts */
        patch: operations["updateTripDraft"];
        trace?: never;
    };
    "/v1/admin/trips/demo-bookings/{id}/services/{kind}": {
        patch: operations["confirmDemoBookingService"];
    };
    "/v1/trips/demo-bookings": {
        get: operations["listDemoTripBookings"];
        post: operations["createDemoTripBooking"];
    };
    "/v1/trips/drafts/{id}/quote": {
        parameters: { path: { id: string } };
        get: operations["getTripDraftQuote"];
        post: operations["createTripDraftQuote"];
    };
    "/v1/trips/drafts/{id}/itinerary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get the caller's private itinerary for a trip draft */
        get: operations["getTripDraftItinerary"];
        put?: never;
        post?: never;
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
            /** @enum {string} */
            rolesSource: "database" | "fallback";
        };
        BootstrapCustomerProfileResponse: {
            /** Format: uuid */
            userId: string;
            /** Format: email */
            email?: string | null;
            accountStatus: string;
            displayName?: string | null;
            preferredLocale: string;
            preferredCurrency: string;
            accountCreated: boolean;
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
        CreateDemoTripBookingRequest: { draftId: string; quoteId: string };
        DemoTripBooking: {
            id: string;
            draftId: string;
            title: string | null;
            status: "pending_confirmation" | "confirmed";
            services: components["schemas"]["DemoBookingService"][];
            quote: components["schemas"]["TripDraftQuote"];
            constraints: Record<string, unknown>;
            createdAt: string;
        };
        DemoBookingService: { kind: "flights" | "stay" | "activities"; confirmedAt: string | null };
        DemoTripBookingList: { items: components["schemas"]["DemoTripBooking"][] };
        TripDraftQuote: {
            id: string;
            draftId: string;
            currency: "EGP";
            source: "demo";
            rateVersion: string;
            travelerCount: number;
            nights: number;
            flightTotalEgp: number;
            lodgingTotalEgp: number;
            activitiesTotalEgp: number;
            totalEgp: number;
            createdAt: string;
            expiresAt: string;
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
    responses: never;
    parameters: {
        /** Format: uuid */
        TripDraftId: string;
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
            /** @description Missing or invalid access token */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Trip draft missing or not owned by caller */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    confirmDemoBookingService: {
        responses: { 200: { content: { "application/json": components["schemas"]["DemoTripBooking"] } } };
    };
    listDemoTripBookings: {
        responses: { 200: { content: { "application/json": components["schemas"]["DemoTripBookingList"] } } };
    };
    createDemoTripBooking: {
        requestBody: { content: { "application/json": components["schemas"]["CreateDemoTripBookingRequest"] } };
        responses: { 201: { content: { "application/json": components["schemas"]["DemoTripBooking"] } } };
    };
    getTripDraftQuote: {
        responses: { 200: { content: { "application/json": components["schemas"]["TripDraftQuote"] } } };
    };
    createTripDraftQuote: {
        requestBody?: { content: { "application/json": { expectedConstraints?: Record<string, unknown> } } };
        responses: { 201: { content: { "application/json": components["schemas"]["TripDraftQuote"] } } };
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
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
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
            /** @description Trip draft missing or not owned by caller */
            404: {
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
            /** @description Missing or invalid access token */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Trip draft missing or not owned by caller */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
}
