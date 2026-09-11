import { useEffect, useState } from "react";
import { rpc, money, pct, fmtDateTime, field, button, outline, panel, errorText, toCents, centsToInput } from "@/lib/backend";
import { skus } from "@/data/products";
import { useOwner } from "@/components/owner/owner-context";
import type { ProgramSettings } from "@/lib/program-types";
import { Notice } from "@/components/program-ui";

interface TierDraft {
  name: string;
  min: string;
  rate: string;
}
const toBps = (s: string) => {
  const v = s.replace(/[%\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(v)) return null;
  return Math.round(Number(v) * 100);
};
const bpsToInput = (bps: number) => String(bps / 100);

/** Every commission rule lives here so it can change without code edits. */
export function ProgramSettingsPanel() {
  const { version, refresh } = useOwner();
  const [saved, setSaved] = useState<ProgramSettings | null>(null);
  const [tiers, setTiers] = useState<TierDraft[]>([]);
  const [residual, setResidual] = useState("");
  const [months, setMonths] = useState("");
  const [windowDays, setWindowDays] = useState("");
  const [reacq, setReacq] = useState<"never" | "allow">("never");
  const [excluded, setExcluded] = useState<string[]>([]);
  const [leaderboard, setLeaderboard] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  function load(s: ProgramSettings) {
    setSaved(s);
    setTiers(s.tiers.map((t) => ({ name: t.name, min: centsToInput(t.min_cents) || "0", rate: bpsToInput(t.bps) })));
    setResidual(bpsToInput(s.residual_bps));
    setMonths(String(s.residual_months));
    setWindowDays(String(s.referral_window_days));
    setReacq(s.reacquisition);
    setExcluded(s.excluded_products ?? []);
    setLeaderboard(s.leaderboard_enabled);
  }
  useEffect(() => {
    rpc("nsp_get_settings")
      .then((r) => load(r as ProgramSettings))
      .catch((e) => setError(errorText(e)));
  }, [version]);

  // Validate the draft the same way the server does, so mistakes show before saving.
  const parsed = tiers.map((t) => ({ name: t.name.trim(), min_cents: toCents(t.min || "0"), bps: toBps(t.rate) }));
  const problems: string[] = [];
  if (parsed.length < 1) problems.push("Add at least one rank.");
  parsed.forEach((t, i) => {
    if (!t.name) problems.push(`Rank ${i + 1} needs a name.`);
    if (t.min_cents == null) problems.push(`Rank ${i + 1} threshold isn't a dollar amount.`);
    if (t.bps == null || t.bps > 5000) problems.push(`Rank ${i + 1} rate must be 0–50%.`);
    if (i === 0 && t.min_cents !== 0) problems.push("The first rank must start at $0.");
    if (i > 0 && t.min_cents != null && parsed[i - 1].min_cents != null && t.min_cents <= (parsed[i - 1].min_cents as number))
      problems.push(`Rank ${i + 1} threshold must be higher than rank ${i}.`);
  });
  const residualBps = toBps(residual);
  if (residualBps == null || residualBps > 5000) problems.push("Residual rate must be 0–50%.");
  const monthsN = Number(months);
  if (!Number.isInteger(monthsN) || monthsN < 1 || monthsN > 60) problems.push("Residual period must be 1–60 months.");
  const windowN = Number(windowDays);
  if (!Number.isInteger(windowN) || windowN < 1 || windowN > 365) problems.push("Referral window must be 1–365 days.");
  const needsReason = reason.trim().length < 3;

  async function save() {
    setBusy(true);
    setError("");
    setOk("");
    try {
      const r = await rpc("nsp_save_settings", {
        p: {
          tiers: parsed,
          residual_bps: residualBps,
          residual_months: monthsN,
          referral_window_days: windowN,
          reacquisition: reacq,
          excluded_products: excluded,
          leaderboard_enabled: leaderboard,
        },
        p_reason: reason.trim(),
      });
      load(r as ProgramSettings);
      setReason("");
      setConfirming(false);
      setOk("Saved. Open (unapproved) months were recalculated with the new rules; approved and paid months keep the rates they were approved with.");
      refresh();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  if (!saved) return error ? <Notice tone="error">{error}</Notice> : <p className="text-sm text-muted-foreground">Loading…</p>;

  const set = (i: number, k: keyof TierDraft, v: string) => setTiers(tiers.map((t, j) => (j === i ? { ...t, [k]: v } : t)));

  return (
    <div className="grid gap-5">
      <p className="text-sm text-muted-foreground">
        Last changed {fmtDateTime(saved.updated_at)}. Changes apply to the current month and any month not yet approved. Every change is recorded in the audit log.
      </p>

      <section className={panel + " grid gap-4 p-4 sm:p-6"}>
        <div>
          <h3 className="font-serif text-xl text-primary">Ranks</h3>
          <p className="text-sm text-muted-foreground">
            Rank is set by an ambassador's total qualified revenue for the calendar month (new + residual customers). The rank reached applies to every new-customer sale that month.
          </p>
        </div>
        <div className="grid gap-2">
          <div className="hidden grid-cols-[1fr_9rem_7rem_2.5rem] gap-2 text-[0.66rem] tracking-[0.18em] text-muted-foreground uppercase sm:grid">
            <span>Name</span><span>Monthly revenue from</span><span>Rate</span><span />
          </div>
          {tiers.map((t, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_9rem_7rem_2.5rem] sm:border-0 sm:p-0">
              <label className="col-span-2 grid gap-1 text-xs sm:col-span-1">
                <span className="sm:sr-only">Name</span>
                <input className={field + " py-2"} value={t.name} onChange={(e) => set(i, "name", e.target.value)} />
              </label>
              <label className="grid gap-1 text-xs">
                <span className="sm:sr-only">From ($)</span>
                <input className={field + " py-2"} inputMode="decimal" value={t.min} disabled={i === 0} onChange={(e) => set(i, "min", e.target.value)} />
              </label>
              <label className="grid gap-1 text-xs">
                <span className="sm:sr-only">Rate (%)</span>
                <input className={field + " py-2"} inputMode="decimal" value={t.rate} onChange={(e) => set(i, "rate", e.target.value)} />
              </label>
              <button
                type="button"
                aria-label={`Remove ${t.name || "rank"}`}
                className="col-span-2 rounded-lg border border-border px-2 py-2 text-sm text-muted-foreground hover:bg-secondary disabled:opacity-40 sm:col-span-1"
                disabled={tiers.length <= 1 || i === 0}
                onClick={() => setTiers(tiers.filter((_, j) => j !== i))}
              >
                ✕
              </button>
            </div>
          ))}
          {tiers.length < 10 && (
            <button
              type="button"
              className={outline + " justify-self-start px-3 py-2"}
              onClick={() => {
                const last = parsed[parsed.length - 1];
                setTiers([...tiers, { name: "", min: centsToInput((last?.min_cents ?? 0) + 500000), rate: "" }]);
              }}
            >
              Add rank
            </button>
          )}
        </div>
      </section>

      <section className={panel + " grid gap-4 p-4 sm:p-6"}>
        <h3 className="font-serif text-xl text-primary">Residual & attribution</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-sm">Residual rate (%)
            <input className={field} inputMode="decimal" value={residual} onChange={(e) => setResidual(e.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">Residual period (months)
            <input className={field} inputMode="numeric" value={months} onChange={(e) => setMonths(e.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">Referral link window (days)
            <input className={field} inputMode="numeric" value={windowDays} onChange={(e) => setWindowDays(e.target.value)} />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          Residual starts the day after a customer's first purchase and runs for the period above. The link window is how long a visit through an ambassador's link still credits that ambassador.
        </p>
        <fieldset className="grid gap-2 text-sm">
          <legend className="mb-1">When an expired customer comes back through a different ambassador</legend>
          <label className="flex items-start gap-2">
            <input type="radio" name="reacq" checked={reacq === "never"} onChange={() => setReacq("never")} className="mt-1" />
            <span>Keep them with no ambassador <span className="text-muted-foreground">(recommended — a customer is only ever "new" once)</span></span>
          </label>
          <label className="flex items-start gap-2">
            <input type="radio" name="reacq" checked={reacq === "allow"} onChange={() => setReacq("allow")} className="mt-1" />
            <span>Allow a new ambassador to acquire them as a new customer</span>
          </label>
        </fieldset>
      </section>

      <section className={panel + " grid gap-3 p-4 sm:p-6"}>
        <div>
          <h3 className="font-serif text-xl text-primary">Products excluded from commission</h3>
          <p className="text-sm text-muted-foreground">Sales of checked products still count as orders but add $0 to qualified revenue.</p>
        </div>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {skus.map((p) => (
            <label key={p.sku} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={excluded.includes(p.sku)}
                onChange={(e) => setExcluded(e.target.checked ? [...excluded, p.sku] : excluded.filter((x) => x !== p.sku))}
              />
              <span className="min-w-0 truncate">{p.label}</span>
            </label>
          ))}
        </div>
      </section>

      <section className={panel + " grid gap-2 p-4 sm:p-6"}>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" checked={leaderboard} onChange={(e) => setLeaderboard(e.target.checked)} className="mt-1" />
          <span>
            <span className="font-medium text-primary">Show the leaderboard to ambassadors</span>
            <span className="block text-muted-foreground">Ambassadors see each other's first name + last initial, rank and monthly qualified revenue — never customer names, contact details or commission amounts.</span>
          </span>
        </label>
      </section>

      <section className="grid gap-3">
        <label className="grid gap-1 text-sm">Reason for this change (required)
          <input className={field} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Raised Gold threshold for Q4" />
        </label>
        {problems.length > 0 && (
          <Notice tone="warn">
            <ul className="list-disc pl-4">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
          </Notice>
        )}
        {error && <Notice tone="error">{error}</Notice>}
        {ok && <Notice tone="ok">{ok}</Notice>}
        {confirming && problems.length === 0 && !needsReason ? (
          <div className="grid gap-3 rounded-xl border border-border bg-secondary/40 p-4 text-sm">
            <p className="font-medium text-primary">Confirm new rules</p>
            <ul className="grid gap-1 text-muted-foreground">
              {parsed.map((t, i) => <li key={i}>{t.name}: from {money(t.min_cents ?? 0)} / month → {pct(t.bps)}</li>)}
              <li>Residual {pct(residualBps)} for {monthsN} months · link window {windowN} days</li>
              <li>{excluded.length} product{excluded.length === 1 ? "" : "s"} excluded · leaderboard {leaderboard ? "on" : "off"}</li>
            </ul>
            <div className="flex flex-wrap gap-2">
              <button className={button} disabled={busy} onClick={save}>{busy ? "Saving…" : "Save and recalculate open months"}</button>
              <button className={outline} onClick={() => setConfirming(false)}>Back</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button className={button} disabled={problems.length > 0 || needsReason} onClick={() => setConfirming(true)}>Review changes</button>
            <button className={outline} onClick={() => load(saved)}>Discard edits</button>
          </div>
        )}
      </section>
    </div>
  );
}
