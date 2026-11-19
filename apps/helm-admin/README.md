# helm-admin

Helm حلم — Admin (Next.js App Router, port **3001**).

## Step 6.4 — Auth shell

- Supabase email/password via `@supabase/ssr` cookie sessions
- Middleware refreshes the session and requires a session on staff URL paths (`/`, `/destinations`, `/import`)
- Staff authorization is **not** taken from JWT claims: the staff layout calls Nest `GET /v1/me` and requires `rolesSource=database` plus `operator` / `administrator` / `super-administrator`
- CSS Modules only (no Tailwind / UI kits)
- Generated `@helm/api-client-ts` only — never hand-edit

## Local run

1. Copy root `.env.example` → `.env` and fill local Supabase anon + API URL.
2. `supabase start` then `supabase db reset` (migrations + `seed.sql`).
3. Seed Auth users (UUIDs must match `identity.user_accounts`):

```bash
DEMO_STAFF_PASSWORD='choose-a-local-only-password' \
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY="$(supabase status -o env | sed -n 's/^SERVICE_ROLE_KEY=//p')" \
node scripts/seed-local-staff-auth.mjs
```

4. Run the API with **real JWT verification** (not mock) when exercising the admin UI:

```bash
AUTH_PROVIDER=supabase_jwt \
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_JWT_SECRET=... \
pnpm --filter @helm/helm-backend dev
```

5. Start admin:

```bash
pnpm --filter helm-admin dev
# http://127.0.0.1:3001/login
```

Demo staff emails: `demo.operator@helm.local`, `demo.admin@helm.local`, `demo.super@helm.local`.  
`demo.customer@helm.local` must be rejected by the staff shell.

**Never** put `SUPABASE_SERVICE_ROLE_KEY` in `NEXT_PUBLIC_*` or commit `DEMO_STAFF_PASSWORD`.

## Scripts

| Script | Purpose |
|--------|---------|
| `pnpm --filter helm-admin typecheck` | TypeScript |
| `pnpm --filter helm-admin test` | Auth helper + security tests |
