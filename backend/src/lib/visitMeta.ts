const MOBILE_UA = /android|iphone|ipod|windows phone|iemobile|blackberry|bb10|mini|mobile|silk/i;
const TABLET_UA = /ipad|tablet|kindle|playbook/i;
const BOT_UA = /bot|crawler|spider|crawling|preview|slurp|mediapartners|pingdom|lighthouse/i;

function classifyDevice(userAgent: string | null | undefined): string {
  if (!userAgent) return "unknown";
  if (BOT_UA.test(userAgent)) return "bot";
  if (TABLET_UA.test(userAgent)) return "tablet";
  if (MOBILE_UA.test(userAgent)) return "mobile";
  return "desktop";
}

// Pick country from known edge/proxy headers. No external IP lookup — we only
// use what the infra already provides. Returns null when nothing is available.
function detectCountry(headers: Headers): string | null {
  const candidates = [
    "cf-ipcountry",
    "x-vercel-ip-country",
    "x-country-code",
    "x-appengine-country",
    "fastly-client-country-code",
  ];
  for (const name of candidates) {
    const v = headers.get(name);
    if (v && v.length >= 2 && v.length <= 3 && v.toUpperCase() !== "XX") {
      return v.toUpperCase();
    }
  }
  // Fallback: parse first 2-letter region from Accept-Language (e.g. sl-SI → SI)
  const al = headers.get("accept-language");
  if (al) {
    const m = al.match(/[a-z]{2,3}-([A-Z]{2})/);
    if (m) return m[1];
  }
  return null;
}

export { classifyDevice, detectCountry };
