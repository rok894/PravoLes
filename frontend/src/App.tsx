import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ProductShowcase from "./components/ProductShowcase";
import CartPanel from "./components/CartPanel";
import { CartProvider } from "./cart";
import AuthModal from "./components/AuthModal";
import AuthCorner from "./components/AuthCorner";
import ThemeToggle from "./components/ThemeToggle";
import CookieBanner from "./components/CookieBanner";
import MobileCartFab from "./components/MobileCartFab";
import PasswordResetModal from "./components/PasswordResetModal";
import { fetchJson } from "./api";
import { useToast } from "./ToastContext";

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
  const { addToast } = useToast();
  const [langOpen, setLangOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("reset_token");
  });

  useEffect(() => {
    if (resetToken) {
      const url = new URL(window.location.href);
      url.searchParams.delete("reset_token");
      window.history.replaceState({}, "", url.toString());
    }
  }, [resetToken]);

  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage?.split("-")[0] ?? "sl";
  }, [i18n.resolvedLanguage]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setLangOpen(false);
      setMobileNavOpen(false);
    }

    function onPointerDown(e: PointerEvent) {
      if (!langOpen) return;
      const root = langMenuRef.current;
      if (!root) return;
      if (e.target instanceof Node && root.contains(e.target)) return;
      setLangOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [langOpen]);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactWebsite, setContactWebsite] = useState("");
  const [contactBusy, setContactBusy] = useState(false);
  const [contactDone, setContactDone] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  async function handleContact(e: FormEvent) {
    e.preventDefault();
    if (contactWebsite.trim()) return;
    setContactBusy(true);
    setContactError(null);
    try {
      await fetchJson("/api/contact", {
        method: "POST",
        body: JSON.stringify({
          name: contactName,
          email: contactEmail,
          message: contactMessage,
          website: contactWebsite,
        }),
      });
      setContactDone(true);
      setContactName("");
      setContactEmail("");
      setContactMessage("");
      setContactWebsite("");
      addToast(t("contact.sent"), "success");
    } catch (err) {
      setContactError(err instanceof Error ? err.message : t("contact.error"));
      addToast(err instanceof Error ? err.message : t("contact.error"), "error");
    } finally {
      setContactBusy(false);
    }
  }

  const languageOptions = useMemo(() => [
    { code: "sl", label: "Slovenščina" },
    { code: "en", label: "English" },
    { code: "de", label: "Deutsch" },
    { code: "it", label: "Italiano" },
  ], []);

  const currentLanguageLabel =
    languageOptions.find((l) => i18n.language.startsWith(l.code))?.label ??
    i18n.language;

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
  const contactItems = t("contactItems", {
    returnObjects: true,
  }) as ContactItem[];

  return (
    <CartProvider>
      <div className="page-shell">
        <a className="skip-link" href="#main">
          {t("common.skipToContent")}
        </a>
        <AuthModal />
        <div className="top-controls">
          <ThemeToggle />
          <AuthCorner />
        </div>

        <button
          type="button"
          className="hamburger-btn"
          aria-label={t("common.openNav")}
          aria-expanded={mobileNavOpen}
          onClick={() => setMobileNavOpen(true)}
        >
          <span /><span /><span />
        </button>

        {mobileNavOpen && (
          <div
            className="mobile-nav-overlay"
            onClick={(e) => { if (e.target === e.currentTarget) setMobileNavOpen(false); }}
          >
            <nav className="mobile-nav-drawer">
              <button
                type="button"
                className="mobile-nav-drawer__close"
                aria-label={t("common.closeNav")}
                onClick={() => setMobileNavOpen(false)}
              >
                ✕
              </button>
              <div className="mobile-nav-drawer__heading">{t("navTitle")}</div>
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="mobile-nav-drawer__link"
                  onClick={() => setMobileNavOpen(false)}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        )}
        <header className="hero">
          <div className="hero__eyebrow">{t("hero.eyebrow")}</div>
          <h1>{t("hero.title")}</h1>
          <p className="hero__lead">{t("hero.lead")}</p>

        <div className="lang-menu" ref={langMenuRef} aria-label={t("common.language")}>
          <button
            type="button"
            className="lang-menu__toggle"
            onClick={() => setLangOpen((v) => !v)}
            aria-expanded={langOpen}
            aria-haspopup="listbox"
          >
            {t("common.language")}: {currentLanguageLabel}
          </button>
          {langOpen && (
            <div className="lang-menu__list" role="listbox" aria-label={t("common.language")}>
              {languageOptions.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  role="option"
                  aria-selected={i18n.language.startsWith(lang.code)}
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
          <a className="button button--primary" href="#products">
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

        <main className="content" id="main">
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

        <ProductShowcase />

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

          {contactDone ? (
            <div className="contact-form contact-form--done">
              <p>{t("contact.sent")}</p>
            </div>
          ) : (
            <form className="contact-form" onSubmit={handleContact}>
              <label className="contact-form__field contact-form__hp" aria-hidden="true">
                <span>Website</span>
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={contactWebsite}
                  onChange={(e) => setContactWebsite(e.target.value)}
                />
              </label>
              <div className="contact-form__row">
                <label className="contact-form__field">
                  <span>{t("contact.name")}</span>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder={t("contact.namePlaceholder")}
                    required
                    maxLength={120}
                    disabled={contactBusy}
                  />
                </label>
                <label className="contact-form__field">
                  <span>{t("contact.email")}</span>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    disabled={contactBusy}
                  />
                </label>
              </div>
              <label className="contact-form__field">
                <span>{t("contact.message")}</span>
                <textarea
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder={t("contact.messagePlaceholder")}
                  required
                  minLength={5}
                  maxLength={2000}
                  rows={5}
                  disabled={contactBusy}
                />
              </label>
              {contactError && <p className="contact-form__error">{contactError}</p>}
              <button
                type="submit"
                className="button button--primary"
                disabled={contactBusy}
              >
                {contactBusy ? "…" : t("contact.send")}
              </button>
            </form>
          )}
        </section>
          </main>
        </div>
      </div>
      <MobileCartFab />
      <CookieBanner />
      {resetToken && (
        <PasswordResetModal token={resetToken} onDone={() => setResetToken(null)} />
      )}
    </CartProvider>
  );
}

export default App;
