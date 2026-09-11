import { useEffect, useState } from "react";
import { rpc, money, fmtDateTime, button, outline, panel, field, errorText, paymentLabel } from "@/lib/backend";
import { useOwner } from "@/components/owner/owner-context";
import { FULFIL_METHOD_LABEL, type RequestRecord } from "@/lib/program-types";
import { Empty, Notice, Pill } from "@/components/program-ui";

const KIND_LABEL: Record<string, string> = {
  order: "Order request",
  product: "Product inquiry",
  coa: "COA request",
  availability: "Availability",
  application: "Ambassador application",
};

export function Inquiries() {
  const { version, recordSale, refresh, setFocus } = useOwner();
  const [rows, setRows] = useState<RequestRecord[] | null>(null);
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("new");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => {
      rpc("nsp_owner_requests", { p_kind: kind || null, p_status: status || null, p_q: q || null, p_limit: 200 })
        .then((r) => setRows((r as RequestRecord[]).filter((x) => kind === "application" || x.kind !== "application")))
        .catch((e) => setError(errorText(e)));
    }, 250);
    return () => window.clearTimeout(t);
  }, [version, kind, status, q]);

  async function setRequestStatus(id: string, s: string) {
    try {
      await rpc("nsp_request_status", { p_id: id, p_status: s });
      refresh();
    } catch (e) {
      setError(errorText(e));
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <input className={field + " max-w-xs"} placeholder="Search name, email, phone, product" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={field + " w-auto"} value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Type">
          <option value="">All types</option>
          <option value="order">Order requests</option>
          <option value="product">Product inquiries</option>
          <option value="coa">COA requests</option>
          <option value="availability">Availability</option>
        </select>
        <select className={field + " w-auto"} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="new">New</option>
          <option value="reviewed">Reviewed</option>
          <option value="converted">Converted to sale</option>
          <option value="closed">Closed</option>
          <option value="">All</option>
        </select>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {!rows ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <Empty>No inquiries match.</Empty>
      ) : (
        <ul className="grid gap-3">
          {rows.map((r) => (
            <li key={r.id} className={panel + " p-4 sm:p-5"}>
              <button className="flex w-full flex-wrap items-start justify-between gap-2 text-left" onClick={() => setOpen(open === r.id ? null : r.id)}>
                <div className="min-w-0">
                  <p className="font-medium text-primary">
                    {r.name} <span className="text-xs font-normal text-muted-foreground">· {KIND_LABEL[r.kind] ?? r.kind}</span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {fmtDateTime(r.created_at)} · {r.email}
                    {r.phone ? ` · ${r.phone}` : ""}
                  </p>
                  <p className="mt-1 text-sm">
                    {r.kind === "order" && r.order_items?.length
                      ? r.order_items.map((i) => `${i.quantity} × ${i.name}`).join(", ")
                      : r.product ?? ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {r.ambassador_name && <Pill value="NEW" label={`Referred by ${r.ambassador_name}`} />}
                  {r.existing_customer && <Pill value="RESIDUAL" label="Existing customer" />}
                  <Pill value={r.status} />
                </div>
              </button>
              {open === r.id && (
                <div className="mt-4 grid gap-3 border-t border-border pt-4 text-sm">
                  {r.kind === "order" && (
                    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div><dt className="text-xs text-muted-foreground">Payment</dt><dd>{paymentLabel(r.payment_method)}{r.payment_other ? ` (${r.payment_other})` : ""}</dd></div>
                      <div><dt className="text-xs text-muted-foreground">Fulfilment</dt><dd>{FULFIL_METHOD_LABEL[r.fulfillment_method ?? ""] ?? "—"}</dd></div>
                      {r.order_items?.some((i) => typeof i.est_cents === "number") && (
                        <div className="col-span-2">
                          <dt className="text-xs text-muted-foreground">Estimate at list price</dt>
                          <dd>
                            {money(r.order_items.reduce((a, i) => a + (i.est_cents ?? 0), 0))}
                            {r.order_items.some((i) => i.est_cents == null) ? " + items to quote" : ""}
                          </dd>
                        </div>
                      )}
                    </dl>
                  )}
                  {r.referral_code && (
                    <p className="text-xs text-muted-foreground">
                      Referral code {r.referral_code} ({r.referral_source === "code_entry" ? "typed by customer" : "from referral link"})
                    </p>
                  )}
                  {r.existing_customer && (
                    <p className="text-xs">
                      Matches customer {r.existing_customer.public_id}
                      {r.existing_customer.attribution ? ` · attributed to ${r.existing_customer.attribution.partner_name} (${r.existing_customer.attribution.status})` : ""}.{" "}
                      <button className="underline" onClick={() => setFocus({ tab: "customers", id: r.existing_customer!.id })}>Open customer</button>
                    </p>
                  )}
                  <p className="whitespace-pre-wrap rounded-lg bg-secondary/40 p-3">{r.message}</p>
                  <div className="flex flex-wrap gap-2">
                    {r.status !== "converted" && (
                      <button className={button} onClick={() => recordSale({ request: r, customer: r.existing_customer ?? undefined })}>
                        Convert to sale
                      </button>
                    )}
                    {r.order_id && <span className="text-xs text-muted-foreground">Converted to a sale.</span>}
                    {r.status === "new" && <button className={outline} onClick={() => setRequestStatus(r.id, "reviewed")}>Mark reviewed</button>}
                    {!["closed", "converted"].includes(r.status) && <button className={outline} onClick={() => setRequestStatus(r.id, "closed")}>Close</button>}
                    {r.status === "closed" && <button className={outline} onClick={() => setRequestStatus(r.id, "new")}>Reopen</button>}
                    <a className={outline} href={`mailto:${r.email}`}>Email</a>
                    {r.phone && <a className={outline} href={`sms:${r.phone.replace(/[^\d+]/g, "")}`}>Text</a>}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
