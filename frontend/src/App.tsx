import { useState } from "react";
import { useTranslation } from "react-i18next";
import ProductShowcase from "./components/ProductShowcase";
import CartPanel from "./components/CartPanel";
import { CartProvider } from "./cart";

type Highlight = { title: string; text: string };
type AboutPoint = { title: string; text: string };
type GalleryItem = {
  title: string;
  description: string;
  image: string;
  alt: string;
};
type ContactItem = { title: string; text: string };

function App() {
  const { t, i18n } = useTranslation();
  const [langOpen, setLangOpen] = useState(false);

  const languageOptions = [
    { code: "sl", label: "Slovenščina" },
    { code: "en", label: "English" },
    { code: "de", label: "Deutsch" },
    { code: "it", label: "Italiano" },
  ];

  const navLinks = [
    { href: "#vsebina", label: t("nav.vsebina") },
    { href: "#products", label: t("nav.products") },
    { href: "#o-nas", label: t("nav.about") },
    { href: "#galerija", label: t("nav.gallery") },
    { href: "#kontakt", label: t("nav.contact") },
  ];

  const highlights = t("highlights", { returnObjects: true }) as Highlight[];
  const aboutPoints = t("aboutPoints", { returnObjects: true }) as AboutPoint[];
  const galleryItems = t("galleryItems", {
    returnObjects: true,
  }) as GalleryItem[];
  const products = t("products", { returnObjects: true }) as GalleryItem[];
  const contactItems = t("contactItems", {
    returnObjects: true,
  }) as ContactItem[];

  return (
    <CartProvider>
      <div className="page-shell">
        <header className="hero">
          <div className="hero__eyebrow">{t("hero.eyebrow")}</div>
          <h1>{t("hero.title")}</h1>
          <p className="hero__lead">{t("hero.lead")}</p>

        <div className="lang-menu" aria-label="Language switcher">
          <button
            type="button"
            className="lang-menu__toggle"
            onClick={() => setLangOpen((v) => !v)}
            aria-expanded={langOpen}
            aria-haspopup="listbox"
          >
            Language
          </button>
          {langOpen && (
            <div className="lang-menu__list">
              {languageOptions.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  className={
                    i18n.language.startsWith(lang.code)
                      ? "lang-menu__item lang-menu__item--active"
                      : "lang-menu__item"
                  }
                  onClick={() => {
                    i18n.changeLanguage(lang.code);
                    setLangOpen(false);
                  }}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="hero__actions">
          <a className="button button--primary" href="#vsebina">
            {t("hero.primaryCta")}
          </a>
          <a className="button button--secondary" href="#kontakt">
            {t("hero.secondaryCta")}
          </a>
        </div>
      </header>

        <div className="content-layout">
          <aside className="side-nav" aria-label={t("navTitle")}>
            <div className="side-nav__heading">{t("navTitle")}</div>
            <nav className="side-nav__list">
              {navLinks.map((link) => (
                <a key={link.href} href={link.href} className="side-nav__link">
                  {link.label}
                </a>
              ))}
            </nav>

            <CartPanel />
          </aside>

        <main className="content">
        <section className="panel" id="vsebina">
          <div className="section-heading">
            <span>{t("structure.eyebrow")}</span>
            <h2>{t("structure.title")}</h2>
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
            <span>{t("about.eyebrow")}</span>
            <h2>{t("about.title")}</h2>
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
            <span>{t("gallery.eyebrow")}</span>
            <h2>{t("gallery.title")}</h2>
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

        <section className="panel panel--accent" id="kontakt">
          <div className="section-heading">
            <span>{t("contact.eyebrow")}</span>
            <h2>{t("contact.title")}</h2>
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
              {t("contact.note")} <a href="mailto:info@pravoles.si">info@pravoles.si</a>
            </p>
          </div>
        </section>
          </main>
        </div>
      </div>
    </CartProvider>
  );
}

export default App;
