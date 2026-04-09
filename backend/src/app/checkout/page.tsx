import getPrisma from "@/lib/prisma";
import CheckoutClient from "@/components/CheckoutClient";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return (
      <div className="shell">
        <header className="topbar">
          <div className="brand">
            <div className="brand__eyebrow">Checkout</div>
            <h1>Plačilo</h1>
            <p>
              Stripe ni nastavljen. Dodaj <code>STRIPE_SECRET_KEY</code> in{" "}
              <code>STRIPE_WEBHOOK_SECRET</code> v <code>.env</code>.
            </p>
          </div>
        </header>
      </div>
    );
  }

  // Light sanity check so page doesn't crash if DB isn't ready.
  try {
    const prisma = getPrisma();
    await prisma.product.count();
  } catch {
    return (
      <div className="shell">
        <header className="topbar">
          <div className="brand">
            <div className="brand__eyebrow">Checkout</div>
            <h1>Plačilo</h1>
            <p>
              Baza ni pripravljena. Najprej zaženi <code>npm run prisma:migrate</code>{" "}
              in <code>npm run db:seed</code>.
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
          <div className="brand__eyebrow">Checkout</div>
          <h1>Plačilo</h1>
          <p>Zaključek nakupa z Stripe Checkout.</p>
        </div>
      </header>

      <div className="layout">
        <main className="panel">
          <div className="section-heading">
            <span>Košarica</span>
            <h2>Pregled in plačilo</h2>
          </div>
          <CheckoutClient />
        </main>
      </div>
    </div>
  );
}
