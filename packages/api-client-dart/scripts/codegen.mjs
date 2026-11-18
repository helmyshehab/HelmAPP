/**
 * Regenerates Dart client stubs from packages/openapi/openapi.yaml.
 * Generated sources must never be hand-edited.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(__dirname, "..");
const openapi = join(pkgRoot, "..", "openapi", "openapi.yaml");
const outDir = join(pkgRoot, "lib", "src", "generated");
const template = join(__dirname, "templates", "helm_api_client.dart");

const checkOnly = process.argv.includes("--check-header");
if (checkOnly) {
  const path = join(outDir, "helm_api_client.dart");
  if (!existsSync(path)) {
    console.error("Missing generated helm_api_client.dart — run codegen");
    process.exit(1);
  }
  const body = readFileSync(path, "utf8");
  if (!body.includes("DO NOT EDIT")) {
    console.error("Generated file missing DO NOT EDIT header");
    process.exit(1);
  }
  console.log("@helm/api-client-dart: header OK");
  process.exit(0);
}

if (!existsSync(openapi)) {
  console.error("Missing OpenAPI SoT at", openapi);
  process.exit(1);
}

// Ensure OpenAPI still exposes the stub paths we generate against.
const spec = readFileSync(openapi, "utf8");
if (!spec.includes("/v1/health") || !spec.includes("/v1/meta")) {
  console.error("OpenAPI SoT missing /v1/health or /v1/meta");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
copyFileSync(template, join(outDir, "helm_api_client.dart"));
writeFileSync(
  join(pkgRoot, "lib", "helm_api_client.dart"),
  `/// Helm حلم generated API client. Prefer regenerating over hand edits.
library helm_api_client;

export 'src/generated/helm_api_client.dart';
`,
);
console.log("@helm/api-client-dart: codegen complete (from OpenAPI SoT + template)");
