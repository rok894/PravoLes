const SOURCE_RULES: Array<{ pattern: RegExp; source: string }> = [
  { pattern: /facebook\.com|fb\.com|fbclid/i, source: "facebook" },
  { pattern: /instagram\.com/i, source: "instagram" },
  { pattern: /tiktok\.com/i, source: "tiktok" },
  { pattern: /youtube\.com|youtu\.be/i, source: "youtube" },
  { pattern: /twitter\.com|x\.com|t\.co/i, source: "twitter" },
  { pattern: /linkedin\.com/i, source: "linkedin" },
  { pattern: /pinterest\./i, source: "pinterest" },
  { pattern: /reddit\.com/i, source: "reddit" },
  { pattern: /google\./i, source: "google" },
  { pattern: /bing\.com|duckduckgo\.com|yahoo\.com/i, source: "search" },
  { pattern: /mail\.|outlook\.|gmail\./i, source: "email" },
];

const ALLOWED = new Set([
  "direct",
  "link",
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
  "twitter",
  "linkedin",
  "pinterest",
  "reddit",
  "google",
  "search",
  "email",
  "other",
]);

export function classifySource(referrer: string | null | undefined, hint?: string | null): string {
  if (hint && ALLOWED.has(hint)) return hint;
  if (!referrer) return "direct";
  for (const rule of SOURCE_RULES) {
    if (rule.pattern.test(referrer)) return rule.source;
  }
  return "link";
}

export function isValidSource(source: string): boolean {
  return ALLOWED.has(source);
}
