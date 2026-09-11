import { useEffect, useMemo, useState } from "react";
import { rpc, money, pct, fmtDate, fmtMonth, button, outline, field, errorText, toCents, centsToInput, todayISO } from "@/lib/backend";
import { useOwner } from "@/components/owner/owner-context";
import type { Statement } from "@/lib/program-types";
import { Empty, Modal, Notice, Pill, TableWrap, td, th } from "@/components/program-ui";

export function useStatements(month: string | null) {
  const { version } = useOwner();
  const [rows, setRows] = useState<Statement[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    rpc("nsp_owner_commissions", { p_month: month })
      .then((r) => setRows(r as Statement[]))
      .catch((e) => setError(errorText(e)));
  }, [month, version]);
  return { rows, error };
}

export function Commissions() {
  const all = useStatements(null);
  const currentMonth = todayISO().slice(0, 8) + "01";
  const months = useMemo(() => {
    const set = new Set<string>([currentMonth, ...(all.rows ?? []).map((s) => s.month)]);
    return [...set].sort().reverse();
  }, [all.rows, currentMonth]);
  const [month, setMonth] = useState(currentMonth);
  const [who, setWho] = useState("");
  const [rank, setRank] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [acting, setActing] = useState<{ s: Statement; action: "adjust" | "pay" | "cancel" } | null>(null);
  const [error, setError] = useState("");
  const { refresh } = useOwner();

  const rows = (all.rows ?? []).filter(
    (s) =>
      s.month === month &&
      (!who || s.ambassador_name.toLowerCase().includes(who.toLowerCase())) &&
      (!rank || s.tier_name === rank) &&
      (!type || (type === "new" ? s.new_revenue_cents > 0 : s.residual_revenue_cents > 0)) &&
      (!status || s.status === status),
  );
  const ranks = [...new Set((all.rows ?? []).map((s) => s.tier_name).filter(Boolean))] as string[];
  const totals = rows.reduce(
    (a, s) => ({ q: a.q + s.qualified_cents, f: a.f + (s.status === "cancelled" ? 0 : s.final_cents), b: a.b + s.balance_cents }),
    { q: 0, f: 0, b: 0 },
  );
  const monthOpen = month === currentMonth;

  async function act(s: Statement, action: "approve" | "hold" | "reopen") {
    setError("");
    try {
      await rpc("nsp_statement_action", { p_statement: s.id, p_action: action, p_notes: null });
      refresh();
    } catch (e) {
      setError(errorText(e));
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <select className={field + " w-auto"} value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Month">
          {months.map((m) => <option key={m} value={m}>{fmtMonth(m)}</option>)}
        </select>
        <input className={field + " max-w-[12rem]"} placeholder="Ambassador" value={who} onChange={(e) => setWho(e.target.value)} />
        <select className={field + " w-auto"} value={rank} onChange={(e) => setRank(e.target.value)} aria-label="Rank">
          <option value="">All ranks</option>
          {ranks.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className={field + " w-auto"} value={type} onChange={(e) => setType(e.target.value)} aria-label="Commission type">
          <option value="">New + residual</option>
          <option value="new">Has new-customer</option>
          <option value="residual">Has residual</option>
        </select>
        <select className={field + " w-auto"} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Payout status">
          <option value="">All statuses</option>
          {["pending", "approved", "paid", "held", "cancelled"].map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>
      {monthOpen && (
        <Notice tone="info">
          {fmtMonth(month)} is still in progress — figures keep updating as sales are recorded. Approve after the month closes.
        </Notice>
      )}
      {(all.error || error) && <Notice tone="error">{all.error || error}</Notice>}
      <p className="text-sm text-muted-foreground">
        {rows.length} ambassador{rows.length === 1 ? "" : "s"} · {money(totals.q)} qualified · {money(totals.f)} commission · {money(totals.b)} unpaid
      </p>
      {!all.rows ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <Empty>No commission for this month and filter.</Empty>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <th className={th}>Ambassador</th>
              <th className={th + " text-right"}>New revenue</th>
              <th className={th + " text-right"}>Returning</th>
              <th className={th + " text-right"}>Monthly qualified</th>
              <th className={th}>Earned rank</th>
              <th className={th + " text-right"}>New comm.</th>
              <th className={th + " text-right"}>Residual</th>
              <th className={th + " text-right"}>Adjust.</th>
              <th className={th + " text-right"}>Final payable</th>
              <th className={th + " text-right"}>Paid</th>
              <th className={th}>Status</th>
              <th className={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td className={td}>
                  <p className="font-medium text-primary">{s.ambassador_name}</p>
                  <p className="text-xs text-muted-foreground">{s.new_customers} new · {s.returning_customers} returning</p>
                </td>
                <td className={td + " text-right tabular-nums"}>{money(s.new_revenue_cents)}</td>
                <td className={td + " text-right tabular-nums"}>{money(s.residual_revenue_cents)}</td>
                <td className={td + " text-right tabular-nums"}>{money(s.qualified_cents)}</td>
                <td className={td + " whitespace-nowrap"}>{s.tier_name} <span className="text-xs text-muted-foreground">{pct(s.tier_bps)}</span></td>
                <td className={td + " text-right tabular-nums"}>{money(s.new_commission_cents)}</td>
                <td className={td + " text-right tabular-nums"}>{money(s.residual_commission_cents)}</td>
                <td className={td + " text-right tabular-nums"}>{s.adjustment_cents ? money(s.adjustment_cents) : "—"}</td>
                <td className={td + " text-right font-medium tabular-nums"}>{money(s.final_cents)}</td>
                <td className={td + " text-right tabular-nums"}>{money(s.paid_cents)}</td>
                <td className={td}><Pill value={s.status} /></td>
                <td className={td}>
                  <div className="flex flex-wrap gap-1.5">
                    {["pending", "held"].includes(s.status) && <button className={outline + " px-3 py-1.5"} onClick={() => act(s, "approve")}>Approve</button>}
                    {["approved", "paid"].includes(s.status) && s.balance_cents > 0 && (
                      <button className={button + " px-3 py-1.5"} onClick={() => setActing({ s, action: "pay" })}>Mark paid</button>
                    )}
                    {["pending", "approved"].includes(s.status) && <button className={outline + " px-3 py-1.5"} onClick={() => act(s, "hold")}>Hold</button>}
                    {!["paid", "cancelled"].includes(s.status) && (
                      <button className={outline + " px-3 py-1.5"} onClick={() => setActing({ s, action: "adjust" })}>Adjust</button>
                    )}
                    {s.paid_cents === 0 && s.status !== "cancelled" && (
                      <button className={outline + " px-3 py-1.5"} onClick={() => setActing({ s, action: "cancel" })}>Cancel</button>
                    )}
                    {s.paid_cents === 0 && ["approved", "held", "cancelled"].includes(s.status) && (
                      <button className={outline + " px-3 py-1.5"} onClick={() => act(s, "reopen")}>Reopen</button>
                    )}
                  </div>
                  {s.adjustments.length > 0 && (
                    <ul className="mt-1 text-[0.7rem] text-muted-foreground">
                      {s.adjustments.map((a, i) => <li key={i}>{money(a.cents)} — {a.reason}</li>)}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      {acting && <StatementAction {...acting} onClose={() => setActing(null)} />}
    </div>
  );
}

export function StatementAction({ s, action, onClose }: { s: Statement; action: "adjust" | "pay" | "cancel"; onClose: () => void }) {
  const { refresh } = useOwner();
  const [amount, setAmount] = useState(action === "pay" ? centsToInput(s.balance_cents) : "");
  const [negative, setNegative] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [reference, setReference] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const cents = toCents(amount);
  async function go() {
    setBusy(true);
    setError("");
    try {
      if (action === "pay") await rpc("nsp_record_payout", { p_statement: s.id, p_amount: cents, p_paid_on: date, p_reference: reference || null, p_notes: text || null });
      else if (action === "adjust") await rpc("nsp_add_adjustment", { p_statement: s.id, p_cents: (negative ? -1 : 1) * (cents ?? 0), p_reason: text });
      else await rpc("nsp_statement_action", { p_statement: s.id, p_action: "cancel", p_notes: text });
      refresh();
      onClose();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  const title = action === "pay" ? "Record commission payment" : action === "adjust" ? "Add adjustment" : "Cancel commission";
  const valid = action === "cancel" ? text.trim().length >= 3 : cents != null && cents > 0 && (action === "pay" || text.trim().length >= 3);
  return (
    <Modal open onClose={onClose} title={title} description={`${s.ambassador_name} · ${fmtMonth(s.month)}`}>
      <div className="grid gap-3 text-sm">
        {action === "pay" && (
          <>
            <p className="text-muted-foreground">Records money you've already sent (Venmo, Cash App, cash…). Nothing is transferred from here. Owed: {money(s.balance_cents)}.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1">Amount paid<input className={field} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
              <label className="grid gap-1">Paid on<input type="date" className={field} value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} /></label>
              <label className="grid gap-1 sm:col-span-2">Payment reference<input className={field} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. Venmo transaction ID" /></label>
            </div>
          </>
        )}
        {action === "adjust" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">Amount<input className={field} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
            <label className="flex items-center gap-2 pt-6"><input type="checkbox" checked={negative} onChange={(e) => setNegative(e.target.checked)} /> Deduction</label>
          </div>
        )}
        <label className="grid gap-1">
          {action === "pay" ? "Notes (optional)" : "Reason (required)"}
          <input className={field} value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        {s.payouts.length > 0 && action === "pay" && (
          <ul className="text-xs text-muted-foreground">
            {s.payouts.map((p, i) => <li key={i}>Already paid {money(p.amount_cents)} on {fmtDate(p.paid_on)}{p.reference ? ` · ${p.reference}` : ""}</li>)}
          </ul>
        )}
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex gap-2">
          <button className={button} disabled={busy || !valid} onClick={go}>{busy ? "Saving…" : title}</button>
          <button className={outline} onClick={onClose}>Close</button>
        </div>
      </div>
    </Modal>
  );
}
