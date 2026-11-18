import { SignJWT } from "jose";

const secret = new TextEncoder().encode(
  process.env.SUPABASE_JWT_SECRET ?? "super-secret-jwt-token-with-at-least-32-characters-long",
);
const roles = (process.env.ROLES ?? "customer").split(",");
const token = await new SignJWT({
  sub: process.env.USER_ID ?? "55555555-5555-5555-5555-555555555555",
  email: process.env.EMAIL ?? "demo.customer@helm.local",
  role: "authenticated",
  app_metadata: { roles },
})
  .setProtectedHeader({ alg: "HS256", typ: "JWT" })
  .setIssuedAt()
  .setExpirationTime("2h")
  .setAudience("authenticated")
  .sign(secret);

process.stdout.write(token);
