import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

const STORAGE_KEY = "pravoles_cookie_consent";

export default function CookieBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // ignore
    }
  }, []);

  function accept() {
    try { localStorage.setItem(STORAGE_KEY, "accepted"); } catch { /* ignore */ }
    setVisible(false);
  }

  function decline() {
    try { localStorage.setItem(STORAGE_KEY, "declined"); } catch { /* ignore */ }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-label={t("cookie.title")}>
      <div className="cookie-banner__body">
        <p className="cookie-banner__text">
          <strong>{t("cookie.title")}</strong>{" "}
          {t("cookie.text")}
        </p>
        <div className="cookie-banner__actions">
          <button type="button" className="button button--primary button--small" onClick={accept}>
            {t("cookie.accept")}
          </button>
          <button type="button" className="cookie-banner__decline" onClick={decline}>
            {t("cookie.decline")}
          </button>
        </div>
      </div>
    </div>
  );
}
