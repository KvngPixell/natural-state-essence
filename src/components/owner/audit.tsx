import { useEffect, useState } from "react";
import { rpc, fmtDateTime, field, outline, errorText } from "@/lib/backend";
import { useOwner } from "@/components/owner/owner-context";
import { actionLabel } from "@/components/owner/overview";
import { Empty, Notice } from "@/components/program-ui";

interface AuditRow {
  id: number;
  action: string;
  at: string;
  entity: string | null;
  entity_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason: string | null;
  actor: string | null;
}

const ENTITIES = [
  { value: "", label: "Everything" },
  { value: "order", label: "Sales" },
  { value: "customer", label: "Customers" },
  { value: "ambassador", label: "Ambassadors" },
  { value: "request", label: "Inquiries & applications" },
  { value: "statement", label: "Commissions & payouts" },
  { value: "settings", label: "Program settings" },
];

// Internal bookkeeping columns that change on every write and add noise.
const NOISE = new Set(["updated_at", "updated_by", "last_activity_at", "email_norm", "phone_norm", "rates_snapshot"]);
const show = (v: unknown) => {
  if (v == null || v === "") return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

function Changes({ before, after }: { before: AuditRow["before"]; after: AuditRow["after"] }) {
  if (!before && !after) return null;
  const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])].filter(
    (k) => !NOISE.has(k) && JSON.stringify(before?.[k]) !== JSON.stringify(after?.[k]),
  );
  if (keys.length === 0) return <p className="text-xs text-muted-foreground">No field changes recorded.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[28rem] text-xs">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="py-1 pr-3 font-normal">Field</th>
            {before && <th className="py-1 pr-3 font-normal">Before</th>}
            {after && <th className="py-1 font-normal">After</th>}
          </tr>
        </thead>
        <tbody>
          {keys.map((k) => (
            <tr key={k} className="border-t border-border align-top">
              <td className="py-1 pr-3 font-mono">{k}</td>
              {before && <td className="max-w-[16rem] break-words py-1 pr-3 text-muted-foreground">{show(before[k])}</td>}
              {after && <td className="max-w-[16rem] break-words py-1">{show(after[k])}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Read-only: the audit table rejects updates and deletes at the database level. */
export function AuditLog() {
  const { version } = useOwner();
  const [entity, setEntity] = useState("");
  const [limit, setLimit] = useState(200);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    rpc("nsp_owner_audit", { p_limit: limit, p_entity: entity || null })
      .then((r) => setRows(r as AuditRow[]))
      .catch((e) => setError(errorText(e)));
  }, [entity, limit, version]);

  const needle = q.trim().toLowerCase();
  const list = (rows ?? []).filter(
    (r) =>
      !needle ||
      [r.action, r.reason, r.actor, r.entity_id, JSON.stringify(r.after ?? r.before ?? {})].some((v) => (v ?? "").toLowerCase().includes(needle)),
  );

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        Every change to sales, customers, attribution, ambassadors, commissions, payouts and settings — who, when, what changed and why. Entries can't be edited or deleted.
      </p>
      <div className="flex flex-wrap gap-2">
        <select className={field + " w-auto"} value={entity} onChange={(e) => setEntity(e.target.value)} aria-label="Record type">
          {ENTITIES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
        </select>
        <input className={field + " max-w-xs"} placeholder="Search action, reason, person…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {!rows ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : list.length === 0 ? (
        <Empty>No audit entries match.</Empty>
      ) : (
        <ul className="grid gap-2">
          {list.map((r) => (
            <li key={r.id} className="rounded-xl border border-border bg-card p-3 sm:p-4">
              <button className="flex w-full flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-left" onClick={() => setOpen(open === r.id ? null : r.id)} aria-expanded={open === r.id}>
                <span className="font-medium text-primary">{actionLabel(r.action)}</span>
                <span className="text-xs text-muted-foreground">{fmtDateTime(r.at)}</span>
              </button>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {r.actor ?? "System"}
                {r.entity ? ` · ${r.entity}` : ""}
                {r.entity_id ? ` ${String(r.entity_id).slice(0, 12)}` : ""}
              </p>
              {r.reason && <p className="mt-1 text-sm">“{r.reason}”</p>}
              {open === r.id && (
                <div className="mt-3 border-t border-border pt-3">
                  <Changes before={r.before} after={r.after} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {rows && rows.length >= limit && limit < 1000 && (
        <button className={outline + " justify-self-start"} onClick={() => setLimit(Math.min(1000, limit + 300))}>Load older entries</button>
      )}
    </div>
  );
}
