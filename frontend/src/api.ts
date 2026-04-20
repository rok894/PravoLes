const BACKEND_URL = ((import.meta.env.VITE_BACKEND_URL as string | undefined) ?? "")
  .trim()
  .replace(/\/$/, "");

const DEFAULT_TIMEOUT_MS = 15_000;
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const SESSION_STORAGE_KEY = "pravoles_sid";

function getSessionId(): string {
  try {
    const existing = localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing && existing.length >= 8) return existing;
  } catch {
    // ignore
  }
  const bytes = new Uint8Array(16);
  (globalThis.crypto ?? window.crypto).getRandomValues(bytes);
  const sid = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, sid);
  } catch {
    // ignore
  }
  return sid;
}

let csrfToken: string | null = null;
let csrfInflight: Promise<string | null> | null = null;

async function ensureCsrfToken(): Promise<string | null> {
  if (csrfToken) return csrfToken;
  if (csrfInflight) return csrfInflight;

  const url = BACKEND_URL ? `${BACKEND_URL}/api/csrf` : "/api/csrf";
  csrfInflight = fetch(url, { credentials: "include", headers: { accept: "application/json" } })
    .then(async (res) => {
      if (!res.ok) return null;
      const data = (await res.json().catch(() => null)) as { token?: string } | null;
      csrfToken = data?.token ?? null;
      return csrfToken;
    })
    .catch(() => null)
    .finally(() => {
      csrfInflight = null;
    });

  return csrfInflight;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = BACKEND_URL ? `${BACKEND_URL}${path}` : path;
  const method = (init?.method ?? "GET").toUpperCase();

  const headers = new Headers(init?.headers);
  if (!headers.has("accept")) headers.set("accept", "application/json");
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
  if (init?.body && !headers.has("content-type") && !isFormData) {
    headers.set("content-type", "application/json");
  }
  if (!headers.has("x-session-id")) headers.set("x-session-id", getSessionId());

  if (WRITE_METHODS.has(method)) {
    const token = await ensureCsrfToken();
    if (token) headers.set("x-csrf-token", token);
  }

  const controller = new AbortController();
  const signal = init?.signal ?? controller.signal;
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    let res = await fetch(url, {
      ...init,
      credentials: "include",
      headers,
      signal,
    });

    // If CSRF validation failed (e.g. token expired), refresh once and retry.
    if (res.status === 403 && WRITE_METHODS.has(method)) {
      csrfToken = null;
      const fresh = await ensureCsrfToken();
      if (fresh) {
        headers.set("x-csrf-token", fresh);
        res = await fetch(url, {
          ...init,
          credentials: "include",
          headers,
          signal,
        });
      }
    }

    if (res.status === 204) return undefined as unknown as T;

    const text = await res.text();
    const data = (text ? (JSON.parse(text) as unknown) : null) as T | null;

    if (!res.ok) {
      const msg =
        (data as { error?: string } | null)?.error ??
        (typeof text === "string" && text.trim() ? text : null) ??
        `HTTP ${res.status}`;
      throw new Error(msg);
    }

    return data as T;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export { BACKEND_URL, ensureCsrfToken, fetchJson, getSessionId };
