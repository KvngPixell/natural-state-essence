import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Download, Plus } from "lucide-react";
import { rpc, edge, money, fmtDate, fmtDateTime, fmtMonth, button, outline, field, errorText, publicSite, todayISO } from "@/lib/backend";
import { useOwner } from "@/components/owner/owner-context";
import type { Ambassador, AmbassadorStatus } from "@/lib/program-types";
import { Empty, Modal, Notice, Pill, TableWrap, td, th } from "@/components/program-ui";
import { actionLabel } from "@/components/owner/overview";

export const STATUSES: AmbassadorStatus[] = ["pending", "active", "suspended", "inactive", "archived"];
export const referralUrl = (path: string) =>
  (publicSite || (typeof window !== "undefined" ? window.location.origin : "")) + path;

export function Ambassadors() {
  const { version, focus, setFocus } = useOwner();
  const [rows, setRows] = useState<Ambassador[] | null>(null);
  const [q, setQ] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (focus?.tab === "ambassadors") {
      setOpenId(focus.id);
      setFocus(null);
    }
  }, [focus, setFocus]);
  useEffect(() => {
    rpc("nsp_owner_ambassadors", { p_month: null })
      .then((r) => setRows(r as Ambassador[]))
      .catch((e) => setError(errorText(e)));
  }, [version]);

  const needle = q.trim().toLowerCase();
  const visible = (rows ?? []).filter(
    (a) =>
      (showArchived || a.status !== "archived") &&
      (!needle || [a.display_name, a.email, a.code, a.public_id, a.phone ?? ""].some((s) => s.toLowerCase().includes(needle))),
  );

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button className={button} onClick={() => setAdding(true)}>
          <Plus className="size-4" /> Add ambassador
        </button>
        <input className={field + " max-w-xs"} placeholder="Search name, email, code" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Show archived
        </label>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {!rows ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : visible.length === 0 ? (
        <Empty>{rows.length ? "No ambassadors match." : "No ambassadors yet. Add one, or approve an application."}</Empty>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <th className={th}>Ambassador</th>
              <th className={th}>Status</th>
              <th className={th}>Code</th>
              <th className={th}>Rank</th>
              <th className={th + " text-right"}>Monthly qualified</th>
              <th className={th + " text-right"}>New</th>
              <th className={th + " text-right"}>Returning</th>
              <th className={th + " text-right"}>Est. commission</th>
              <th className={th + " text-right"}>Customers</th>
              <th className={th + " text-right"}>Clicks</th>
              <th className={th}>Start</th>
              <th className={th}>Last active</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((a) => (
              <tr key={a.id} className="cursor-pointer hover:bg-secondary/40" onClick={() => setOpenId(a.id)}>
                <td className={td}>
                  <p className="font-medium text-primary">{a.display_name}</p>
                  <p className="text-xs text-muted-foreground">{a.public_id}{a.has_login ? "" : " · no login yet"}</p>
                </td>
                <td className={td}><Pill value={a.status} /></td>
                <td className={td + " font-mono text-xs"}>{a.code}</td>
                <td className={td + " whitespace-nowrap"}>{a.tier_name}</td>
                <td className={td + " text-right tabular-nums"}>{money(a.qualified_cents ?? 0)}</td>
                <td className={td + " text-right tabular-nums"}>{money(a.new_revenue_cents ?? 0)}</td>
                <td className={td + " text-right tabular-nums"}>{money(a.residual_revenue_cents ?? 0)}</td>
                <td className={td + " text-right tabular-nums"}>{money(a.commission_cents ?? 0)}</td>
                <td className={td + " text-right tabular-nums"}>{a.active_customers ?? 0} / {a.customers ?? 0}</td>
                <td className={td + " text-right tabular-nums"}>{a.clicks ?? 0}</td>
                <td className={td + " whitespace-nowrap"}>{fmtDate(a.start_date)}</td>
                <td className={td + " whitespace-nowrap text-xs"}>{a.last_activity_at ? fmtDateTime(a.last_activity_at) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      {adding && (
        <AmbassadorForm
          onClose={() => setAdding(false)}
          onSaved={(a) => {
            setAdding(false);
            setOpenId(a.id);
          }}
        />
      )}
      {openId && <AmbassadorDetail id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

interface FormState {
  first_name: string; last_name: string; email: string; phone: string; city: string; state: string;
  start_date: string; status: AmbassadorStatus; notes: string; code: string;
}

export function AmbassadorForm({
  ambassador,
  initial,
  applicationId,
  onClose,
  onSaved,
}: {
  ambassador?: Ambassador;
  initial?: Partial<FormState>;
  applicationId?: string;
  onClose: () => void;
  onSaved: (a: Ambassador) => void;
}) {
  const { refresh } = useOwner();
  const [f, setF] = useState<FormState>({
    first_name: ambassador?.first_name ?? initial?.first_name ?? "",
    last_name: ambassador?.last_name ?? initial?.last_name ?? "",
    email: ambassador?.email ?? initial?.email ?? "",
    phone: ambassador?.phone ?? initial?.phone ?? "",
    city: ambassador?.city ?? initial?.city ?? "",
    state: ambassador?.state ?? initial?.state ?? "",
    start_date: ambassador?.start_date ?? initial?.start_date ?? todayISO(),
    status: ambassador?.status ?? initial?.status ?? "active",
    notes: ambassador?.notes ?? initial?.notes ?? "",
    code: ambassador?.code ?? "",
  });
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof FormState) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function save() {
    setBusy(true);
    setError("");
    try {
      const payload = { ...f, code: f.code.trim() || null, id: ambassador?.id ?? null };
      const r = applicationId
        ? await rpc("nsp_approve_application", { p_request: applicationId, p: payload })
        : await rpc("nsp_save_ambassador", { p: payload, p_reason: reason || null });
      refresh();
      onSaved(r as Ambassador);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  const title = applicationId ? "Approve application" : ambassador ? "Edit ambassador" : "Add ambassador";
  return (
    <Modal open onClose={onClose} title={title}>
      <div className="grid gap-3 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">First name<input className={field} value={f.first_name} onChange={set("first_name")} /></label>
          <label className="grid gap-1">Last name<input className={field} value={f.last_name} onChange={set("last_name")} /></label>
          <label className="grid gap-1">Email<input className={field} type="email" value={f.email} onChange={set("email")} /></label>
          <label className="grid gap-1">Phone<input className={field} type="tel" value={f.phone} onChange={set("phone")} /></label>
          <label className="grid gap-1">City<input className={field} value={f.city} onChange={set("city")} /></label>
          <label className="grid gap-1">State<input className={field} value={f.state} onChange={set("state")} /></label>
          <label className="grid gap-1">Start date<input className={field} type="date" value={f.start_date} onChange={set("start_date")} /></label>
          <label className="grid gap-1">Status
            <select className={field} value={f.status} onChange={set("status")}>
              {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
            </select>
          </label>
          <label className="grid gap-1 sm:col-span-2">
            Referral code {ambassador ? "" : "(leave blank to generate one)"}
            <input className={field + " font-mono uppercase"} maxLength={32} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })} />
            {ambassador && f.code !== ambassador.code && (
              <span className="text-xs text-muted-foreground">The old code keeps working, so printed cards and QR codes aren't broken.</span>
            )}
          </label>
          <label className="grid gap-1 sm:col-span-2">Internal notes<textarea className={field} rows={2} value={f.notes} onChange={set("notes")} /></label>
          {ambassador && (
            <label className="grid gap-1 sm:col-span-2">Reason for change (optional, saved to audit log)
              <input className={field} value={reason} onChange={(e) => setReason(e.target.value)} />
            </label>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          The standard commission structure from Program Settings applies automatically. After saving, prepare their sign-in access
          from the ambassador's page.
        </p>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex gap-2">
          <button className={button} disabled={busy} onClick={save}>
            {busy ? "Saving…" : applicationId ? "Approve & create ambassador" : ambassador ? "Save" : "Create ambassador"}
          </button>
          <button className={outline} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </Modal>
  );
}

type Detail = Omit<Ambassador, "customers"> & {
  statements: { id: string; month: string; tier_name: string; qualified_cents: number; final_cents: number; paid_cents: number; status: string }[];
  customers: { id: string; public_id: string; name: string; status: string; first_purchase_on: string | null; residual_expires_on: string | null }[];
  orders: { id: string; public_id: string; paid_on: string | null; status: string; classification: string | null; qualified_cents: number; commission_cents: number; customer: string }[];
  history: { action: string; at: string; reason: string | null }[];
};

export function AmbassadorDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { version, refresh, recordSale, setFocus, go } = useOwner();
  const [a, setA] = useState<Detail | null>(null);
  const [qr, setQr] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [access, setAccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    rpc("nsp_owner_ambassador_detail", { p_id: id })
      .then((r) => setA(r as Detail))
      .catch((e) => setError(errorText(e)));
  }, [id, version]);
  const link = a ? referralUrl(a.referral_path) : "";
  useEffect(() => {
    if (!link) return;
    QRCode.toDataURL(link, { width: 640, margin: 2, color: { dark: "#123526", light: "#ffffff" } })
      .then((d: string) => setQr(d))
      .catch(() => setQr(""));
  }, [link]);

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      setStatus(`${what} copied.`);
    } catch {
      setStatus("Copy it from the box.");
    }
  }
  async function setAmbStatus(s: AmbassadorStatus) {
    const reason = s === "active" ? null : window.prompt(`Reason for marking ${a?.display_name} ${s}? (saved to the audit log)`) ?? undefined;
    if (reason === undefined) return;
    try {
      await rpc("nsp_set_ambassador_status", { p_id: id, p_status: s, p_reason: reason });
      refresh();
    } catch (e) {
      setError(errorText(e));
    }
  }
  async function prepareAccess(mode: "link" | "email") {
    setBusy(true);
    setError("");
    try {
      const r = (await edge({ action: "invite", id, mode })) as { link?: string | null };
      if (mode === "link") setAccess(r.link ?? null);
      else setStatus("Email sent (only works once custom email is configured in Supabase).");
      refresh();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={a?.display_name ?? "Ambassador"} description={a ? `${a.public_id} · ${a.email}` : undefined} wide>
      {error && <Notice tone="error">{error}</Notice>}
      {!a ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid gap-5 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Pill value={a.status} />
            {!a.has_login && <span className="text-xs text-destructive">No sign-in yet — prepare access below.</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={button} onClick={() => recordSale({ ambassadorId: a.id })}>Record sale</button>
            <button className={outline} onClick={() => setEditing(true)}>Edit</button>
            <button className={outline} onClick={() => copy(link, "Referral link")}><Copy className="size-4" /> Copy referral link</button>
            <button className={outline} onClick={() => { onClose(); go("commissions"); }}>View commissions</button>
            {a.status === "active" ? (
              <button className={outline} onClick={() => setAmbStatus("suspended")}>Suspend</button>
            ) : a.status !== "archived" ? (
              <button className={outline} onClick={() => setAmbStatus("active")}>Reactivate</button>
            ) : null}
            {a.status === "archived" ? (
              <button className={outline} onClick={() => setAmbStatus("inactive")}>Unarchive</button>
            ) : (
              <button className={outline} onClick={() => setAmbStatus("archived")}>Archive</button>
            )}
          </div>
          {status && <p className="text-primary" role="status">{status}</p>}

          <div className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-[1fr_auto]">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Referral link</p>
              <input readOnly className={field + " mt-1"} value={link} onFocus={(e) => e.target.select()} />
              <p className="mt-2">Code <span className="font-mono text-base text-primary">{a.code}</span></p>
              {qr && (
                <a href={qr} download={`natural-state-${a.code}.png`} className={outline + " mt-3"}>
                  <Download className="size-4" /> Download QR
                </a>
              )}
            </div>
            {qr && <img src={qr} alt={`QR code for ${link}`} width={140} height={140} className="rounded-lg border border-border bg-white p-1.5" />}
          </div>

          <div className="rounded-xl border border-border p-4">
            <p className="font-medium text-primary">Dashboard access</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {a.has_login
                ? "They have a sign-in. Create a new one-time link if they need to reset their password."
                : "Creates their account and a one-time link to set a password. Text or message it to them — it works without any email setup."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className={button} disabled={busy || a.status === "archived"} onClick={() => prepareAccess("link")}>
                {a.has_login ? "Create password-reset link" : "Create sign-in link"}
              </button>
              <button className={outline} disabled={busy || a.status === "archived"} onClick={() => prepareAccess("email")}>Send by email instead</button>
            </div>
            {access && (
              <div className="mt-3 grid gap-2">
                <input readOnly className={field + " text-xs"} value={access} onFocus={(e) => e.target.select()} />
                <div className="flex flex-wrap gap-2">
                  <button className={outline} onClick={() => copy(access, "Sign-in link")}><Copy className="size-4" /> Copy link</button>
                  {a.phone && (
                    <a className={outline} href={`sms:${a.phone.replace(/[^\d+]/g, "")}?&body=${encodeURIComponent("Your Natural State Ambassador access: " + access)}`}>Text it</a>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Single use and expires. Only share it with {a.first_name ?? "them"}.</p>
              </div>
            )}
          </div>

          <div>
            <h3 className="font-serif text-xl text-primary">Monthly statements</h3>
            {a.statements.length === 0 ? <Empty>No sales yet.</Empty> : (
              <ul className="mt-2 divide-y divide-border">
                {a.statements.map((s) => (
                  <li key={s.id} className="flex flex-wrap justify-between gap-2 py-2">
                    <span>{fmtMonth(s.month)} · {s.tier_name} · {money(s.qualified_cents)} qualified</span>
                    <span className="flex items-center gap-2">{money(s.final_cents)} <Pill value={s.status} /></span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="font-serif text-xl text-primary">Customers</h3>
            {a.customers.length === 0 ? <Empty>No attributed customers yet.</Empty> : (
              <ul className="mt-2 divide-y divide-border">
                {a.customers.map((c) => (
                  <li key={c.id} className="flex flex-wrap justify-between gap-2 py-2">
                    <button className="text-left text-primary underline" onClick={() => { onClose(); setFocus({ tab: "customers", id: c.id }); }}>{c.name}</button>
                    <span className="flex items-center gap-2 text-xs"><Pill value={c.status} /> since {fmtDate(c.first_purchase_on)} · to {fmtDate(c.residual_expires_on)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="font-serif text-xl text-primary">Sales</h3>
            {a.orders.length === 0 ? <Empty>No sales yet.</Empty> : (
              <ul className="mt-2 divide-y divide-border">
                {a.orders.slice(0, 30).map((o) => (
                  <li key={o.id} className="flex flex-wrap justify-between gap-2 py-2">
                    <button className="text-left underline" onClick={() => { onClose(); setFocus({ tab: "orders", id: o.id }); }}>
                      {fmtDate(o.paid_on)} · {o.customer}
                    </button>
                    <span className="flex items-center gap-2"><Pill value={o.classification ?? o.status} /> {money(o.qualified_cents)} · {money(o.commission_cents)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {a.notes && <p className="whitespace-pre-wrap rounded-lg bg-secondary/40 p-3">{a.notes}</p>}
          {a.history.length > 0 && (
            <ul className="grid gap-0.5 text-xs text-muted-foreground">
              {a.history.map((h, i) => <li key={i}>{fmtDateTime(h.at)} · {actionLabel(h.action)}{h.reason ? ` — ${h.reason}` : ""}</li>)}
            </ul>
          )}
        </div>
      )}
      {a && editing && <AmbassadorForm ambassador={a as unknown as Ambassador} onClose={() => setEditing(false)} onSaved={() => setEditing(false)} />}
    </Modal>
  );
}
