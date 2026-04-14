import nodemailer from "nodemailer";

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT ? parseInt(SMTP_PORT, 10) : 587,
    secure: SMTP_PORT === "465",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

const FROM = process.env.SMTP_FROM ?? "PravoLes <noreply@pravoles.si>";

export async function sendEmail(to: string, subject: string, html: string) {
  const transporter = getTransporter();

  if (!transporter) {
    // Dev fallback: log to console instead of failing
    console.log("\n📧 [EMAIL — SMTP not configured, logging instead]");
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${html.replace(/<[^>]+>/g, "")}\n`);
    return;
  }

  await transporter.sendMail({ from: FROM, to, subject, html });
}

export function passwordResetHtml(resetUrl: string) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#1f1812;">
      <h2 style="color:#2f2117;">Ponastavitev gesla — PravoLes</h2>
      <p>Prejeli smo zahtevo za ponastavitev gesla za vaš račun.</p>
      <p>
        <a href="${resetUrl}"
           style="display:inline-block;padding:12px 24px;background:#2f2117;color:#f7f0e7;border-radius:8px;text-decoration:none;font-weight:bold;">
          Ponastavi geslo
        </a>
      </p>
      <p style="color:#544237;font-size:0.85rem;">
        Povezava velja 1 uro. Če niste zahtevali ponastavitve, sporočilo prezrite.
      </p>
      <hr style="border:none;border-top:1px solid #e4d2bf;margin:24px 0;">
      <p style="color:#7c5e45;font-size:0.8rem;">PravoLes · info@pravoles.si</p>
    </div>
  `;
}

export function orderConfirmationHtml(opts: {
  email: string;
  orderId: string;
  items: { title: string; qty: number; priceCents: number }[];
  totalCents: number;
  currency: string;
}) {
  const fmt = (cents: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: opts.currency }).format(cents / 100);

  const rows = opts.items
    .map((i) => `<tr>
      <td style="padding:6px 8px;">${i.title}</td>
      <td style="padding:6px 8px;text-align:center;">${i.qty}</td>
      <td style="padding:6px 8px;text-align:right;">${fmt(i.priceCents * i.qty)}</td>
    </tr>`)
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1f1812;">
      <h2 style="color:#2f2117;">Hvala za naročilo! 🪵</h2>
      <p>Vaše naročilo <strong>#${opts.orderId.slice(-8).toUpperCase()}</strong> je bilo uspešno plačano.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <thead>
          <tr style="border-bottom:2px solid #c8a882;font-size:0.82rem;color:#7c5e45;">
            <th style="padding:6px 8px;text-align:left;">Izdelek</th>
            <th style="padding:6px 8px;text-align:center;">Kos</th>
            <th style="padding:6px 8px;text-align:right;">Znesek</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr style="border-top:2px solid #c8a882;font-weight:bold;">
            <td colspan="2" style="padding:8px;">Skupaj</td>
            <td style="padding:8px;text-align:right;">${fmt(opts.totalCents)}</td>
          </tr>
        </tfoot>
      </table>
      <p style="color:#544237;font-size:0.85rem;">
        Kontaktirali vas bomo z informacijami o dostavi. Hvala, ker ste izbrali PravoLes!
      </p>
      <hr style="border:none;border-top:1px solid #e4d2bf;margin:24px 0;">
      <p style="color:#7c5e45;font-size:0.8rem;">PravoLes · info@pravoles.si</p>
    </div>
  `;
}
