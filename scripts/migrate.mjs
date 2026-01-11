import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import { Client } from "@neondatabase/serverless";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const migrationsDir = path.join(projectRoot, "migrations");

// Load env for this standalone Node script (Next.js does this automatically, Node does not).
dotenv.config({ path: path.join(projectRoot, ".env.local") });
dotenv.config({ path: path.join(projectRoot, ".env") });

function getDbUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set.");
  }
  return url;
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

function listMigrationFiles() {
  if (!fs.existsSync(migrationsDir)) return [];
  return fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));
}

async function getApplied(client) {
  const { rows } = await client.query(
    "SELECT filename FROM schema_migrations ORDER BY filename ASC;"
  );
  return new Set(rows.map((r) => r.filename));
}

async function applyOne(client, filename) {
  const fullPath = path.join(migrationsDir, filename);
  const contents = fs.readFileSync(fullPath, "utf8");

  // Run each migration inside a transaction and record success.
  await client.query("BEGIN;");
  try {
    // Use the Postgres client so multi-statement .sql files work.
    await client.query(contents);
    await client.query(
      "INSERT INTO schema_migrations (filename) VALUES ($1);",
      [filename]
    );
    await client.query("COMMIT;");
  } catch (err) {
    await client.query("ROLLBACK;");
    throw err;
  }
}

async function main() {
  const client = new Client({ connectionString: getDbUrl() });
  await client.connect();

  try {
    await ensureMigrationsTable(client);

    const files = listMigrationFiles();
    const applied = await getApplied(client);
    const pending = files.filter((f) => !applied.has(f));

    if (pending.length === 0) {
      console.log("No pending migrations.");
      return;
    }

    for (const f of pending) {
      console.log(`Applying ${f}...`);
      await applyOne(client, f);
      console.log(`Applied ${f}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
