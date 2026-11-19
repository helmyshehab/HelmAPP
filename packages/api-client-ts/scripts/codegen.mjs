/**
 * Regenerates TypeScript types/client from packages/openapi/openapi.yaml.
 * Generated sources must never be hand-edited.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(__dirname, "..");
const openapi = join(pkgRoot, "..", "openapi", "openapi.yaml");
const outDir = join(pkgRoot, "src", "generated");
const templatesDir = join(__dirname, "templates");

const HEADER = `/**
 * DO NOT EDIT.
 * Generated from packages/openapi/openapi.yaml
 * Run: pnpm --filter @helm/api-client-ts codegen
 */

`;

const checkOnly = process.argv.includes("--check-header");
if (checkOnly) {
  const schemaPath = join(outDir, "schema.ts");
  if (!existsSync(schemaPath)) {
    console.error("Missing generated schema.ts — run codegen");
    process.exit(1);
  }
  const body = readFileSync(schemaPath, "utf8");
  if (!body.includes("DO NOT EDIT")) {
    console.error("Generated file missing DO NOT EDIT header");
    process.exit(1);
  }
  console.log("@helm/api-client-ts: header OK");
  process.exit(0);
}

if (!existsSync(openapi)) {
  console.error("Missing OpenAPI SoT at", openapi);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

let schemaBody = "";
try {
  // Prefer the package CLI via node so Windows does not silently fall back
  // when `.bin/openapi-typescript` shims fail under execFileSync.
  const cliJs = join(
    pkgRoot,
    "node_modules",
    "openapi-typescript",
    "bin",
    "cli.js",
  );
  if (existsSync(cliJs)) {
    schemaBody = execFileSync(process.execPath, [cliJs, openapi], {
      encoding: "utf8",
      cwd: pkgRoot,
      maxBuffer: 20 * 1024 * 1024,
    });
  } else {
    const bin = join(pkgRoot, "node_modules", ".bin", "openapi-typescript");
    const localBin = existsSync(bin) ? bin : "openapi-typescript";
    schemaBody = execFileSync(localBin, [openapi], {
      encoding: "utf8",
      cwd: pkgRoot,
      maxBuffer: 20 * 1024 * 1024,
    });
  }
} catch (error) {
  console.error(
    "@helm/api-client-ts: openapi-typescript failed; using schema.fallback.ts",
    error instanceof Error ? error.message : error,
  );
  schemaBody = readFileSync(join(templatesDir, "schema.fallback.ts"), "utf8");
}

writeFileSync(join(outDir, "schema.ts"), HEADER + schemaBody.replace(/^\/\*[\s\S]*?\*\/\s*/, ""));
copyFileSync(join(templatesDir, "client.ts"), join(outDir, "client.ts"));
writeFileSync(
  join(pkgRoot, "src", "index.ts"),
  `/** Re-exports generated Helm حلم API client. Prefer regenerating over hand edits. */
export * from "./generated/schema.js";
export * from "./generated/client.js";
`,
);

console.log("@helm/api-client-ts: codegen complete");
