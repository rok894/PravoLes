import { FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { fetchJson } from "../api";

type User = { id: string; email: string };

function AuthPanel() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  async function refreshMe() {
    try {
      const data = await fetchJson<{ user: User | null }>("/api/auth/me", {
        method: "GET",
      });
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }

  useEffect(() => {
    refreshMe();
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
        await refreshMe();
      } else {
        await fetchJson("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        setPassword("");
        await refreshMe();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setError(null);
    setBusy(true);
    try {
      await fetchJson("/api/auth/logout", { method: "POST", body: "{}" });
      setUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-panel" aria-label={t("auth.title")}>
      <div className="auth-panel__header">
        <div className="auth-panel__title">{t("auth.title")}</div>
        {user ? (
          <button
            type="button"
            className="auth-panel__link"
            onClick={logout}
            disabled={busy}
          >
            {t("auth.logout")}
          </button>
        ) : (
          <button
            type="button"
            className="auth-panel__link"
            onClick={() => {
              setMode((m) => (m === "login" || m === "forgot" ? "signup" : "login"));
              setError(null);
              setForgotSent(false);
            }}
            disabled={busy}
          >
            {mode === "signup" ? t("auth.switchLogin") : t("auth.switchSignup")}
          </button>
        )}
      </div>

      {user ? (
        <p className="auth-panel__who">
          {t("auth.loggedInAs")} <strong>{user.email}</strong>
        </p>
      ) : mode === "forgot" ? (
        forgotSent ? (
          <p className="auth-panel__info">{t("auth.forgotSent")}</p>
        ) : (
          <form className="auth-panel__form" onSubmit={onSubmit}>
            <label className="auth-panel__field">
              <span>{t("auth.email")}</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </label>
            {error && <p className="auth-panel__error">{error}</p>}
            <button
              type="submit"
              className="button button--primary button--small auth-panel__submit"
              disabled={busy}
            >
              {busy ? "…" : t("auth.forgotSubmit")}
            </button>
            <button
              type="button"
              className="auth-panel__link auth-panel__link--sm"
              onClick={() => { setMode("login"); setError(null); }}
            >
              ← {t("auth.login")}
            </button>
          </form>
        )
      ) : (
        <form className="auth-panel__form" onSubmit={onSubmit}>
          <label className="auth-panel__field">
            <span>{t("auth.email")}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </label>

          {mode === "login" && (
            <label className="auth-panel__field">
              <span>
                {t("auth.password")}
                <button
                  type="button"
                  className="auth-panel__link auth-panel__link--inline"
                  onClick={() => { setMode("forgot"); setError(null); }}
                >
                  {t("auth.forgotPassword")}
                </button>
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                required
                minLength={8}
                autoComplete="current-password"
              />
            </label>
          )}

          {mode === "signup" && (
            <label className="auth-panel__field">
              <span>{t("auth.password")}</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </label>
          )}

          {error && <p className="auth-panel__error">{error}</p>}

          <button
            type="submit"
            className="button button--primary button--small auth-panel__submit"
            disabled={busy}
          >
            {busy ? "…" : mode === "signup" ? t("auth.signup") : t("auth.login")}
          </button>
        </form>
      )}
    </section>
  );
}

export default AuthPanel;
