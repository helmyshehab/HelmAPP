import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const spec = readFileSync(join(root, "..", "openapi.yaml"), "utf8");
if (!spec.includes("openapi:")) {
  console.error("openapi.yaml missing openapi version");
  process.exit(1);
}
for (const path of ["/v1/health", "/v1/ready", "/v1/meta", "/v1/me"]) {
  if (!spec.includes(path)) {
    console.error(`openapi.yaml must define ${path}`);
    process.exit(1);
  }
}
if (!spec.includes("bearerAuth")) {
  console.error("openapi.yaml must define bearerAuth security scheme");
  process.exit(1);
}
console.log("@helm/openapi: foundation contract OK");
