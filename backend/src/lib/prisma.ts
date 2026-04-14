import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

declare global {
  var prisma: PrismaClient | undefined;
}

function getPrisma() {
  if (global.prisma) return global.prisma;

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Missing DATABASE_URL");

  const adapter = new PrismaLibSql({ url });
  const client = new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== "production") {
    global.prisma = client;
  }
  return client;
}

export default getPrisma;
