#!/usr/bin/env node
/**
 * Thin wrapper — validation lives next to the catalog import Zod contract.
 * Prefer: pnpm dataset:ubud:validate
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const backendDir = join(ROOT, "services/helm-backend");
const script = join(backendDir, "scripts/validate-ubud-dataset-v1.ts");

const result = spawnSync(
  process.execPath,
  ["--import", "tsx", script],
  {
    stdio: "inherit",
    cwd: backendDir,
    env: process.env,
  },
);
process.exit(result.status ?? 1);
