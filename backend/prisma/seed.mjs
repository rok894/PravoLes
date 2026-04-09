import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
