# @helm/openapi

OpenAPI **3.1** single source of truth for Helm حلم `/v1`.

## Rules

1. Edit **this** package (`openapi.yaml`) when the contract changes.
2. Regenerate clients: from repo root `pnpm codegen`.
3. **Never** hand-edit `packages/api-client-ts` or `packages/api-client-dart` generated sources.

Step 2 ships a minimal health/meta stub only.
