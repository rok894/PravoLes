const BACKEND_URL = ((import.meta.env.VITE_BACKEND_URL as string | undefined) ?? "")
  .trim()
  .replace(/\/$/, "");

const DEFAULT_TIMEOUT_MS = 15_000;

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = BACKEND_URL ? `${BACKEND_URL}${path}` : path;

  const headers = new Headers(init?.headers);
  if (!headers.has("accept")) headers.set("accept", "application/json");
  if (init?.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const controller = new AbortController();
  const signal = init?.signal ?? controller.signal;
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      ...init,
      credentials: "include",
      headers,
      signal,
    });

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

export { BACKEND_URL, fetchJson };
