import Link from "next/link";

export const dynamic = "force-dynamic";

export default function CancelPage() {
  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand__eyebrow">Canceled</div>
          <h1>Plačilo preklicano</h1>
          <p>Če želite, lahko poskusite ponovno ali uredite košarico.</p>
        </div>
      </header>

      <div className="layout">
        <main className="panel">
          <div className="section-heading">
            <span>Možnosti</span>
            <h2>Vrnitev</h2>
          </div>
          <p style={{ marginTop: 14, color: "#544237", lineHeight: 1.6 }}>
            <Link className="cart__checkout" href="/">
              Nazaj na izdelke
            </Link>
          </p>
        </main>
      </div>
    </div>
  );
}
