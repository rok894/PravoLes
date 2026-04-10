import fs from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

function loadDotEnvIfNeeded() {
  if (process.env.DATABASE_URL) return;
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf-8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadDotEnvIfNeeded();

if (!process.env.DATABASE_URL) {
  throw new Error("Missing DATABASE_URL. Create backend/.env first.");
}

const prisma = new PrismaClient({ adapter: new PrismaLibSql({ url: process.env.DATABASE_URL }) });

async function main() {
  const products = [
    {
      title: "Stol iz masivnega lesa",
      description:
        "Ročno brušen stol s poudarkom na naravni teksturi in udobju.",
      image: "/images/stol_1.jpg",
      alt: "Lesen stol v svetlem prostoru",
      priceCents: 14900,
      currency: "EUR",
      active: true,
    },
    {
      title: "Komoda s predalniki",
      description: "Čisti robovi, mehko zapiranje in topli toni masivnega lesa.",
      image: "/images/predalčki_1.jpg",
      alt: "Lesena komoda s predalniki",
      priceCents: 39900,
      currency: "EUR",
      active: true,
    },
    {
      title: "Šahovnica iz oreha",
      description: "Kontrastna šahovnica, lakirana za dolgotrajno zaščito.",
      image: "/images/šahovnica_1.jpg",
      alt: "Lesena šahovnica na mizi",
      priceCents: 8900,
      currency: "EUR",
      active: true,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { title: product.title },
      update: {
        description: product.description,
        image: product.image,
        alt: product.alt,
        priceCents: product.priceCents,
        currency: product.currency,
        active: product.active,
      },
      create: product,
    });
  }

  console.log("Seeded 3 products.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
