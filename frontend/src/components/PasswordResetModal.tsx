import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchJson } from "../api";

type Props = { token: string; onDone: () => void };

export default function PasswordResetModal({ token, onDone }: Props) {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await fetchJson("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setDone(true);
      // Remove token from URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete("reset_token");
      window.history.replaceState({}, "", url.toString());
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.resetInvalid"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="reset-overlay">
      <div className="reset-modal">
        <h2>{t("auth.resetTitle")}</h2>

        {done ? (
          <>
            <p className="auth-panel__info">{t("auth.resetDone")}</p>
            <button
              type="button"
              className="button button--primary button--small"
              onClick={onDone}
            >
              {t("auth.login")}
            </button>
          </>
        ) : (
          <form className="auth-panel__form" onSubmit={onSubmit}>
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
            {error && <p className="auth-panel__error">{error}</p>}
            <button
              type="submit"
              className="button button--primary button--small auth-panel__submit"
              disabled={busy}
            >
              {busy ? "…" : t("auth.resetSubmit")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
