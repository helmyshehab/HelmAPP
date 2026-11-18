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
  };
}
