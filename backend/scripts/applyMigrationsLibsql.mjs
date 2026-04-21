#!/usr/bin/env node
// Apply Prisma migration SQL files against a libsql (Turso) database.
// Usage:
//   DATABASE_URL=libsql://... DATABASE_AUTH_TOKEN=... node scripts/applyMigrationsLibsql.mjs
//
// Tracks applied migrations in the same _prisma_migrations table that
// `prisma migrate` uses, so future prisma migrations remain compatible.

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

import { createClient } from "@libsql/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.resolve(__dirname, "..", "prisma", "migrations");

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;

if (!url) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const client = createClient({ url, authToken });

async function ensureMigrationsTable() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "checksum" TEXT NOT NULL,
      "finished_at" DATETIME,
      "migration_name" TEXT NOT NULL,
      "logs" TEXT,
      "rolled_back_at" DATETIME,
      "started_at" DATETIME NOT NULL DEFAULT current_timestamp,
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    )
  `);
}

async function appliedNames() {
  const result = await client.execute(
    `SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL`,
  );
  return new Set(result.rows.map((r) => r.migration_name));
}

function splitStatements(sql) {
  // Prisma migration SQL files typically contain semicolon-terminated statements.
  // Strip comments, split on `;` at line ends, ignoring empty chunks.
  const lines = sql
    .split("\n")
    .map((l) => {
      const commentIdx = l.indexOf("--");
      return commentIdx >= 0 ? l.slice(0, commentIdx) : l;
    })
    .join("\n");
  return lines
    .split(/;\s*(?=\n|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function applyMigration(name) {
  const file = path.join(MIGRATIONS_DIR, name, "migration.sql");
  const sql = await readFile(file, "utf8");
  const checksum = crypto.createHash("sha256").update(sql).digest("hex");
  const id = crypto.randomUUID();

  await client.execute({
    sql: `INSERT INTO _prisma_migrations (id, checksum, migration_name, started_at, applied_steps_count)
          VALUES (?, ?, ?, current_timestamp, 0)`,
    args: [id, checksum, name],
  });

  const statements = splitStatements(sql);
  for (const stmt of statements) {
    try {
      await client.execute(stmt);
    } catch (err) {
      console.error(`\n❌ Statement failed in ${name}:`);
      console.error(stmt.slice(0, 300));
      console.error(err.message);
      throw err;
    }
  }

  await client.execute({
    sql: `UPDATE _prisma_migrations
          SET finished_at = current_timestamp, applied_steps_count = ?
          WHERE id = ?`,
    args: [statements.length, id],
  });
}

async function main() {
  await ensureMigrationsTable();
  const entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true });
  const migrations = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  const already = await appliedNames();
  let applied = 0;

  for (const name of migrations) {
    if (already.has(name)) {
      console.log(`✓ already applied: ${name}`);
      continue;
    }
    console.log(`→ applying: ${name}`);
    await applyMigration(name);
    applied += 1;
    console.log(`✓ applied: ${name}`);
  }

  console.log(`\nDone. Applied ${applied} new migration(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    client.close();
  });
