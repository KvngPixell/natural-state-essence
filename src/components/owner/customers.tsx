import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { rpc, money, fmtDate, fmtDateTime, button, outline, field, errorText, pct } from "@/lib/backend";
import { useOwner } from "@/components/owner/owner-context";
import type { Ambassador, CustomerSummary } from "@/lib/program-types";
import { STATUS_LABEL } from "@/lib/program-types";
import { Empty, Modal, Notice, Pill, TableWrap, td, th } from "@/components/program-ui";
import { actionLabel } from "@/components/owner/overview";

interface CustomerDetail extends CustomerSummary {
  orders_list?: never;
  orders: number;
  possible_duplicates: { id: string; public_id: string; name: string; email: string | null; phone: string | null }[];
  attributions: { id: string; partner_name: string; status: string; source: string; code_used: string | null; first_purchase_on: string | null; residual_expires_on: string | null; ended_reason: string | null; created_at: string }[];
  history: { action: string; at: string; reason: string | null }[];
  inquiries: { id: string; kind: string; created_at: string; status: string; product: string | null }[];
}
interface DetailOrder {
  id: string; public_id: string; order_date: string; paid_on: string | null; status: string; classification: string | null;
  qualified_cents: number; refunded_cents: number; partner_name: string | null; commission_bps: number; commission_cents: number;
  items: { name: string; quantity: number }[]; flags: string[];
}

export function Customers() {
  const { version, focus, setFocus } = useOwner();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<CustomerSummary[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (focus?.tab === "customers") {
      setOpenId(focus.id);
      setFocus(null);
    }
  }, [focus, setFocus]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      rpc("nsp_find_customers", { p_q: q, p_limit: 100 })
        .then((r) => setRows(r as CustomerSummary[]))
        .catch((e) => setError(errorText(e)));
    }, 250);
    return () => window.clearTimeout(t);
  }, [q, version]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <input className={field + " max-w-md"} placeholder="Search name, email, phone or customer ID" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        <button className={button} onClick={() => setAdding(true)}>
          <Plus className="size-4" /> Add customer
        </button>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {!rows ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <Empty>{q ? "No customers match." : "No customers yet. They're created when you record a sale."}</Empty>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <th className={th}>Customer</th>
              <th className={th}>Email / phone</th>
              <th className={th}>Since</th>
              <th className={th}>Ambassador</th>
              <th className={th}>Attribution</th>
              <th className={th}>Residual to</th>
              <th className={th + " text-right"}>Orders</th>
              <th className={th + " text-right"}>Lifetime</th>
              <th className={th}>Last purchase</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="cursor-pointer hover:bg-secondary/40" onClick={() => setOpenId(c.id)}>
                <td className={td}>
                  <p className="font-medium text-primary">{c.first_name} {c.last_name}</p>
                  <p className="text-xs text-muted-foreground">{c.public_id}{c.duplicate_flag ? " · possible duplicate" : ""}</p>
                </td>
                <td className={td + " text-xs"}>
                  <p>{c.email ?? "—"}</p>
                  <p>{c.phone ?? ""}</p>
                </td>
                <td className={td + " whitespace-nowrap"}>{fmtDate(c.first_purchase_on)}</td>
                <td className={td}>{c.attribution?.partner_name ?? "—"}</td>
                <td className={td}><Pill value={c.attribution?.status ?? null} /></td>
                <td className={td + " whitespace-nowrap"}>{fmtDate(c.attribution?.residual_expires_on)}</td>
                <td className={td + " text-right tabular-nums"}>{c.orders}</td>
                <td className={td + " text-right tabular-nums"}>{money(c.lifetime_cents)}</td>
                <td className={td + " whitespace-nowrap"}>{fmtDate(c.last_purchase_on)}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      {openId && <CustomerProfile id={openId} onClose={() => setOpenId(null)} onOpen={setOpenId} />}
      {adding && <CustomerForm onClose={() => setAdding(false)} onSaved={(c) => { setAdding(false); setOpenId(c.id); }} />}
    </div>
  );
}

function CustomerForm({ customer, onClose, onSaved }: { customer?: CustomerSummary; onClose: () => void; onSaved: (c: CustomerSummary) => void }) {
  const { refresh } = useOwner();
  const [f, setF] = useState({
    first_name: customer?.first_name ?? "", last_name: customer?.last_name ?? "",
    email: customer?.email ?? "", phone: customer?.phone ?? "", notes: customer?.notes ?? "",
  });
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    setError("");
    try {
      const r = (await rpc("nsp_save_customer", { p: { id: customer?.id ?? null, ...f }, p_reason: reason || null })) as CustomerSummary;
      refresh();
      onSaved(r);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal open onClose={onClose} title={customer ? "Edit contact information" : "Add customer"}>
      <div className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {(["first_name", "last_name", "email", "phone"] as const).map((k) => (
            <label key={k} className="grid gap-1 text-sm">
              {k.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase())}
              <input className={field} type={k === "email" ? "email" : k === "phone" ? "tel" : "text"} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
            </label>
          ))}
        </div>
        <label className="grid gap-1 text-sm">
          Internal notes
          <textarea className={field} rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
        </label>
        {customer && (
          <label className="grid gap-1 text-sm">
            Reason for change (optional, saved to the audit log)
            <input className={field} value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
        )}
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex gap-2">
          <button className={button} disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</button>
          <button className={outline} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </Modal>
  );
}

function CustomerProfile({ id, onClose, onOpen }: { id: string; onClose: () => void; onOpen: (id: string) => void }) {
  const { version, refresh, recordSale } = useOwner();
  const [c, setC] = useState<(CustomerDetail & { orders_detail: DetailOrder[] }) | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    rpc("nsp_customer_detail", { p_id: id })
      .then((r) => {
        const raw = r as CustomerDetail & { orders: unknown };
        // nsp_customer_detail returns the order list under "orders" (overriding the count).
        const list = (raw.orders as unknown as DetailOrder[]) ?? [];
        setC({ ...(raw as CustomerDetail), orders: list.filter((o) => ["paid", "fulfilled"].includes(o.status)).length, orders_detail: list });
      })
      .catch((e) => setError(errorText(e)));
  }, [id, version]);

  async function toggleDuplicate() {
    if (!c) return;
    try {
      await rpc("nsp_flag_duplicate", { p_customer: c.id, p_flag: !c.duplicate_flag, p_reason: null });
      refresh();
    } catch (e) {
      setError(errorText(e));
    }
  }

  return (
    <Modal open onClose={onClose} title={c ? `${c.first_name} ${c.last_name ?? ""}` : "Customer"} description={c?.public_id} wide>
      {error && <Notice tone="error">{error}</Notice>}
      {!c ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid gap-5 text-sm">
          <div className="flex flex-wrap gap-2">
            <button className={button} onClick={() => recordSale({ customer: c })}>Record sale</button>
            <button className={outline} onClick={() => setEditing(true)}>Edit / add note</button>
            <button className={outline} onClick={() => setCorrecting(true)}>Correct attribution</button>
            <button className={outline} onClick={toggleDuplicate}>{c.duplicate_flag ? "Clear duplicate flag" : "Flag duplicate"}</button>
            <button className={outline} onClick={() => setMerging(true)}>Merge duplicate</button>
          </div>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Fact k="Email" v={c.email ?? "—"} />
            <Fact k="Phone" v={c.phone ?? "—"} />
            <Fact k="Total orders" v={String(c.orders)} />
            <Fact k="Lifetime revenue" v={money(c.lifetime_cents)} />
            <Fact k="First purchase" v={fmtDate(c.first_purchase_on)} />
            <Fact k="Last purchase" v={fmtDate(c.last_purchase_on)} />
            <Fact k="Original ambassador" v={c.attribution?.partner_name ?? "None"} />
            <Fact k="Residual" v={c.attribution ? `${c.attribution.status}${c.attribution.residual_starts_on ? ` · ${fmtDate(c.attribution.residual_starts_on)} → ${fmtDate(c.attribution.residual_expires_on)}` : ""}` : "—"} />
          </dl>
          {c.attribution_locked && <Notice tone="warn">Attribution was set manually by an owner. Automatic attribution is off for this customer.</Notice>}
          {c.duplicate_flag && <Notice tone="warn">Flagged as a possible duplicate.</Notice>}
          {c.notes && <p className="whitespace-pre-wrap rounded-lg bg-secondary/40 p-3">{c.notes}</p>}

          <div>
            <h3 className="font-serif text-xl text-primary">Order timeline</h3>
            {c.orders_detail.length === 0 ? (
              <Empty>No orders yet.</Empty>
            ) : (
              <ol className="mt-2 divide-y divide-border">
                {c.orders_detail.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <span className="min-w-0">
                      <span className="font-medium">{fmtDate(o.paid_on ?? o.order_date)}</span> — {money(o.qualified_cents - o.refunded_cents)} —{" "}
                      <Pill value={o.classification ?? o.status} label={o.classification ?? STATUS_LABEL[o.status]} />
                      {o.partner_name ? ` — ${o.partner_name}` : ""}
                      <span className="block text-xs text-muted-foreground">
                        {o.public_id} · {o.items.map((i) => `${i.quantity} × ${i.name}`).join(", ")}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {o.commission_cents ? `${pct(o.commission_bps)} · ${money(o.commission_cents)}` : STATUS_LABEL[o.status]}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div>
            <h3 className="font-serif text-xl text-primary">Attribution history</h3>
            {c.attributions.length === 0 ? (
              <p className="text-muted-foreground">No ambassador attribution.</p>
            ) : (
              <ul className="mt-2 grid gap-1">
                {c.attributions.map((a) => (
                  <li key={a.id} className="text-xs">
                    <Pill value={a.status} /> {a.partner_name} · via {a.source}{a.code_used ? ` (${a.code_used})` : ""}
                    {a.first_purchase_on ? ` · ${fmtDate(a.first_purchase_on)} → ${fmtDate(a.residual_expires_on)}` : ""}
                    {a.ended_reason ? ` · ${a.ended_reason}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {c.possible_duplicates.length > 0 && (
            <div>
              <h3 className="font-serif text-xl text-primary">Possible duplicates</h3>
              <ul className="mt-2 grid gap-1">
                {c.possible_duplicates.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center gap-2 text-xs">
                    {d.name} · {d.email ?? d.phone} · {d.public_id}
                    <button className="underline" onClick={() => onOpen(d.id)}>Open</button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {c.history.length > 0 && (
            <div>
              <h3 className="font-serif text-xl text-primary">Changes</h3>
              <ul className="mt-2 grid gap-1 text-xs text-muted-foreground">
                {c.history.map((h, i) => (
                  <li key={i}>{fmtDateTime(h.at)} · {actionLabel(h.action)}{h.reason ? ` — ${h.reason}` : ""}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {c && editing && <CustomerForm customer={c} onClose={() => setEditing(false)} onSaved={() => setEditing(false)} />}
      {c && correcting && <CorrectAttribution customer={c} onClose={() => setCorrecting(false)} />}
      {c && merging && <MergeCustomers customer={c} onClose={() => setMerging(false)} onMerged={(keep) => { setMerging(false); onOpen(keep); }} />}
    </Modal>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{k}</dt>
      <dd className="break-words">{v}</dd>
    </div>
  );
}

function CorrectAttribution({ customer, onClose }: { customer: CustomerSummary; onClose: () => void }) {
  const { refresh } = useOwner();
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>([]);
  const [choice, setChoice] = useState<string>(customer.attribution?.partner_id ?? "none");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    rpc("nsp_owner_ambassadors", { p_month: null }).then((a) => setAmbassadors(a as Ambassador[])).catch(() => {});
  }, []);
  async function save(mode: "lock" | "unlock") {
    setBusy(true);
    setError("");
    try {
      await rpc("nsp_correct_attribution", {
        p_customer: customer.id,
        p_partner: mode === "lock" && choice !== "none" ? choice : null,
        p_lock: mode === "lock",
        p_reason: reason,
      });
      refresh();
      onClose();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal open onClose={onClose} title="Correct attribution">
      <div className="grid gap-3 text-sm">
        <p className="text-muted-foreground">
          Currently: <strong className="text-primary">{customer.attribution?.partner_name ?? "no ambassador"}</strong>. Setting an
          ambassador here overrides automatic attribution for this customer; every sale is recalculated and the change is logged.
        </p>
        <label className="grid gap-1">
          Attribute to
          <select className={field} value={choice} onChange={(e) => setChoice(e.target.value)}>
            <option value="none">No ambassador</option>
            {ambassadors.map((a) => (
              <option key={a.id} value={a.id}>{a.display_name} · {a.code}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          Reason (required)
          <input className={field} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex flex-wrap gap-2">
          <button className={button} disabled={busy || reason.trim().length < 3} onClick={() => save("lock")}>Save correction</button>
          {customer.attribution_locked && (
            <button className={outline} disabled={busy || reason.trim().length < 3} onClick={() => save("unlock")}>
              Return to automatic attribution
            </button>
          )}
          <button className={outline} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </Modal>
  );
}

function MergeCustomers({ customer, onClose, onMerged }: { customer: CustomerSummary; onClose: () => void; onMerged: (keepId: string) => void }) {
  const { refresh } = useOwner();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CustomerSummary[]>([]);
  const [other, setOther] = useState<CustomerSummary | null>(null);
  const [keep, setKeep] = useState<"this" | "other">("this");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (!q.trim()) return setResults([]);
    const t = window.setTimeout(() => {
      rpc("nsp_find_customers", { p_q: q, p_limit: 8 })
        .then((r) => setResults((r as CustomerSummary[]).filter((x) => x.id !== customer.id)))
        .catch(() => setResults([]));
    }, 300);
    return () => window.clearTimeout(t);
  }, [q, customer.id]);
  async function merge() {
    if (!other) return;
    const keepId = keep === "this" ? customer.id : other.id;
    const mergeId = keep === "this" ? other.id : customer.id;
    try {
      await rpc("nsp_merge_customers", { p_keep: keepId, p_merge: mergeId, p_reason: reason });
      refresh();
      onMerged(keepId);
    } catch (e) {
      setError(errorText(e));
    }
  }
  return (
    <Modal open onClose={onClose} title="Merge duplicate customers">
      <div className="grid gap-3 text-sm">
        <p className="text-muted-foreground">Moves every order and inquiry onto one record. The other record is kept, marked as merged, and never deleted.</p>
        {!other ? (
          <>
            <input className={field} placeholder="Find the duplicate: name, email, phone, cus_…" value={q} onChange={(e) => setQ(e.target.value)} />
            <ul className="grid gap-1">
              {results.map((r) => (
                <li key={r.id}>
                  <button className="w-full rounded-lg px-2 py-2 text-left hover:bg-secondary" onClick={() => setOther(r)}>
                    {r.first_name} {r.last_name} · {r.email ?? r.phone} · {r.public_id} · {r.orders} orders
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <fieldset className="grid gap-2">
              <legend className="mb-1">Keep which record?</legend>
              {([["this", customer], ["other", other]] as const).map(([k, x]) => (
                <label key={k} className="flex items-center gap-2">
                  <input type="radio" checked={keep === k} onChange={() => setKeep(k)} />
                  {x.first_name} {x.last_name} · {x.email ?? x.phone} · {x.public_id} · {x.orders} orders
                  {x.attribution ? ` · ${x.attribution.partner_name}` : ""}
                </label>
              ))}
            </fieldset>
            <label className="grid gap-1">
              Reason (required)
              <input className={field} value={reason} onChange={(e) => setReason(e.target.value)} />
            </label>
          </>
        )}
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex gap-2">
          <button className={button} disabled={!other || reason.trim().length < 3} onClick={merge}>Merge</button>
          <button className={outline} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </Modal>
  );
}
