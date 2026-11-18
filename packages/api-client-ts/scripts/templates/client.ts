/**
 * DO NOT EDIT.
 * Generated from packages/openapi/openapi.yaml
 * Run: pnpm --filter @helm/api-client-ts codegen
 */

import type { components } from "./schema.js";

export type HealthResponse = components["schemas"]["HealthResponse"];
export type MetaResponse = components["schemas"]["MetaResponse"];

export type HelmClientOptions = {
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
};

export function createHelmClient(options: HelmClientOptions) {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const base = options.baseUrl.replace(/\/$/, "");
  return {
    async getHealth(): Promise<HealthResponse> {
      const res = await fetchImpl(`${base}/v1/health`);
      if (!res.ok) throw new Error(`getHealth failed: ${res.status}`);
      return (await res.json()) as HealthResponse;
    },
    async getMeta(): Promise<MetaResponse> {
      const res = await fetchImpl(`${base}/v1/meta`);
      if (!res.ok) throw new Error(`getMeta failed: ${res.status}`);
      return (await res.json()) as MetaResponse;
    },
  };
}
