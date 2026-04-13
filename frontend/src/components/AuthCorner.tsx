import { FormEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchJson } from "../api";
import OrderHistory from "./OrderHistory";

type User = { id: string; email: string };

const AVATAR_PALETTE = ["#5c4a3a", "#7c5e45", "#a0785a", "#6b5244", "#8b6b52", "#4a3728"];
function avatarColor(email: string) {
  return AVATAR_PALETTE[email.charCodeAt(0) % AVATAR_PALETTE.length];
}

function AuthCorner() {
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function refreshMe() {
    try {
      const data = await fetchJson<{ user: User | null }>("/api/auth/me", { method: "GET" });
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }

  useEffect(() => { refreshMe(); }, []);

  useEffect(() => { setOpen(false); }, [user]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await fetchJson(mode === "signup" ? "/api/auth/signup" : "/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setPassword("");
      setOpen(false);
      await refreshMe();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      await fetchJson("/api/auth/logout", { method: "POST", body: "{}" });
      setUser(null);
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
    {ordersOpen && <OrderHistory onClose={() => setOrdersOpen(false)} />}
    <div className="auth-corner" ref={ref}>
      {user ? (
        <>
          <button
            type="button"
            className="auth-corner__avatar"
            style={{ background: avatarColor(user.email) }}
            onClick={() => setOpen((v) => !v)}
            aria-label={user.email}
          >
            {user.email[0].toUpperCase()}
          </button>
          {open && (
            <div className="auth-corner__dropdown auth-corner__dropdown--user">
              <p className="auth-corner__who">{user.email}</p>
              <button
                type="button"
                className="auth-corner__logout"
                onClick={() => { setOpen(false); setOrdersOpen(true); }}
              >
                {t("orders.myOrders")}
              </button>
              <button
                type="button"
                className="auth-corner__logout"
                onClick={logout}
                disabled={busy}
              >
                {t("auth.logout")}
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <button
            type="button"
            className="auth-corner__btn auth-corner__btn--primary"
            onClick={() => setOpen((v) => !v)}
          >
            {t("auth.login")}
          </button>
          {open && (
            <div className="auth-corner__dropdown">
              <div className="auth-corner__tabs">
                <button
                  type="button"
                  className={mode === "login" ? "auth-corner__tab auth-corner__tab--active" : "auth-corner__tab"}
                  onClick={() => setMode("login")}
                >
                  {t("auth.login")}
                </button>
                <button
                  type="button"
                  className={mode === "signup" ? "auth-corner__tab auth-corner__tab--active" : "auth-corner__tab"}
                  onClick={() => setMode("signup")}
                >
                  {t("auth.signup")}
                </button>
              </div>
              <form className="auth-corner__form" onSubmit={onSubmit}>
                <label className="auth-corner__field">
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
                <label className="auth-corner__field">
                  <span>{t("auth.password")}</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                    required
                    minLength={8}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    disabled={busy}
                  />
                </label>
                {error && <p className="auth-corner__error">{error}</p>}
                <button
                  type="submit"
                  className="button button--primary button--small"
                  disabled={busy}
                >
                  {mode === "signup" ? t("auth.signup") : t("auth.login")}
                </button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
    </>
  );
}

export default AuthCorner;
