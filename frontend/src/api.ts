const BACKEND_URL =
  (import.meta.env.VITE_BACKEND_URL as string | undefined) ??
  "http://localhost:3000";

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const data = (await res.json().catch(() => null)) as T | null;
  if (!res.ok) {
    const msg =
      (data as unknown as { error?: string } | null)?.error ??
      `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export { BACKEND_URL, fetchJson };
