const highlights = [
  {
    title: "Naravni materiali",
    text: "Osredotočeni na les, teksturo in občutek topline v prostoru.",
  },
  {
    title: "Ročno dodelan izgled",
    text: "Stran je pripravljena kot mirna, pregledna osnova za predstavitev izdelkov.",
  },
  {
    title: "Pripravljeno za rast",
    text: "Ko bo čas, lahko to osnovo razširimo v katalog, CMS ali e-trgovino.",
  },
];

const steps = [
  "Dodaj predstavitvene fotografije izdelkov.",
  "Razširi vsebino z dodatnimi sekcijami ali podstranmi.",
  "Po potrebi poveži z API-jem ali CMS-om.",
];

function App() {
  return (
    <div className="page-shell">
      <header className="hero">
        <div className="hero__eyebrow">Static frontend starter</div>
        <h1>PravoLes</h1>
        <p className="hero__lead">
          Preprosta in elegantna osnova za statično spletno stran, zgrajeno z
          Vite, React in TypeScript.
        </p>

        <div className="hero__actions">
          <a className="button button--primary" href="#vsebina">
            Poglej strukturo
          </a>
          <a className="button button--secondary" href="#naslednji-koraki">
            Naslednji koraki
          </a>
        </div>
      </header>

      <main className="content">
        <section className="panel" id="vsebina">
          <div className="section-heading">
            <span>Osnova projekta</span>
            <h2>Kaj je trenutno vključeno</h2>
          </div>

          <div className="grid">
            {highlights.map((item) => (
              <article className="card" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel panel--accent">
          <div className="section-heading">
            <span>Tehnična smer</span>
            <h2>Brez odvečne kompleksnosti</h2>
          </div>

          <div className="stack">
            <div className="stack__item">
              <strong>Framework:</strong> React
            </div>
            <div className="stack__item">
              <strong>Build tool:</strong> Vite
            </div>
            <div className="stack__item">
              <strong>Jezik:</strong> TypeScript
            </div>
            <div className="stack__item">
              <strong>Backend:</strong> trenutno ni vključen
            </div>
            <div className="stack__item">
              <strong>Database:</strong> trenutno ni vključen
            </div>
          </div>
        </section>

        <section className="panel" id="naslednji-koraki">
          <div className="section-heading">
            <span>Naprej</span>
            <h2>Predlagani naslednji koraki</h2>
          </div>

          <ol className="steps">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}

export default App;
