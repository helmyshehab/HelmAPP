#!/usr/bin/env node
/**
 * Create local Supabase Auth users for Helm demo staff accounts.
 *
 * Auth user UUIDs MUST match identity.user_accounts.id from supabase/seed.sql.
 * Password comes from DEMO_STAFF_PASSWORD (never committed).
 *
 * Usage (after `supabase start` + db reset/seed):
 *   DEMO_STAFF_PASSWORD='your-local-only-password' \
 *   SUPABASE_URL=http://127.0.0.1:54321 \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   node scripts/seed-local-staff-auth.mjs
 *
 * Service-role key is read from the environment for this one-shot script only.
 * It must never be placed in NEXT_PUBLIC_* or bundled into helm-admin.
 */

const DEMO_ACCOUNTS = [
  {
    id: "55555555-5555-5555-5555-555555555555",
    email: "demo.customer@helm.local",
    role: "customer",
  },
  {
    id: "66666666-6666-6666-6666-666666666666",
    email: "demo.operator@helm.local",
    role: "operator",
  },
  {
    id: "77777777-7777-7777-7777-777777777777",
    email: "demo.admin@helm.local",
    role: "administrator",
  },
  {
    id: "88888888-8888-8888-8888-888888888888",
    email: "demo.super@helm.local",
    role: "super-administrator",
  },
];

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing required env ${name}`);
    process.exit(1);
  }
  return value;
}

async function upsertAuthUser({ baseUrl, serviceRole, password, account }) {
  const headers = {
    apikey: serviceRole,
    Authorization: `Bearer ${serviceRole}`,
    "Content-Type": "application/json",
  };

  const listUrl = new URL("/auth/v1/admin/users", baseUrl);
  listUrl.searchParams.set("page", "1");
  listUrl.searchParams.set("per_page", "200");
  const listed = await fetch(listUrl, { headers });
  if (!listed.ok) {
    throw new Error(`List users failed: ${listed.status} ${await listed.text()}`);
  }
  const body = await listed.json();
  const users = Array.isArray(body) ? body : body.users ?? [];
  const existing = users.find(
    (u) => u.id === account.id || u.email?.toLowerCase() === account.email.toLowerCase(),
  );

  if (existing && existing.id !== account.id) {
    throw new Error(
      `Email ${account.email} exists with id ${existing.id}; expected ${account.id}. Delete the Auth user and re-run.`,
    );
  }

  if (existing) {
    const update = await fetch(new URL(`/auth/v1/admin/users/${account.id}`, baseUrl), {
      method: "PUT",
      headers,
      body: JSON.stringify({
        email: account.email,
        password,
        email_confirm: true,
        user_metadata: { helm_demo_role_hint: account.role },
      }),
    });
    if (!update.ok) {
      throw new Error(`Update ${account.email} failed: ${update.status} ${await update.text()}`);
    }
    return "updated";
  }

  const create = await fetch(new URL("/auth/v1/admin/users", baseUrl), {
    method: "POST",
    headers,
    body: JSON.stringify({
      id: account.id,
      email: account.email,
      password,
      email_confirm: true,
      user_metadata: { helm_demo_role_hint: account.role },
    }),
  });
  if (!create.ok) {
    throw new Error(`Create ${account.email} failed: ${create.status} ${await create.text()}`);
  }
  return "created";
}

async function main() {
  const baseUrl = required("SUPABASE_URL").replace(/\/$/, "");
  const serviceRole = required("SUPABASE_SERVICE_ROLE_KEY");
  const password = required("DEMO_STAFF_PASSWORD");

  if (password.length < 8) {
    console.error("DEMO_STAFF_PASSWORD must be at least 8 characters");
    process.exit(1);
  }
  if (process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Refuse to run: NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY must not be set");
    process.exit(1);
  }

  console.log(
    "Seeding local Supabase Auth demo users (UUIDs pinned to identity.user_accounts)...",
  );
  for (const account of DEMO_ACCOUNTS) {
    const result = await upsertAuthUser({ baseUrl, serviceRole, password, account });
    console.log(`  ${result}: ${account.email} (${account.id}) [${account.role}]`);
  }
  console.log(
    "Done. Staff sign-in: http://127.0.0.1:3001/login — roles still come from identity.user_roles (customer must be denied the shell).",
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
