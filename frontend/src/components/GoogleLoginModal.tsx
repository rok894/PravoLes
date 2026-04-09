import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { BACKEND_URL, fetchJson } from "../api";

type User = { id: string; email: string };

function GoogleLoginModal() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const backendOrigin = new URL(BACKEND_URL).origin;

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchJson<{ user: User | null }>("/api/auth/me", {
          method: "GET",
        });
        setOpen(!data.user);
      } catch {
        setOpen(true);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!open) return;

    function onMessage(evt: MessageEvent) {
      if (evt.origin !== backendOrigin) return;
      if (!evt.data || typeof evt.data !== "object") return;
      const type = (evt.data as { type?: unknown }).type;
      if (type === "auth:success") {
        setOpen(false);
        setError(null);
      }
      if (type === "auth:error") {
        const msg = (evt.data as { message?: unknown }).message;
        setError(typeof msg === "string" ? msg : t("auth.popupError"));
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [backendOrigin, open, t]);

  function openGooglePopup() {
    setError(null);
    const w = 520;
    const h = 640;
    const left = Math.max(0, window.screenX + (window.outerWidth - w) / 2);
    const top = Math.max(0, window.screenY + (window.outerHeight - h) / 2);

    const popup = window.open(
      `${BACKEND_URL}/api/auth/google/start`,
      "google_oauth",
      `popup=yes,width=${w},height=${h},left=${left},top=${top}`,
    );

    if (!popup) {
      setError(t("auth.popupBlocked"));
      return;
    }
    popup.focus();
  }

  if (checking || !open) return null;

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <button
        type="button"
        className="modal__backdrop"
        aria-label="Close"
        onClick={() => setOpen(false)}
      />
      <div className="modal__panel">
        <div className="modal__eyebrow">{t("auth.modalEyebrow")}</div>
        <h2 className="modal__title">{t("auth.modalTitle")}</h2>
        <p className="modal__text">{t("auth.modalText")}</p>

        {error ? <p className="modal__error">{error}</p> : null}

        <div className="modal__actions">
          <button
            type="button"
            className="button button--primary"
            onClick={openGooglePopup}
          >
            {t("auth.continueWithGoogle")}
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => setOpen(false)}
          >
            {t("auth.continueAsGuest")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default GoogleLoginModal;
