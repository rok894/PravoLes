import { FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { BACKEND_URL, fetchJson } from "../api";

type User = { id: string; email: string };

function AuthPanel() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      if (mode === "signup") {
        await fetchJson("/api/auth/signup", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
      } else {
        await fetchJson("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
      }
      setPassword("");
      await refreshMe();
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

  function googleLogin() {
    window.open(
      `${BACKEND_URL}/api/auth/google/start`,
      "google_oauth",
      "popup=yes,width=520,height=640",
    );
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
            onClick={() => setMode((m) => (m === "login" ? "signup" : "login"))}
            disabled={busy}
          >
            {mode === "login" ? t("auth.switchSignup") : t("auth.switchLogin")}
          </button>
        )}
      </div>

      {user ? (
        <p className="auth-panel__who">
          {t("auth.loggedInAs")} <strong>{user.email}</strong>
        </p>
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

          <label className="auth-panel__field">
            <span>{t("auth.password")}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              required
              minLength={8}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </label>

          {error ? <p className="auth-panel__error">{error}</p> : null}

          <button
            type="submit"
            className="button button--primary button--small auth-panel__submit"
            disabled={busy}
          >
            {mode === "signup" ? t("auth.signup") : t("auth.login")}
          </button>

          <button
            type="button"
            className="button button--secondary button--small auth-panel__submit"
            onClick={googleLogin}
            disabled={busy}
          >
            {t("auth.continueWithGoogle")}
          </button>
        </form>
      )}
    </section>
  );
}

export default AuthPanel;
