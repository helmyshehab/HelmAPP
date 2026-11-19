import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === "test") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js|jsx|mjs|css|md|json)$/.test(name)) out.push(full);
  }
  return out;
}

describe("browser-facing security scan", () => {
  it("does not ship service-role or database URLs in helm-admin source", () => {
    const files = walk(ROOT);
    const offenders: string[] = [];
    const banned =
      /SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_SUPABASE_SERVICE_ROLE|DATABASE_URL\s*=/;

    for (const file of files) {
      const rel = relative(ROOT, file);
      if (rel === "README.md") continue;
      const text = readFileSync(file, "utf8");
      if (banned.test(text)) {
        offenders.push(rel);
      }
    }

    assert.deepEqual(offenders, []);
  });

  it("does not introduce Tailwind or UI kit dependencies", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    const all = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };
    for (const name of Object.keys(all)) {
      assert.equal(name.includes("tailwind"), false, name);
      assert.equal(name.includes("@mui/"), false, name);
      assert.equal(name.includes("@chakra-ui/"), false, name);
      assert.equal(name.includes("shadcn"), false, name);
    }
  });
});
