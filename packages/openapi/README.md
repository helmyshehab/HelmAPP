# @helm/openapi

OpenAPI **3.1** single source of truth for Helm حلم `/v1`.

## Rules

1. Edit **this** package (`openapi.yaml`) when the contract changes.
2. Regenerate clients: from repo root `pnpm codegen`.
3. **Never** hand-edit `packages/api-client-ts` or `packages/api-client-dart` generated sources.

Foundation contract: `/v1/health`, `/v1/ready`, `/v1/meta`, `/v1/me` (+ bearerAuth). Product endpoints land later.
