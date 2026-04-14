type Entry = { count: number; reset: number };

const store = new Map<string, Entry>();
let lastCleanup = 0;
const CLEANUP_EVERY_MS = 60_000;
const MAX_KEYS = 10_000;

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

function cleanup(now: number) {
  if (now - lastCleanup < CLEANUP_EVERY_MS && store.size < MAX_KEYS) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (entry.reset < now) store.delete(key);
  }
}

/**
 * Returns true if the request is allowed, false if rate-limited.
 * @param key      Unique key per endpoint+identity (e.g. "login:1.2.3.4")
 * @param limit    Max requests allowed per window
 * @param windowMs Window size in milliseconds
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  return checkRateLimitDetailed(key, limit, windowMs).allowed;
}

export function checkRateLimitDetailed(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  cleanup(now);
  const entry = store.get(key);

  if (!entry || entry.reset < now) {
    store.set(key, { count: 1, reset: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((entry.reset - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  entry.count++;
  return { allowed: true };
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
