import CartSidebar from "@/components/CartSidebar";
import ProductGrid from "@/components/ProductGrid";
import getPrisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!process.env.DATABASE_URL) {
    return (
      <div className="shell">
        <header className="topbar">
          <div className="brand">
            <div className="brand__eyebrow">Next.js backend</div>
            <h1>PravoLes</h1>
            <p>
              Nastavi <code>DATABASE_URL</code> (glej <code>.env.example</code>)
              in zaženi migracije.
            </p>
          </div>
        </header>
      </div>
    );
  }

  let products: Awaited<ReturnType<ReturnType<typeof getPrisma>["product"]["findMany"]>> | null =
    null;
  let dbOk = true;

  try {
    const prisma = getPrisma();
    products = await prisma.product.findMany({
      where: { active: true },
      orderBy: { createdAt: "asc" },
    });
  } catch {
    dbOk = false;
  }

  if (!dbOk || !products) {
    return (
      <div className="shell">
        <header className="topbar">
          <div className="brand">
            <div className="brand__eyebrow">Priprava baze</div>
            <h1>PravoLes</h1>
            <p>
              Baza ni pripravljena. Za lokalni zagon najprej zaženi Postgres,
              potem <code>npm run prisma:migrate</code> in{" "}
              <code>npm run db:seed</code>.
            </p>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand__eyebrow">Leseni izdelki</div>
          <h1>PravoLes</h1>
          <p>Košarica se shranjuje v bazo in je vezana na cookie.</p>
        </div>
      </header>

      <div className="layout">
        <main className="main">
          <ProductGrid products={products} />
        </main>
        <aside className="aside">
          <CartSidebar />
        </aside>
      </div>
    </div>
  );
}
