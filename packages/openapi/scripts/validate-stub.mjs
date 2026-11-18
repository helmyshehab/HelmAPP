import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const spec = readFileSync(join(root, "..", "openapi.yaml"), "utf8");
if (!spec.includes("openapi:")) {
  console.error("openapi.yaml missing openapi version");
  process.exit(1);
}
if (!spec.includes("/v1/health")) {
  console.error("openapi.yaml must define /v1/health");
  process.exit(1);
}
console.log("@helm/openapi: stub OK");
