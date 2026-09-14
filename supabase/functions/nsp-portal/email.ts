/**
 * Transactional Email System — Master v1.0
 *
 * One system for every customer-facing transactional email. Adding a stage means
 * adding a row to STAGES, not writing another template: the hierarchy, spacing
 * and type are fixed so that a customer who has received one of these emails
 * already knows how to read the next.
 *
 * Constraints this file deliberately honours:
 *  - table layout with role="presentation"; no flex, grid, JS or remote fonts
 *  - critical CSS inline, so a stripped <style> block costs nothing essential
 *  - 600px max, width="100%" on mobile
 *  - dark mode handled in <style>, with inline light values as the fallback
 *  - readable with images off, CSS partially stripped, or the logo missing
 *  - lean enough to stay well under Gmail's ~102KB clipping threshold
 */

/* ------------------------------------------------------------------ tokens */

const C = {
  page: "#F5F3EE",
  card: "#FFFEFC",
  text: "#171717",
  muted: "#6B6B66",
  forest: "#234A38",
  sage: "#EAF1EC",
  border: "#E7E3DA",
  note: "#F7F6F2",
  noteRule: "#D7D2C6",
  delayedBg: "#F5ECDD",
  delayedText: "#785A22",
} as const;

// Single quotes only: these are interpolated into double-quoted style="..."
// attributes, and a double quote here silently terminates the attribute and
// eats the element's content. CSS accepts single-quoted family names.
const SERIF = "Georgia, 'Times New Roman', Times, serif";
const SANS = "Arial, Helvetica, sans-serif";

/* ------------------------------------------------------------------ stages */

export type Stage = "received" | "confirmed" | "scheduled" | "ready" | "delayed" | "completed";

interface StageSpec {
  badge: string;
  subject: (ref: string) => string;
  tone: "sage" | "delayed";
}

/**
 * The full status system. Only `received` and `confirmed` are wired to anything
 * today; the rest are defined so a later stage is a wiring job, not a redesign.
 */
export const STAGES: Record<Stage, StageSpec> = {
  received: {
    badge: "✓ REQUEST RECEIVED",
    subject: (r) => `Request received — #${r} | Natural State Peptides`,
    tone: "sage",
  },
  confirmed: {
    badge: "✓ REQUEST CONFIRMED",
    subject: (r) => `Request confirmed — #${r} | Natural State Peptides`,
    tone: "sage",
  },
  scheduled: {
    badge: "✓ DELIVERY SCHEDULED",
    subject: (r) => `Delivery scheduled — #${r} | Natural State Peptides`,
    tone: "sage",
  },
  ready: {
    badge: "✓ READY",
    subject: (r) => `Your request is ready — #${r} | Natural State Peptides`,
    tone: "sage",
  },
  delayed: {
    badge: "REQUEST UPDATE",
    subject: (r) => `Update to request #${r} | Natural State Peptides`,
    tone: "delayed",
  },
  completed: {
    badge: "✓ COMPLETED",
    subject: (r) => `Request completed — #${r} | Natural State Peptides`,
    tone: "sage",
  },
};

/* ------------------------------------------------------------------- model */

export interface EmailModel {
  stage: Stage;
  firstName: string;
  requestRef: string;
  items: { name: string; quantity: number; cents: number | null }[];
  /** Goods only. The delivery fee is listed separately and added to the total. */
  subtotalCents: number | null;
  deliveryFeeCents: number;
  totalCents: number | null;
  /** True while figures come from published prices rather than a confirmed order. */
  estimated: boolean;
  fulfilment: "pickup" | "delivery";
  /** "9-11am or 5-7pm" — pickup only. */
  windows: string | null;
  note: string | null;
  paymentLabel: string;
  deliveryRadiusMiles: number;
  deliveryOrigin: string;
  complianceLine: string;
  /** Hosted PNG. Falls back to a typographic wordmark when absent. */
  logoUrl: string | null;
}

/* ------------------------------------------------------------------ helpers */

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const usd = (cents: number) =>
  "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** A labelled block. `label` is the small uppercase section marker. */
const section = (label: string, inner: string) => `
<tr><td style="padding:0 32px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="border:1px solid ${C.border};border-radius:12px;background-color:${C.card};">
    <tr><td style="padding:24px;">
      <div style="font-family:${SANS};font-size:11px;line-height:16px;letter-spacing:1.2px;text-transform:uppercase;color:${C.muted};">${esc(label)}</div>
      <div style="height:16px;line-height:16px;font-size:0;">&nbsp;</div>
      ${inner}
    </td></tr>
  </table>
</td></tr>
<tr><td style="height:24px;line-height:24px;font-size:0;">&nbsp;</td></tr>`;

const gap = (h: number) => `<tr><td style="height:${h}px;line-height:${h}px;font-size:0;">&nbsp;</td></tr>`;

const value = (s: string, opts: { serif?: boolean; size?: number } = {}) =>
  `<div style="font-family:${opts.serif ? SERIF : SANS};font-size:${opts.size ?? 16}px;line-height:24px;color:${C.text};">${s}</div>`;

const quiet = (s: string) =>
  `<div style="font-family:${SANS};font-size:14px;line-height:22px;color:${C.muted};">${s}</div>`;

/* --------------------------------------------------------------- rendering */

function orderSummary(m: EmailModel): string {
  const rows = m.items
    .map(
      (i) => `
      <tr>
        <td style="padding:0 0 8px 0;font-family:${SANS};font-size:16px;line-height:24px;color:${C.text};">
          ${esc(i.name)}<br>
          <span style="font-size:14px;color:${C.muted};">Quantity: ${i.quantity}</span>
        </td>
        <td align="right" style="padding:0 0 8px 0;font-family:${SANS};font-size:16px;line-height:24px;color:${C.text};white-space:nowrap;">
          ${i.cents == null ? `<span style="color:${C.muted};font-size:14px;">to quote</span>` : esc(usd(i.cents))}
        </td>
      </tr>`,
    )
    .join("");

  // Shown even when waived: a customer who earned free delivery should see it.
  const feeRow =
    m.fulfilment === "delivery"
      ? `<tr>
           <td style="padding:8px 0 0 0;font-family:${SANS};font-size:16px;line-height:24px;color:${C.text};">Local delivery</td>
           <td align="right" style="padding:8px 0 0 0;font-family:${SANS};font-size:16px;line-height:24px;color:${m.deliveryFeeCents > 0 ? C.text : C.forest};white-space:nowrap;">${m.deliveryFeeCents > 0 ? esc(usd(m.deliveryFeeCents)) : "Free"}</td>
         </tr>`
      : "";

  const totalLabel = m.estimated ? "ESTIMATED TOTAL" : "TOTAL";
  const totalRow =
    m.totalCents == null
      ? `<div style="font-family:${SANS};font-size:16px;line-height:24px;color:${C.muted};">We'll confirm your total with you.</div>`
      : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
           <tr>
             <td style="font-family:${SANS};font-size:11px;line-height:16px;letter-spacing:1.2px;text-transform:uppercase;color:${C.muted};">${totalLabel}</td>
             <td align="right" class="total t1" style="font-family:${SERIF};font-size:32px;line-height:38px;color:${C.text};white-space:nowrap;">${esc(usd(m.totalCents))}</td>
           </tr>
         </table>`;

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}${feeRow}</table>
    <div style="height:16px;line-height:16px;font-size:0;">&nbsp;</div>
    <div class="rule" style="border-top:1px solid ${C.border};font-size:0;line-height:0;">&nbsp;</div>
    <div style="height:16px;line-height:16px;font-size:0;">&nbsp;</div>
    ${totalRow}`;
}

function fulfilmentBlock(m: EmailModel): string {
  if (m.fulfilment === "delivery") {
    return (
      value("Local Delivery") +
      quiet("Hot Springs area") +
      `<div style="height:16px;line-height:16px;font-size:0;">&nbsp;</div>` +
      value("Within 24 hours of confirmation") +
      quiet(
        `Within ${m.deliveryRadiusMiles} miles of ${esc(m.deliveryOrigin)}. ` +
          (m.deliveryFeeCents > 0
            ? `${usd(m.deliveryFeeCents)} flat fee, included above.`
            : "Delivery is free on this order."),
      )
    );
  }
  return (
    value("Local Pickup") +
    quiet("Hot Springs area") +
    (m.windows
      ? `<div style="height:16px;line-height:16px;font-size:0;">&nbsp;</div>` +
        `<div style="font-family:${SANS};font-size:11px;line-height:16px;letter-spacing:1.2px;text-transform:uppercase;color:${C.muted};">Preferred pickup window</div>` +
        `<div style="height:8px;line-height:8px;font-size:0;">&nbsp;</div>` +
        value(esc(m.windows))
      : "")
  );
}

function nextStep(m: EmailModel): string {
  if (m.stage === "confirmed") {
    return (
      `<div style="font-family:${SANS};font-size:16px;line-height:24px;color:${C.text};">Confirmed &rarr; ${m.fulfilment === "delivery" ? "Out for delivery" : "Ready for pickup"}</div>` +
      quiet(
        m.fulfilment === "delivery"
          ? "Follow the payment instructions provided with this confirmation. We bring it to you within 24 hours of payment clearing."
          : "Follow the payment instructions provided with this confirmation, and we'll settle the pickup time with you.",
      )
    );
  }
  return (
    `<div style="font-family:${SANS};font-size:16px;line-height:24px;color:${C.text};">Review &rarr; Confirmation &rarr; Fulfillment</div>` +
    quiet("We'll send another update as soon as your request is confirmed.")
  );
}

function headline(m: EmailModel): { head: string; sub: string } {
  const name = esc(m.firstName);
  if (m.stage === "confirmed") {
    return { head: `You're confirmed, ${name}.`, sub: "Everything is set." };
  }
  return {
    head: `Thanks, ${name} — we've got it.`,
    sub:
      "Your request has been received and is being reviewed. We'll confirm availability, final total, " +
      "fulfillment timing, and payment instructions before anything is finalized.",
  };
}

/* ------------------------------------------------------------------- build */

export function renderEmail(m: EmailModel): {
  subject: string;
  preheader: string;
  html: string;
  text: string;
} {
  const spec = STAGES[m.stage];
  const { head, sub } = headline(m);
  const first = m.items[0];
  const preheader =
    m.stage === "confirmed"
      ? "Your request is confirmed. Review your total and fulfillment details."
      : `We received your request${first ? ` for ${first.quantity} × ${first.name}` : ""}. We'll confirm the details shortly.`;

  const badgeBg = spec.tone === "delayed" ? C.delayedBg : C.sage;
  const badgeFg = spec.tone === "delayed" ? C.delayedText : C.forest;

  const brand = m.logoUrl
    ? `<img src="${esc(m.logoUrl)}" width="160" alt="Natural State Peptides" style="display:block;margin:0 auto;width:160px;max-width:160px;height:auto;border:0;">`
    : `<div style="font-family:${SERIF};font-size:20px;line-height:26px;letter-spacing:0.5px;color:${C.forest};">Natural State Peptides</div>`;

  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(spec.subject(m.requestRef))}</title>
<style>
  @media (max-width:620px){
    .wrap{width:100% !important;}
    .pad{padding-left:20px !important;padding-right:20px !important;}
    .hero{font-size:26px !important;line-height:32px !important;}
    .total{font-size:28px !important;line-height:34px !important;}
  }
  @media (prefers-color-scheme:dark){
    .bg{background-color:#111311 !important;}
    .card,.panel{background-color:#191C19 !important;border-color:#30342F !important;}
    .t1{color:#F3F1EB !important;}
    .t2{color:#B5B4AD !important;}
    .brandmark{color:#A9C4B3 !important;}
    .badge{background-color:#26372E !important;color:#A9C4B3 !important;}
    .note{background-color:#22261F !important;border-left-color:#4A5147 !important;}
    .rule{border-color:#30342F !important;}
  }
</style>
</head>
<body class="bg" style="margin:0;padding:0;background-color:${C.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" class="bg" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.page};">
<tr><td align="center" style="padding:40px 12px;">

<table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

  <!-- Header -->
  <tr><td align="center" class="pad" style="padding:0 32px;">
    <div class="brandmark">${brand}</div>
    <div style="height:8px;line-height:8px;font-size:0;">&nbsp;</div>
    <div class="t2" style="font-family:${SERIF};font-style:italic;font-size:14px;line-height:20px;color:${C.muted};">Keep It Natural.</div>
  </td></tr>
  ${gap(40)}

  <!-- Status -->
  <tr><td align="center" class="pad" style="padding:0 32px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td class="badge" style="background-color:${badgeBg};border-radius:999px;padding:8px 16px;font-family:${SANS};font-size:11px;line-height:16px;letter-spacing:1.2px;text-transform:uppercase;color:${badgeFg};">${esc(spec.badge)}</td>
    </tr></table>
  </td></tr>
  ${gap(24)}

  <!-- Headline -->
  <tr><td align="center" class="pad" style="padding:0 32px;">
    <div class="t1 hero" style="font-family:${SERIF};font-size:30px;line-height:38px;color:${C.text};">${head}</div>
    <div style="height:16px;line-height:16px;font-size:0;">&nbsp;</div>
    <div class="t2" style="font-family:${SANS};font-size:16px;line-height:24px;color:${C.muted};">${sub}</div>
    <div style="height:24px;line-height:24px;font-size:0;">&nbsp;</div>
    <div class="t2" style="font-family:${SANS};font-size:11px;line-height:16px;letter-spacing:1.2px;text-transform:uppercase;color:${C.muted};">Request #${esc(m.requestRef)}</div>
  </td></tr>
  ${gap(40)}

  ${section("Order summary", orderSummary(m))}
  ${section(m.fulfilment === "delivery" ? "Delivery" : "Pickup", fulfilmentBlock(m))}
  ${
    m.note
      ? `<tr><td class="pad" style="padding:0 32px;">
           <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="note"
             style="background-color:${C.note};border-left:3px solid ${C.noteRule};border-radius:0 12px 12px 0;">
             <tr><td style="padding:24px;">
               <div class="t2" style="font-family:${SANS};font-size:11px;line-height:16px;letter-spacing:1.2px;text-transform:uppercase;color:${C.muted};">Customer note</div>
               <div style="height:8px;line-height:8px;font-size:0;">&nbsp;</div>
               <div class="t1" style="font-family:${SANS};font-size:16px;line-height:24px;color:${C.text};">${esc(m.note)}</div>
             </td></tr>
           </table>
         </td></tr>${gap(24)}`
      : ""
  }
  ${section(
    "Payment",
    `<div class="t2" style="font-family:${SANS};font-size:14px;line-height:22px;color:${C.muted};">Payment method on file</div>
     <div style="height:8px;line-height:8px;font-size:0;">&nbsp;</div>
     ${value(esc(m.paymentLabel))}
     <div style="height:16px;line-height:16px;font-size:0;">&nbsp;</div>
     ${quiet(
       m.stage === "confirmed"
         ? "Follow the payment instructions provided with this confirmation."
         : "Payment instructions will be provided after your request has been confirmed. Nothing has been charged.",
     )}`,
  )}
  ${section(m.stage === "confirmed" ? "Status" : "What happens next", nextStep(m))}

  <!-- Reply to change -->
  <tr><td align="center" class="pad" style="padding:0 32px;">
    <div class="t1" style="font-family:${SANS};font-size:16px;line-height:24px;color:${C.text};">Need to make a change?</div>
    <div class="t2" style="font-family:${SANS};font-size:16px;line-height:24px;color:${C.muted};">Reply directly to this email.</div>
  </td></tr>
  ${gap(40)}

  <!-- Footer -->
  <tr><td align="center" class="pad" style="padding:0 32px;">
    <div class="rule" style="border-top:1px solid ${C.border};font-size:0;line-height:0;">&nbsp;</div>
    <div style="height:24px;line-height:24px;font-size:0;">&nbsp;</div>
    <div class="brandmark" style="font-family:${SERIF};font-size:16px;line-height:22px;color:${C.forest};">Natural State Peptides</div>
    <div class="t2" style="font-family:${SERIF};font-style:italic;font-size:13px;line-height:20px;color:${C.muted};">Keep It Natural.</div>
    <div style="height:16px;line-height:16px;font-size:0;">&nbsp;</div>
    <div class="t2" style="font-family:${SANS};font-size:11px;line-height:16px;letter-spacing:1.2px;text-transform:uppercase;color:${C.muted};">Request #${esc(m.requestRef)}</div>
    <div style="height:24px;line-height:24px;font-size:0;">&nbsp;</div>
    <div class="t2" style="font-family:${SANS};font-size:10px;line-height:16px;color:${C.muted};">${esc(m.complianceLine)}</div>
  </td></tr>
  ${gap(40)}

</table>
</td></tr>
</table>
</body></html>`;

  /* Written, not stripped from the HTML. */
  const L: string[] = [];
  L.push("NATURAL STATE PEPTIDES");
  L.push("Keep It Natural.");
  L.push("");
  L.push(spec.badge.replace("✓ ", ""));
  L.push("");
  L.push(head);
  L.push(sub);
  L.push("");
  L.push(`REQUEST #${m.requestRef}`);
  L.push("");
  L.push("ORDER SUMMARY");
  for (const i of m.items) {
    L.push(`  ${i.name}`);
    L.push(`  Quantity: ${i.quantity}${i.cents == null ? "  (to quote)" : "  " + usd(i.cents)}`);
  }
  if (m.fulfilment === "delivery")
    L.push(`  Local delivery  ${m.deliveryFeeCents > 0 ? usd(m.deliveryFeeCents) : "Free"}`);
  L.push("");
  L.push(
    m.totalCents == null
      ? "  TOTAL: we'll confirm this with you"
      : `  ${m.estimated ? "ESTIMATED TOTAL" : "TOTAL"}: ${usd(m.totalCents)}`,
  );
  L.push("");
  if (m.fulfilment === "delivery") {
    L.push("DELIVERY");
    L.push("  Local Delivery — Hot Springs area");
    L.push("  Within 24 hours of confirmation");
    L.push(`  Within ${m.deliveryRadiusMiles} miles of ${m.deliveryOrigin}. ${usd(m.deliveryFeeCents)} flat fee, included above.`);
  } else {
    L.push("PICKUP");
    L.push("  Local Pickup — Hot Springs area");
    if (m.windows) L.push(`  Preferred pickup window: ${m.windows}`);
  }
  L.push("");
  if (m.note) {
    L.push("CUSTOMER NOTE");
    L.push(`  ${m.note}`);
    L.push("");
  }
  L.push("PAYMENT");
  L.push("  Payment method on file");
  L.push(`  ${m.paymentLabel}`);
  L.push(
    m.stage === "confirmed"
      ? "  Follow the payment instructions provided with this confirmation."
      : "  Payment instructions will be provided after your request has been confirmed. Nothing has been charged.",
  );
  L.push("");
  L.push(m.stage === "confirmed" ? "STATUS" : "WHAT HAPPENS NEXT");
  L.push(
    m.stage === "confirmed"
      ? `  Confirmed -> ${m.fulfilment === "delivery" ? "Out for delivery" : "Ready for pickup"}`
      : "  Review -> Confirmation -> Fulfillment",
  );
  L.push("");
  L.push("Need to make a change? Reply directly to this email.");
  L.push("");
  L.push("Natural State Peptides — Keep It Natural.");
  L.push(`Request #${m.requestRef}`);
  L.push("");
  L.push(m.complianceLine);

  return { subject: spec.subject(m.requestRef), preheader, html, text: L.join("\n") };
}
