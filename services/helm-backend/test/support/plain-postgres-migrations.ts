/**
 * Plain-Postgres migration helpers for disposable DB Nest HTTP tests.
 * Mirrors scripts/apply-migrations.sh MIGRATION_MODE=plain-postgres:
 * skip SUPABASE_ONLY basenames (real Storage required; never stub storage.*).
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

export function loadSupabaseOnlyBasenames(repoRoot: string): Set<string> {
  const manifest = path.join(repoRoot, 'supabase/migrations/SUPABASE_ONLY');
  const names = new Set<string>();
  if (!existsSync(manifest)) return names;
  for (const raw of readFileSync(manifest, 'utf8').split(/\r?\n/)) {
    const entry = raw.trim();
    if (!entry || entry.startsWith('#')) continue;
    if (entry.includes('/') || entry.startsWith('.') || !entry.endsWith('.sql')) {
      throw new Error(`invalid SUPABASE_ONLY manifest entry: ${entry}`);
    }
    const full = path.join(repoRoot, 'supabase/migrations', entry);
    if (!existsSync(full)) {
      throw new Error(`SUPABASE_ONLY entry missing on disk: ${entry}`);
    }
    names.add(entry);
  }
  return names;
}

export function listPlainPostgresMigrationFiles(repoRoot: string): string[] {
  const migrationsDir = path.join(repoRoot, 'supabase/migrations');
  const skip = loadSupabaseOnlyBasenames(repoRoot);
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql') && !skip.has(f))
    .sort();
}
