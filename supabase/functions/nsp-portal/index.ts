import { createClient } from "npm:@supabase/supabase-js@2";
const env = (name: string) => Deno.env.get(name) ?? "";
const service = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});
const origins = env("ALLOWED_ORIGINS")
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);
const reply = (body: unknown, status: number, origin: string) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
      Vary: "Origin",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
const KINDS = ["product", "coa", "application", "availability", "order"];
const PAYMENT = ["cash", "cashapp", "venmo", "crypto", "other"];
const PAYMENT_LABEL: Record<string, string> = {
  cash: "Cash",
  cashapp: "Cash App",
  venmo: "Venmo",
  crypto: "Crypto",
  other: "Other",
};
const FULFIL_LABEL: Record<string, string> = {
  pickup: "Local pickup",
  delivery: "Local delivery",
  ship: "Ship",
};
// Two-hour handover windows, keyed by start-end hour in 24h local time.
const WINDOWS = ["07-09", "09-11", "11-13", "13-15", "15-17", "17-19", "19-21", "21-23"];
const WINDOW_LABEL: Record<string, string> = {
  "07-09": "7-9am",
  "09-11": "9-11am",
  "11-13": "11am-1pm",
  "13-15": "1-3pm",
  "15-17": "3-5pm",
  "17-19": "5-7pm",
  "19-21": "7-9pm",
  "21-23": "9-11pm",
};
/** "9-11am and 5-7pm" — the customer's chosen windows, read as a person would say them. */
const windowText = (v: unknown): string | null => {
  const picked = Array.isArray(v) ? v.filter((w): w is string => WINDOWS.includes(String(w))) : [];
  if (picked.length === 0) return null;
  const labels = [...picked].sort().map((w) => WINDOW_LABEL[w]);
  return labels.length === 1 ? labels[0] : labels.slice(0, -1).join(", ") + " or " + labels[labels.length - 1];
};
const str = (v: unknown, max: number) => v == null || (typeof v === "string" && v.length <= max);
const visitorOk = (v: unknown) => v == null || (typeof v === "string" && /^[A-Za-z0-9-]{8,64}$/.test(v));

// Visitor IP from the hosting gateway, hashed before it is used or stored.
async function ipHash(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? req.headers.get("cf-connecting-ip") ?? "unknown")
    .split(",")[0]
    .trim();
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(env("RATE_LIMIT_SALT") + ip));
  return Array.from(new Uint8Array(bytes))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

const RESEARCH_NOTICE =
  "All products are supplied for laboratory research use only. They are not drugs, supplements or " +
  "cosmetics, and are not supplied for human or animal use. No dosing or administration guidance is provided.";

const dollars = (c: number) => "$" + (c / 100).toLocaleString("en-US", { maximumFractionDigits: 2 });

/**
 * Customer-facing order email. `mode` is "receipt" — sent the moment an order
 * request arrives — or "confirmation", sent once an owner accepts it.
 *
 * Tracked in its own columns rather than reusing email_status, so that failing
 * to reach the customer is never mistaken for failing to reach us. Returns the
 * outcome rather than throwing: a customer email that doesn't send must never
 * take down the request itself.
 */
async function customerMail(id: string, mode: "receipt" | "confirmation") {
  const statusCol = mode === "receipt" ? "receipt_status" : "confirmation_status";
  const idCol = mode === "receipt" ? "receipt_id" : "confirmation_id";

  const { data: r, error } = await service.from("nsp_requests").select("*").eq("id", id).single();
  if (error || !r) return "failed";
  // Only order requests get customer mail; a COA question doesn't need a receipt.
  if (r.kind !== "order" || !r.email) return "skipped";
  if (r[statusCol] === "accepted") return "accepted";

  const mark = async (status: string, ref?: string) => {
    const patch: Record<string, unknown> = { [statusCol]: status };
    if (ref) patch[idCol] = ref;
    if (mode === "confirmation" && status === "accepted") patch.confirmation_sent_at = new Date().toISOString();
    await service.from("nsp_requests").update(patch).eq("id", id);
  };

  if (!env("RESEND_API_KEY") || !env("EMAIL_FROM")) {
    await mark("not_configured");
    return "not_configured";
  }

  // Once accepted there is a real order with confirmed figures — prefer those
  // over the browser's estimates, so the customer sees what they actually owe.
  let reference = id.slice(0, 8).toUpperCase();
  let lines: { name: string; quantity: number; cents: number | null }[] = [];
  let total: number | null = null;
  let estimated = true;

  if (mode === "confirmation" && r.order_id) {
    const { data: o } = await service.from("nsp_orders").select("*").eq("id", r.order_id).single();
    const { data: items } = await service
      .from("nsp_order_items")
      .select("product_name, quantity, line_cents")
      .eq("order_id", r.order_id);
    if (o) {
      reference = o.public_id ?? reference;
      total = o.product_paid_cents ?? null;
      estimated = false;
      lines = (items ?? []).map((i) => ({
        name: i.product_name,
        quantity: i.quantity,
        cents: i.line_cents ?? null,
      }));
    }
  }
  if (lines.length === 0) {
    const raw: { name: string; quantity: number; est_cents?: number | null }[] = Array.isArray(r.order_items)
      ? r.order_items
      : [];
    lines = raw.map((i) => ({ name: i.name, quantity: i.quantity, cents: i.est_cents ?? null }));
    const priced = lines.filter((l) => typeof l.cents === "number");
    total = priced.length === lines.length && lines.length > 0 ? priced.reduce((a, l) => a + (l.cents as number), 0) : null;
  }

  const itemText = lines
    .map((l) => "  " + l.quantity + " x " + l.name + (typeof l.cents === "number" ? " - " + dollars(l.cents) : ""))
    .join("\n");
  const totalText =
    total == null
      ? "  Total: we'll confirm this with you"
      : "  Total: " + dollars(total) + (estimated ? " (estimated)" : "");
  const first = (r.first_name ?? r.name ?? "").split(/\s+/)[0] || "there";
  const fulfil = FULFIL_LABEL[r.fulfillment_method] ?? "Local pickup";
  const pay = PAYMENT_LABEL[r.payment_method] ?? "";
  const handover = r.fulfillment_method === "delivery" ? "delivery" : "pickup";
  const when = windowText(r.preferred_windows);
  const note = typeof r.availability_note === "string" && r.availability_note.trim() ? r.availability_note.trim() : null;
  // Deliveries are settled before we set out; pickup is paid at the handover.
  const prepay = r.fulfillment_method === "delivery";

  const subject =
    mode === "receipt"
      ? "We've got your request - Natural State Peptides"
      : "Your order is confirmed - Natural State Peptides";

  const body =
    mode === "receipt"
      ? [
          "Hi " + first + ",",
          "",
          "Thanks - your request reached us and we're looking at it now. Nothing has been charged, and",
          "nothing is sent automatically. We'll come back to you to confirm before anything happens.",
          "",
          "What you asked for",
          itemText,
          totalText,
          "",
          "  Collection: " + fulfil + " in the Hot Springs, Arkansas area",
          when ? "  Times that suit you: " + when : "",
          note ? "  You added: " + note : "",
          pay ? "  Payment: " + pay + ", arranged directly with us" : "",
          prepay ? "  Note: local deliveries are paid before we set out." : "",
          "  Reference: " + reference,
          "",
          "Just reply to this email if you need to change anything.",
          "",
          "- Natural State Peptides",
          "",
          RESEARCH_NOTICE,
        ]
      : [
          "Hi " + first + ",",
          "",
          "Good news - your order has been accepted and is in process.",
          "",
          "  Order " + reference,
          itemText,
          totalText,
          "",
          "  Collection: " + fulfil + " in the Hot Springs, Arkansas area",
          when ? "  Times that suit you: " + when : "",
          note ? "  You added: " + note : "",
          pay ? "  Payment: " + pay + ", arranged directly with us" : "",
          "",
          prepay
            ? "Local deliveries are paid before we set out, so we'll send payment details first and " +
              "book the drop once that clears."
            : "",
          "We'll be in touch shortly to arrange " + handover +
            (when ? ", aiming for " + when + "." : ".") +
            " Reply to this email with any questions.",
          "",
          "- Natural State Peptides",
          "",
          RESEARCH_NOTICE,
        ];

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + env("RESEND_API_KEY"),
        "Content-Type": "application/json",
        // Keyed per request and per mode, so a retry can never double-send.
        "Idempotency-Key": "nsp-" + mode + "-" + id,
      },
      body: JSON.stringify({
        from: env("EMAIL_FROM"),
        to: [r.email],
        ...(env("INQUIRY_TO") ? { reply_to: env("INQUIRY_TO") } : {}),
        subject,
        text: body.filter((l) => l !== "").join("\n").replace(/\n{3,}/g, "\n\n"),
      }),
    });
    if (!res.ok) throw new Error("Provider rejected the message");
    const data = await res.json();
    await mark("accepted", data.id);
    return "accepted";
  } catch {
    await mark("failed");
    return "failed";
  }
}

async function sendNotice(id: string) {
  const { data: r, error } = await service.from("nsp_requests").select("*").eq("id", id).single();
  if (error || !r) throw new Error("Request could not be loaded");
  if (r.email_status === "accepted") return "accepted";
  if (!env("RESEND_API_KEY") || !env("INQUIRY_TO") || !env("EMAIL_FROM")) {
    await service.from("nsp_requests").update({ email_status: "not_configured" }).eq("id", id);
    return "not_configured";
  }
  // Estimates come from the published price list via the browser; the owner
  // confirms the real total, so they are labelled as estimates only.
  const lines: { name: string; quantity: number; est_cents?: number | null }[] = Array.isArray(r.order_items)
    ? r.order_items
    : [];
  const dollars = (c: number) => "$" + (c / 100).toLocaleString("en-US", { maximumFractionDigits: 2 });
  const items = lines
    .map(
      (i) =>
        "  " + i.quantity + " × " + i.name +
        (typeof i.est_cents === "number" ? " — est. " + dollars(i.est_cents) : "est_cents" in i ? " — quote needed" : ""),
    )
    .join("\n");
  const estTotal = lines.reduce((a, i) => a + (typeof i.est_cents === "number" ? i.est_cents : 0), 0);
  const allPriced = lines.length > 0 && lines.every((i) => typeof i.est_cents === "number");
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + env("RESEND_API_KEY"),
        "Content-Type": "application/json",
        "Idempotency-Key": "nsp-request-" + id,
      },
      body: JSON.stringify({
        from: env("EMAIL_FROM"),
        to: [env("INQUIRY_TO")],
        reply_to: r.email,
        subject: "Natural State: " + (r.kind === "order" ? "ORDER REQUEST" : r.kind + " request") + " from " + r.name,
        text: [
          "Request: " + id,
          "Name: " + r.name,
          "Reply: " + r.email,
          "Phone: " + (r.phone ?? ""),
          r.kind === "order" ? "Order:\n" + items : "Product: " + (r.product ?? ""),
          r.kind === "order" && estTotal > 0
            ? "Estimated total: " + dollars(estTotal) + (allPriced ? "" : " + items to quote")
            : "",
          r.kind === "order"
            ? "Payment: " + (PAYMENT_LABEL[r.payment_method] ?? "") + (r.payment_other ? " (" + r.payment_other + ")" : "")
            : "",
          r.kind === "order" ? "Fulfilment: " + (FULFIL_LABEL[r.fulfillment_method] ?? "") : "",
          r.kind === "order" && windowText(r.preferred_windows)
            ? "Best time: " + windowText(r.preferred_windows)
            : "",
          r.kind === "order" && r.availability_note ? "They added: " + r.availability_note : "",
          r.kind === "order" && r.fulfillment_method === "delivery" ? "** DELIVERY - COLLECT PAYMENT UP FRONT **" : "",
          "Lot: " + (r.lot ?? ""),
          "Referral: " + (r.referral_code ?? ""),
          "",
          r.message,
        ]
          .filter(Boolean)
          .join("\n"),
      }),
    });
    if (!res.ok) throw new Error("Notification provider rejected request");
    const data = await res.json();
    const { error: saveError } = await service
      .from("nsp_requests")
      .update({ email_status: "accepted", email_id: data.id })
      .eq("id", id);
    if (saveError) throw saveError;
    return "accepted";
  } catch {
    await service.from("nsp_requests").update({ email_status: "failed" }).eq("id", id);
    return "failed";
  }
}

function validSubmission(b: Record<string, unknown>) {
  const first = typeof b.first_name === "string" ? b.first_name.trim() : "";
  const legacyName = typeof b.name === "string" ? b.name.trim() : "";
  if (!b || !/^[0-9a-f-]{36}$/i.test(String(b.id ?? ""))) return false;
  if (!KINDS.includes(String(b.kind))) return false;
  if (!(first || legacyName) || first.length > 60 || legacyName.length > 100) return false;
  if (!str(b.last_name, 60)) return false;
  if (typeof b.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email) || b.email.length > 254) return false;
  if (!str(b.phone, 40) || !str(b.city, 80) || !str(b.state, 40)) return false;
  if (typeof b.message !== "string" || !b.message.trim() || b.message.length > 3000) return false;
  if (!str(b.product, 150) || !str(b.lot, 100)) return false;
  if (b.referral_code != null && (typeof b.referral_code !== "string" || !/^[A-Z0-9_-]{0,32}$/i.test(b.referral_code)))
    return false;
  if (!visitorOk(b.visitor_id)) return false;
  if (b.website) return false; // honeypot
  if (b.kind === "order") {
    const items = b.order_items;
    if (!Array.isArray(items) || items.length < 1 || items.length > 20) return false;
    for (const i of items as Record<string, unknown>[]) {
      if (typeof i.name !== "string" || !i.name.trim() || i.name.length > 150) return false;
      if (!Number.isInteger(i.quantity) || (i.quantity as number) < 1 || (i.quantity as number) > 100) return false;
      if (i.slug != null && (typeof i.slug !== "string" || !/^[a-z0-9-]{1,80}$/.test(i.slug))) return false;
      if (i.est_cents != null && (!Number.isInteger(i.est_cents) || (i.est_cents as number) < 0 || (i.est_cents as number) > 10_000_000))
        return false;
    }
    if (!PAYMENT.includes(String(b.payment_method))) return false;
    if (!str(b.payment_other, 100)) return false;
    // The public form offers pickup and local delivery; "ship" is still accepted
    // from pages cached before shipping was paused.
    if (!["pickup", "delivery", "ship"].includes(String(b.fulfillment_method))) return false;
    // Optional, so pages cached before this field existed still submit cleanly.
    if (b.preferred_windows != null) {
      if (!Array.isArray(b.preferred_windows) || b.preferred_windows.length > 8) return false;
      if (b.preferred_windows.some((w) => !WINDOWS.includes(String(w)))) return false;
    }
    if (!str(b.availability_note, 400)) return false;
    // Deliveries are paid before we set out, so a cash handover can't apply to one.
    if (b.fulfillment_method === "delivery" && b.payment_method === "cash") return false;
    if (b.research_ack !== true) return false;
    if (typeof b.phone !== "string" || b.phone.replace(/\D/g, "").length < 7) return false;
  }
  return true;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  if (!origin || !origins.includes(origin)) return reply({ error: "Origin not allowed" }, 403, "");
  if (req.method === "OPTIONS") return reply({}, 200, origin);
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405, origin);
  try {
    const raw = await req.text();
    if (raw.length > 16000) return reply({ error: "Request too large" }, 413, origin);
    const body = JSON.parse(raw);

    // ---- Public: inquiry / order request -------------------------------
    if (body.action === "submit") {
      const b = body.request;
      if (!validSubmission(b)) return reply({ error: "Please check the form fields." }, 400, origin);
      const { data: id, error } = await service.rpc("nsp_submit", { p_body: b, p_key: await ipHash(req) });
      if (error)
        return reply(
          {
            error: error.message.includes("Too many")
              ? "Too many requests. Please try later."
              : "We could not save your request. Please try again.",
          },
          400,
          origin,
        );
      const notification = await sendNotice(id);
      // Instant acknowledgement to the customer. Never allowed to fail the
      // submission — the request is already saved by this point.
      const receipt = await customerMail(id, "receipt");
      return reply({ id, notification, receipt }, 200, origin);
    }

    // ---- Public: referral link visit -----------------------------------
    if (body.action === "track") {
      const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
      if (!/^[A-Z0-9_-]{3,32}$/.test(code) || !visitorOk(body.visitor_id)) return reply({ valid: false }, 200, origin);
      const landing = typeof body.landing === "string" ? body.landing.slice(0, 300) : null;
      let referrer: string | null = null;
      try {
        referrer = typeof body.referrer === "string" && body.referrer ? new URL(body.referrer).host : null;
      } catch {
        referrer = null;
      }
      const { data, error } = await service.rpc("nsp_track_click", {
        p_code: code,
        p_visitor: body.visitor_id ?? null,
        p_landing: landing,
        p_referrer: referrer,
        p_ip_hash: await ipHash(req),
        p_source: body.source === "param" ? "param" : "link",
      });
      if (error) return reply({ valid: false }, 200, origin);
      return reply(data, 200, origin);
    }

    // ---- Public: is this referral code valid? (no click recorded) ------
    if (body.action === "check_code") {
      const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
      if (!/^[A-Z0-9_-]{3,32}$/.test(code)) return reply({ valid: false }, 200, origin);
      const { data } = await service.rpc("nsp_resolve_code", { p_code: code });
      return reply({ valid: Boolean(data) }, 200, origin);
    }

    // ---- Owner-only actions --------------------------------------------
    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer /i, "");
    const {
      data: { user },
      error: authError,
    } = await service.auth.getUser(token);
    if (authError || !user) return reply({ error: "Sign in required" }, 401, origin);
    const { data: roles } = await service
      .from("nsp_user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["owner", "admin"]);
    if (!roles || roles.length === 0) return reply({ error: "Owner access required" }, 403, origin);

    if (body.action === "retry_notice")
      return reply({ notification: await sendNotice(body.id) }, 200, origin);

    // Tell the customer their order is accepted and in process. Sent
    // automatically when a sale is recorded from a request, and available as a
    // resend from the Control Center if it ever fails.
    if (body.action === "confirm_order") {
      if (!/^[0-9a-f-]{36}$/i.test(String(body.id ?? "")))
        return reply({ error: "A request id is required" }, 400, origin);
      return reply({ confirmation: await customerMail(body.id, "confirmation") }, 200, origin);
    }

    // Prepare ambassador account access. mode "link" returns a one-time
    // sign-in link for the owner to text (works without any email setup);
    // mode "email" asks Supabase to send the email (needs custom SMTP).
    if (body.action === "invite") {
      const { data: p, error } = await service.from("nsp_partners").select("*").eq("id", body.id).single();
      if (error || !p || p.status === "archived")
        return reply({ error: "Eligible ambassador record required" }, 400, origin);
      const appUrl = env("APP_URL");
      if (!appUrl.startsWith("https://"))
        return reply({ error: "Public APP_URL must be configured" }, 400, origin);
      const redirectTo = appUrl + "/ambassador/reset";
      const mode = body.mode === "email" ? "email" : "link";

      let userId: string | null = p.user_id ?? null;
      let link: string | null = null;
      if (mode === "link") {
        if (!userId) {
          const invited = await service.auth.admin.generateLink({ type: "invite", email: p.email, options: { redirectTo } });
          if (!invited.error && invited.data?.user) {
            userId = invited.data.user.id;
            link = invited.data.properties?.action_link ?? null;
          }
        }
        if (!link) {
          const rec = await service.auth.admin.generateLink({ type: "recovery", email: p.email, options: { redirectTo } });
          if (rec.error || !rec.data?.user)
            return reply({ error: "Could not prepare a sign-in link for this email." }, 400, origin);
          userId = rec.data.user.id;
          link = rec.data.properties?.action_link ?? null;
        }
      } else {
        if (!userId) {
          const inv = await service.auth.admin.inviteUserByEmail(p.email, { redirectTo });
          if (inv.error || !inv.data?.user)
            return reply(
              { error: "Invitation email could not be sent. Use the copy-link option instead." },
              400,
              origin,
            );
          userId = inv.data.user.id;
        } else {
          const rs = await service.auth.resetPasswordForEmail(p.email, { redirectTo });
          if (rs.error)
            return reply({ error: "Email could not be sent. Use the copy-link option instead." }, 400, origin);
        }
      }
      if (userId && userId !== p.user_id) {
        const { error: linkError } = await service.rpc("nsp_link_ambassador_user", {
          p_partner: p.id,
          p_user: userId,
          p_actor: user.id,
        });
        if (linkError) return reply({ error: linkError.message }, 400, origin);
      } else {
        await service.from("nsp_audit").insert({
          actor: user.id,
          action: mode === "link" ? "ambassador_link_prepared" : "ambassador_email_sent",
          detail: {},
          entity: "ambassador",
          entity_id: p.id,
        });
      }
      return reply({ ok: true, mode, link }, 200, origin);
    }
    return reply({ error: "Unknown action" }, 400, origin);
  } catch {
    return reply({ error: "Request could not be completed. Please try again." }, 500, origin);
  }
});
