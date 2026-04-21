#!/usr/bin/env node
// Insert (or upgrade) an admin user directly in a libsql (Turso) database.
// Usage:
//   DATABASE_URL=libsql://... DATABASE_AUTH_TOKEN=... \
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=secret \
//   node scripts/seedAdminLibsql.mjs

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!url || !email || !password) {
  console.error("Missing DATABASE_URL, ADMIN_EMAIL, or ADMIN_PASSWORD");
  process.exit(1);
}

const client = createClient({ url, authToken });

function cuid() {
  return "c" + crypto.randomBytes(12).toString("hex");
}

try {
  const hash = bcrypt.hashSync(password, 10);

  const existing = await client.execute({
    sql: `SELECT id FROM User WHERE email = ? LIMIT 1`,
    args: [email],
  });

  if (existing.rows.length > 0) {
    await client.execute({
      sql: `UPDATE User SET passwordHash = ?, role = 'ADMIN', updatedAt = current_timestamp WHERE email = ?`,
      args: [hash, email],
    });
    console.log(`✓ Updated existing user ${email} → role=ADMIN, new password set`);
  } else {
    await client.execute({
      sql: `INSERT INTO User (id, createdAt, updatedAt, email, passwordHash, role, failedLoginAttempts)
            VALUES (?, current_timestamp, current_timestamp, ?, ?, 'ADMIN', 0)`,
      args: [cuid(), email, hash],
    });
    console.log(`✓ Created new ADMIN user ${email}`);
  }
} finally {
  client.close();
}
