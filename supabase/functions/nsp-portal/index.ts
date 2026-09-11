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
async function sendNotice(id: string) {
  const { data: r, error } = await service.from("nsp_requests").select("*").eq("id", id).single();
  if (error || !r) throw new Error("Request could not be loaded");
  if (r.email_status === "accepted") return "accepted";
  if (!env("RESEND_API_KEY") || !env("INQUIRY_TO") || !env("EMAIL_FROM")) {
    await service.from("nsp_requests").update({ email_status: "not_configured" }).eq("id", id);
    return "not_configured";
  }
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
        subject: "Natural State: " + r.kind + " request",
        text: [
          "Request: " + id,
          "Name: " + r.name,
          "Reply: " + r.email,
          "Product: " + (r.product ?? ""),
          "Lot: " + (r.lot ?? ""),
          "Referral: " + (r.referral_code ?? ""),
          "",
          r.message,
        ].join("\n"),
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
Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  if (!origin || !origins.includes(origin)) return reply({ error: "Origin not allowed" }, 403, "");
  if (req.method === "OPTIONS") return reply({}, 200, origin);
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405, origin);
  try {
    const raw = await req.text();
    if (raw.length > 16000) return reply({ error: "Request too large" }, 413, origin);
    const body = JSON.parse(raw);
    if (body.action === "submit") {
      const b = body.request;
      if (
        !b ||
        !/^[0-9a-f-]{36}$/i.test(b.id ?? "") ||
        !["product", "coa", "application", "availability"].includes(b.kind) ||
        typeof b.name !== "string" ||
        !b.name.trim() ||
        b.name.length > 100 ||
        typeof b.email !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email) ||
        b.email.length > 254 ||
        typeof b.message !== "string" ||
        !b.message.trim() ||
        b.message.length > 3000 ||
        (b.product != null && (typeof b.product !== "string" || b.product.length > 150)) ||
        (b.lot != null && (typeof b.lot !== "string" || b.lot.length > 100)) ||
        (b.referral_code != null &&
          (typeof b.referral_code !== "string" || !/^[A-Z0-9_-]{0,32}$/i.test(b.referral_code))) ||
        b.website
      )
        return reply({ error: "Please check the form fields." }, 400, origin);
      // IP supplied by the hosting gateway, hashed before persistence. Never store raw IP.
      const ip = (
        req.headers.get("x-forwarded-for") ??
        req.headers.get("cf-connecting-ip") ??
        "unknown"
      )
        .split(",")[0]
        .trim();
      const bytes = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(env("RATE_LIMIT_SALT") + ip),
      );
      const key = Array.from(new Uint8Array(bytes))
        .map((x) => x.toString(16).padStart(2, "0"))
        .join("");
      const { data: id, error } = await service.rpc("nsp_submit", { p_body: b, p_key: key });
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
      return reply({ id, notification }, 200, origin);
    }
    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer /i, "");
    const {
      data: { user },
      error: authError,
    } = await service.auth.getUser(token);
    if (authError || !user) return reply({ error: "Sign in required" }, 401, origin);
    const { data: admin } = await service
      .from("nsp_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!admin) return reply({ error: "Owner access required" }, 403, origin);
    if (body.action === "retry_notice")
      return reply({ notification: await sendNotice(body.id) }, 200, origin);
    if (body.action === "invite") {
      const { data: p, error } = await service
        .from("nsp_partners")
        .select("*")
        .eq("id", body.id)
        .single();
      if (error || !p || p.status === "suspended")
        return reply({ error: "Eligible ambassador record required" }, 400, origin);
      if (p.user_id)
        return reply(
          { error: "Account already linked. Use password reset for existing accounts." },
          400,
          origin,
        );
      const appUrl = env("APP_URL");
      if (!appUrl.startsWith("https://"))
        return reply({ error: "Public APP_URL must be configured" }, 400, origin);
      const { data, error: inviteError } = await service.auth.admin.inviteUserByEmail(p.email, {
        redirectTo: appUrl + "/ambassador/reset",
      });
      if (inviteError || !data.user)
        return reply(
          {
            error:
              "Invitation could not be sent. Check Auth email settings and whether this email already has an account.",
          },
          400,
          origin,
        );
      const { error: linkError } = await service
        .from("nsp_partners")
        .update({ user_id: data.user.id, status: "active" })
        .eq("id", p.id)
        .is("user_id", null);
      if (linkError)
        return reply(
          {
            error:
              "Invitation sent but account linking failed. Owner must repair the ambassador user_id in the database before access.",
          },
          500,
          origin,
        );
      await service
        .from("nsp_audit")
        .insert({ actor: user.id, action: "invite_partner", detail: { partner: p.id } });
      return reply({ ok: true }, 200, origin);
    }
    return reply({ error: "Unknown action" }, 400, origin);
  } catch {
    return reply({ error: "Request could not be completed. Please try again." }, 500, origin);
  }
});
