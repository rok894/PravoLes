import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var prismaPool: Pool | undefined;
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Missing DATABASE_URL");
  }

  const pool = global.prismaPool ?? new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);

  if (process.env.NODE_ENV !== "production") {
    global.prismaPool = pool;
  }

  return new PrismaClient({ adapter });
}

function getPrisma() {
  const existing = global.prisma;
  if (existing) return existing;

  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    global.prisma = client;
  }
  return client;
}

export default getPrisma;
