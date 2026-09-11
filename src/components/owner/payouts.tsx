import { useState } from "react";
import { money, fmtDate, fmtMonth, button, outline } from "@/lib/backend";
import { StatementAction, useStatements } from "@/components/owner/commissions";
import { useOwner } from "@/components/owner/owner-context";
import type { Statement } from "@/lib/program-types";
import { Empty, Notice, Pill, Stat, TableWrap, td, th } from "@/components/program-ui";

/**
 * Payouts are records of money the owner has already sent outside the site
 * (cash, Venmo, Cash App…). Nothing here moves money.
 */
export function Payouts() {
  const { rows, error } = useStatements(null);
  const { go } = useOwner();
  const [paying, setPaying] = useState<Statement | null>(null);
  const [who, setWho] = useState("");

  const all = rows ?? [];
  const owed = all.filter((s) => ["approved", "paid"].includes(s.status) && s.balance_cents > 0);
  const awaitingApproval = all.filter((s) => s.status === "pending" && s.final_cents > 0);
  const held = all.filter((s) => s.status === "held" && s.final_cents > 0);
  const history = all
    .flatMap((s) => s.payouts.map((p) => ({ ...p, month: s.month, ambassador_name: s.ambassador_name })))
    .filter((p) => !who || p.ambassador_name.toLowerCase().includes(who.toLowerCase()))
    .sort((a, b) => (a.paid_on < b.paid_on ? 1 : -1));
  const sum = (list: { balance_cents?: number; final_cents?: number }[], k: "balance_cents" | "final_cents") =>
    list.reduce((a, s) => a + (s[k] ?? 0), 0);
  const paidTotal = all.reduce((a, s) => a + s.paid_cents, 0);

  return (
    <div className="grid gap-5">
      <p className="text-sm text-muted-foreground">
        Record money after you've sent it — nothing is transferred from this site. Approve a month under Commissions before paying it.
      </p>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Approved & unpaid" value={money(sum(owed, "balance_cents"))} sub={`${owed.length} statement${owed.length === 1 ? "" : "s"}`} emphasis />
        <Stat label="Awaiting approval" value={money(sum(awaitingApproval, "final_cents"))} sub={`${awaitingApproval.length} pending`} />
        <Stat label="On hold" value={money(sum(held, "final_cents"))} sub={`${held.length} held`} />
        <Stat label="Paid to date" value={money(paidTotal)} />
      </div>

      <section className="grid gap-3">
        <h3 className="font-serif text-xl text-primary">Ready to pay</h3>
        {!rows ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : owed.length === 0 ? (
          <Empty>
            Nothing approved and unpaid.{" "}
            {awaitingApproval.length > 0 && (
              <button className="underline" onClick={() => go("commissions")}>Review {awaitingApproval.length} pending statement{awaitingApproval.length === 1 ? "" : "s"}</button>
            )}
          </Empty>
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <th className={th}>Ambassador</th>
                <th className={th}>Month</th>
                <th className={th + " text-right"}>Final payable</th>
                <th className={th + " text-right"}>Paid</th>
                <th className={th + " text-right"}>Owed</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody>
              {owed.map((s) => (
                <tr key={s.id}>
                  <td className={td}>
                    <p className="font-medium text-primary">{s.ambassador_name}</p>
                    <p className="text-xs text-muted-foreground">{s.ambassador_public_id}</p>
                  </td>
                  <td className={td + " whitespace-nowrap"}>{fmtMonth(s.month)}</td>
                  <td className={td + " text-right tabular-nums"}>{money(s.final_cents)}</td>
                  <td className={td + " text-right tabular-nums"}>{money(s.paid_cents)}</td>
                  <td className={td + " text-right font-medium tabular-nums"}>{money(s.balance_cents)}</td>
                  <td className={td}>
                    <button className={button + " px-3 py-1.5"} onClick={() => setPaying(s)}>Record payment</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </section>

      <section className="grid gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h3 className="font-serif text-xl text-primary">Payout history</h3>
          <input
            className="w-full max-w-[14rem] rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="Filter by ambassador"
            value={who}
            onChange={(e) => setWho(e.target.value)}
          />
        </div>
        {!rows ? null : history.length === 0 ? (
          <Empty>No payouts recorded yet.</Empty>
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <th className={th}>Paid on</th>
                <th className={th}>Ambassador</th>
                <th className={th}>For month</th>
                <th className={th + " text-right"}>Amount</th>
                <th className={th}>Reference</th>
                <th className={th}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {history.map((p, i) => (
                <tr key={i}>
                  <td className={td + " whitespace-nowrap"}>{fmtDate(p.paid_on)}</td>
                  <td className={td}>{p.ambassador_name}</td>
                  <td className={td + " whitespace-nowrap"}>{fmtMonth(p.month)}</td>
                  <td className={td + " text-right tabular-nums"}>{money(p.amount_cents)}</td>
                  <td className={td}>{p.reference || "—"}</td>
                  <td className={td + " text-muted-foreground"}>{p.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </section>

      {held.length > 0 && (
        <section className="grid gap-2">
          <h3 className="font-serif text-xl text-primary">On hold</h3>
          <ul className="grid gap-2 text-sm">
            {held.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
                <span>{s.ambassador_name} · {fmtMonth(s.month)} · {money(s.final_cents)}</span>
                <span className="flex items-center gap-2">
                  <Pill value="held" />
                  <button className={outline + " px-3 py-1.5"} onClick={() => go("commissions")}>Open in Commissions</button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {paying && <StatementAction s={paying} action="pay" onClose={() => setPaying(null)} />}
    </div>
  );
}
