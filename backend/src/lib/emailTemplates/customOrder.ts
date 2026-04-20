function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(cents / 100);
}

function wrapShell(inner: string) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1f1812;">
      ${inner}
      <hr style="border:none;border-top:1px solid #e4d2bf;margin:24px 0;">
      <p style="color:#7c5e45;font-size:0.8rem;">PravoLes · info@pravoles.si</p>
    </div>
  `;
}

export function customOrderQuoteHtml(opts: {
  name: string;
  priceCents: number;
  currency: string;
  message: string | null;
  accountUrl: string | null;
}) {
  const price = formatPrice(opts.priceCents, opts.currency);
  const action = opts.accountUrl
    ? `<p>
         <a href="${opts.accountUrl}"
            style="display:inline-block;padding:12px 24px;background:#2f2117;color:#f7f0e7;border-radius:8px;text-decoration:none;font-weight:bold;">
           Oglej si ponudbo in plačaj
         </a>
       </p>`
    : `<p style="color:#544237;">Prijavite se v svoj račun za sprejem ponudbe.</p>`;

  return wrapShell(`
    <h2 style="color:#2f2117;">Pozdravljeni ${opts.name},</h2>
    <p>Pripravili smo ponudbo za vaše naročilo po meri.</p>
    <p style="font-size:1.25rem;font-weight:bold;color:#2f2117;">Cena: ${price}</p>
    ${opts.message ? `<div style="background:#fffbf4;border-left:3px solid #c8a882;padding:12px 14px;border-radius:4px;white-space:pre-wrap;">${opts.message}</div>` : ""}
    ${action}
    <p style="color:#544237;font-size:0.85rem;">Če imate vprašanja, odgovorite na to e-sporočilo.</p>
  `);
}

export function customOrderRejectedHtml(opts: {
  name: string;
  message: string | null;
}) {
  return wrapShell(`
    <h2 style="color:#2f2117;">Pozdravljeni ${opts.name},</h2>
    <p>Žal vašega povpraševanja po meri trenutno ne moremo sprejeti.</p>
    ${opts.message ? `<div style="background:#fffbf4;border-left:3px solid #c8a882;padding:12px 14px;border-radius:4px;white-space:pre-wrap;">${opts.message}</div>` : ""}
    <p style="color:#544237;font-size:0.9rem;">Hvala za zanimanje in lep pozdrav.</p>
  `);
}

export function customOrderSubmittedHtml(opts: { name: string; description: string }) {
  return wrapShell(`
    <h2 style="color:#2f2117;">Hvala, ${opts.name}!</h2>
    <p>Prejeli smo vaše povpraševanje za izdelek po meri. V kratkem vam bomo pripravili ponudbo.</p>
    <div style="background:#fffbf4;border-left:3px solid #c8a882;padding:12px 14px;border-radius:4px;white-space:pre-wrap;">${opts.description}</div>
  `);
}
