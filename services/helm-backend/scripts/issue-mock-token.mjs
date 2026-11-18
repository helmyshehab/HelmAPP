import { SignJWT } from "jose";

const secretRaw = process.env.SUPABASE_JWT_SECRET;
if (!secretRaw || secretRaw.length < 32) {
  console.error("SUPABASE_JWT_SECRET (min 32 chars) is required");
  process.exit(1);
}

const secret = new TextEncoder().encode(secretRaw);
const roles = (process.env.ROLES ?? "customer").split(",").map((r) => r.trim()).filter(Boolean);
const audience = process.env.SUPABASE_JWT_AUDIENCE ?? "authenticated";

const token = await new SignJWT({
  sub: process.env.USER_ID ?? "55555555-5555-5555-5555-555555555555",
  email: process.env.EMAIL ?? "demo.customer@helm.local",
  role: "authenticated",
  app_metadata: { roles },
})
  .setProtectedHeader({ alg: "HS256", typ: "JWT" })
  .setIssuer("helm://mock-auth")
  .setIssuedAt()
  .setExpirationTime("2h")
  .setAudience(audience)
  .sign(secret);

process.stdout.write(token);
