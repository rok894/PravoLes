import ProductShowcase from "./components/ProductShowcase";

const navLinks = [
  { href: "#vsebina", label: "Vsebina" },
  { href: "#products", label: "Izdelki" },
  { href: "#o-nas", label: "O nas" },
  { href: "#galerija", label: "Galerija" },
  { href: "#kontakt", label: "Kontakt" },
];

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

const products = [
  {
    title: "Stol iz masivnega lesa",
    description: "Ročno brušen stol s poudarkom na naravni teksturi in udobju.",
    image: "/images/stol_1.jpg",
    alt: "Lesen stol v svetlem prostoru",
  },
  {
    title: "Komoda s predalniki",
    description: "Čisti robovi, mehko zapiranje in topli toni masivnega lesa.",
    image: "/images/predalčki_1.jpg",
    alt: "Lesena komoda s predalniki",
  },
  {
    title: "Šahovnica iz oreha",
    description: "Kontrastna šahovnica, lakirana za dolgotrajno zaščito.",
    image: "/images/šahovnica_1.jpg",
    alt: "Lesena šahovnica na mizi",
  },
];

const aboutPoints = [
  {
    title: "Pravilen pristop",
    text: "Vsak izdelek je narejen ročno z mislijo na trajnost in estetiko.",
  },
  {
    title: "Lokalna izdelava",
    text: "Podpiramo domače obrtnike in lesena dela iz slovenskih delavnic.",
  },
  {
    title: "Cilj strani",
    text: "Pripraviti jasno, privlačno in informativno predstavitev izdelkov.",
  },
];

const galleryItems = [
  {
    title: "Topli detajli",
    description: "Elegantni zaključki, ki poudarjajo naravno strukturo lesa.",
    image: "/images/stol_1.jpg",
    alt: "Topli leseni detajli",
  },
  {
    title: "Skladiščni ambient",
    description: "Minimalistična postavitev, namenjena predstavitvi samega izdelka.",
    image: "/images/predalčki_1.jpg",
    alt: "Leseni ambient s komodo",
  },
  {
    title: "Ročna izdelava",
    description: "Vsak kos nosi unikatni pečat ročne obdelave.",
    image: "/images/šahovnica_1.jpg",
    alt: "Ročna lesena šahovnica",
  },
];

const contactItems = [
  {
    title: "Kontaktna točka",
    text: "Pišite na info@pravoles.si za povpraševanja o cenah in materialih.",
  },
  {
    title: "Sestanek v delavnici",
    text: "Organiziramo ogled in svetovanje za okroglih 15 minut.",
  },
  {
    title: "Prilagojena ponudba",
    text: "Za naročila po meri pripravimo predračun in čas izdelave.",
  },
];

function App() {
  return (
    <div className="page-shell">
      <header className="hero">
        <div className="hero__eyebrow">Dynamic page structure</div>
        <h1>PravoLes</h1>
        <p className="hero__lead">
          Preprosta in elegantna osnova za statično spletno stran, zgrajeno z
          Vite, React in TypeScript.
        </p>

        <nav className="hero__nav">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="hero__nav-item">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hero__actions">
          <a className="button button--primary" href="#vsebina">
            Poglej strukturo
          </a>
          <a className="button button--secondary" href="#kontakt">
            Kontakt
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

        <section className="panel panel--accent" id="o-nas">
          <div className="section-heading">
            <span>O nas</span>
            <h2>Naša zgodba in vizija</h2>
          </div>

          <div className="grid">
            {aboutPoints.map((item) => (
              <article className="card" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel" id="galerija">
          <div className="section-heading">
            <span>Galerija</span>
            <h2>Primeri izdelkov in ambientov</h2>
          </div>

          <div className="gallery-grid">
            {galleryItems.map((item) => (
              <article className="gallery-card" key={item.title}>
                <div className="gallery-card__image">
                  <img src={item.image} alt={item.alt} loading="lazy" />
                </div>
                <div className="gallery-card__body">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <ProductShowcase products={products} />

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

        <section className="panel panel--accent" id="kontakt">
          <div className="section-heading">
            <span>Kontakt</span>
            <h2>Pišite nam za informacije in naročila po meri</h2>
          </div>

          <div className="grid">
            {contactItems.map((item) => (
              <article className="card" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>

          <div className="contact-note">
            <p>
              Če želite hitro povpraševanje, pošljite e-pošto na
              <a href="mailto:info@pravoles.si"> info@pravoles.si</a> in
              pripišite približno željeno velikost, material in rok dobave.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
