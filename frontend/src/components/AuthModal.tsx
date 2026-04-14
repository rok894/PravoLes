import { FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { fetchJson } from "../api";

type User = { id: string; email: string };

const DISMISS_KEY = "pravoles_auth_modal_dismissed_v1";

function AuthModal() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(true);
  const [dbOk, setDbOk] = useState(true);
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  async function refreshMe(): Promise<User | null> {
    const data = await fetchJson<{ user: User | null }>("/api/auth/me", {
      method: "GET",
    });
    return data.user;
  }

  useEffect(() => {
    (async () => {
      try {
        if (sessionStorage.getItem(DISMISS_KEY) === "1") {
          setOpen(false);
          return;
        }
        try {
          await fetchJson("/api/health", { method: "GET" });
          setDbOk(true);
        } catch {
          setDbOk(false);
        }
        const user = await refreshMe();
        setOpen(!user);
      } catch {
        setOpen(true);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "forgot") {
        await fetchJson("/api/auth/forgot-password", {
          method: "POST",
          body: JSON.stringify({ email }),
        });
        setForgotSent(true);
      } else if (mode === "signup") {
        await fetchJson("/api/auth/signup", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        setPassword("");
        setOpen(false);
        sessionStorage.removeItem(DISMISS_KEY);
      } else {
        await fetchJson("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        setPassword("");
        setOpen(false);
        sessionStorage.removeItem(DISMISS_KEY);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function continueAsGuest() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
  }

  if (checking || !open) return null;

  return (
    <div className="auth-modal" role="dialog" aria-modal="true">
      <button
        type="button"
        className="auth-modal__backdrop"
        aria-label="Close"
        onClick={continueAsGuest}
      />
      <div className="auth-modal__panel">
        <div className="auth-modal__eyebrow">{t("auth.modalEyebrow")}</div>
        <h2 className="auth-modal__title">{t("auth.modalTitle")}</h2>
        <p className="auth-modal__text">{t("auth.modalText")}</p>

        {!dbOk ? (
          <p className="auth-modal__error">{t("auth.dbUnavailable")}</p>
        ) : null}

        {mode !== "forgot" && (
          <div className="auth-modal__tabs" role="tablist" aria-label="Auth mode">
            <button
              type="button"
              className={mode === "login" ? "auth-modal__tab auth-modal__tab--active" : "auth-modal__tab"}
              onClick={() => { setMode("login"); setError(null); }}
              disabled={busy || !dbOk}
            >
              {t("auth.login")}
            </button>
            <button
              type="button"
              className={mode === "signup" ? "auth-modal__tab auth-modal__tab--active" : "auth-modal__tab"}
              onClick={() => { setMode("signup"); setError(null); }}
              disabled={busy || !dbOk}
            >
              {t("auth.signup")}
            </button>
          </div>
        )}

        {mode === "forgot" ? (
          forgotSent ? (
            <div className="auth-modal__form">
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--ink-muted)", lineHeight: 1.6 }}>
                {t("auth.forgotSent")}
              </p>
              <div className="auth-modal__actions" style={{ marginTop: 16 }}>
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => { setMode("login"); setForgotSent(false); }}
                >
                  {t("auth.login")}
                </button>
              </div>
            </div>
          ) : (
            <form className="auth-modal__form" onSubmit={onSubmit}>
              <label className="auth-modal__field">
                <span>{t("auth.email")}</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  disabled={busy}
                />
              </label>
              {error && <p className="auth-modal__error">{error}</p>}
              <div className="auth-modal__actions">
                <button type="submit" className="button button--primary" disabled={busy}>
                  {busy ? "…" : t("auth.forgotSubmit")}
                </button>
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => { setMode("login"); setError(null); }}
                  disabled={busy}
                >
                  ← {t("auth.login")}
                </button>
              </div>
            </form>
          )
        ) : (
          <form className="auth-modal__form" onSubmit={onSubmit}>
            <label className="auth-modal__field">
              <span>{t("auth.email")}</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                disabled={busy || !dbOk}
              />
            </label>

            <label className="auth-modal__field">
              <span>
                {t("auth.password")}
                {mode === "login" && (
                  <button
                    type="button"
                    className="auth-panel__link auth-panel__link--inline"
                    onClick={() => { setMode("forgot"); setError(null); }}
                    disabled={busy || !dbOk}
                  >
                    {t("auth.forgotPassword")}
                  </button>
                )}
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                required
                minLength={8}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                disabled={busy || !dbOk}
              />
            </label>

            {error && <p className="auth-modal__error">{error}</p>}

            <div className="auth-modal__actions">
              <button
                type="submit"
                className="button button--primary"
                disabled={busy || !dbOk}
              >
                {busy ? "…" : mode === "signup" ? t("auth.signup") : t("auth.login")}
              </button>
              <button
                type="button"
                className="button button--secondary"
                onClick={continueAsGuest}
                disabled={busy}
              >
                {t("auth.continueAsGuest")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default AuthModal;
