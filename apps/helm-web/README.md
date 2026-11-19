# helm-web

Helm حلم — traveler web (Next.js). First demo: public **Discover** → destination detail.

## Local

1. Copy `.env.example` → `.env.local` (public API base URL only; no staff tokens).
2. Ensure the Helm backend is running on that URL.
3. From the repo root: `pnpm --filter helm-web dev` → [http://127.0.0.1:3000](http://127.0.0.1:3000)

Uses `@helm/api-client-ts` (`listDestinations`, `getDestination`) with no auth.
