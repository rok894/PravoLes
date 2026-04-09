export const dynamic = "force-dynamic";

export default function SuccessPage() {
  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand__eyebrow">Success</div>
          <h1>Hvala!</h1>
          <p>Plačilo je bilo uspešno. Potrditev bo prišla po e-pošti.</p>
        </div>
      </header>

      <div className="layout">
        <main className="panel">
          <div className="section-heading">
            <span>Naprej</span>
            <h2>Vrnitev na izdelke</h2>
          </div>
          <p style={{ marginTop: 14, color: "#544237", lineHeight: 1.6 }}>
            <a className="cart__checkout" href="/">
              Nazaj na izdelke
            </a>
          </p>
        </main>
      </div>
    </div>
  );
}

