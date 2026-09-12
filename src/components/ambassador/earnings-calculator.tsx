import { useState } from "react";
import { PUBLIC_TIERS, dollars, nextTier, rateFor } from "@/data/program";

const STEP = 250;
const MAX = 10000;

/**
 * Slider that shows what a month of qualifying sales would pay at the
 * published rates. Illustrative only — it does no server work.
 */
export function EarningsCalculator() {
  const [sales, setSales] = useState(5000);
  const rate = rateFor(sales);
  const commission = (sales * rate) / 100;
  const next = nextTier(sales);
  const atTop = sales >= MAX;

  return (
    <div className="mt-16 border-t border-ivory/15 pt-12 sm:mt-20 sm:pt-16">
      <h3 className="max-w-xl font-serif text-3xl leading-tight text-ivory sm:text-4xl">
        What could your network produce?
      </h3>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-16">
        <div>
          <label htmlFor="sales" className="block text-[0.7rem] tracking-[0.22em] text-gold uppercase">
            Monthly qualifying sales
          </label>
          <p className="mt-3 font-serif text-5xl text-ivory tabular-nums sm:text-6xl">
            {dollars(sales)}
            {atTop ? "+" : ""}
          </p>
          <input
            id="sales"
            type="range"
            min={0}
            max={MAX}
            step={STEP}
            value={sales}
            onChange={(e) => setSales(Number(e.target.value))}
            aria-valuetext={`${dollars(sales)}${atTop ? " or more" : ""} in monthly qualifying sales`}
            className="range-gold mt-8 cursor-pointer"
          />
          <div className="mt-3 flex justify-between text-xs text-ivory/70 tabular-nums">
            <span>$0</span>
            <span>$5,000</span>
            <span>$10,000+</span>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {PUBLIC_TIERS.map((t) => (
              <button
                key={t.from}
                type="button"
                onClick={() => setSales(t.example)}
                className={
                  "rounded-md border px-3.5 py-2 text-xs transition-colors " +
                  (rate === t.rate
                    ? "border-gold/70 bg-gold/15 text-ivory"
                    : "border-ivory/20 text-ivory/70 hover:border-gold/50 hover:text-ivory")
                }
              >
                {dollars(t.example)}
                {t.top ? "+" : ""}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:w-[22rem] lg:grid-cols-1 lg:gap-7 lg:border-l lg:border-ivory/15 lg:pl-12">
          <div>
            <p className="text-[0.7rem] tracking-[0.22em] text-ivory/72 uppercase">Commission rate</p>
            <p className="mt-2 font-serif text-4xl text-gold tabular-nums transition-all duration-300 sm:text-5xl">
              {rate}%
            </p>
          </div>
          <div>
            <p className="text-[0.7rem] tracking-[0.22em] text-ivory/72 uppercase">Illustrative monthly commission</p>
            <p className="mt-2 font-serif text-4xl text-ivory tabular-nums transition-all duration-300 sm:text-5xl">
              {dollars(commission)}
              {atTop ? "+" : ""}
            </p>
          </div>
        </div>
      </div>

      <p className="mt-10 max-w-2xl text-sm leading-relaxed text-ivory/75">
        {atTop
          ? `Approximately ${dollars(commission * 12)}+ over twelve months if the same qualifying sales and rate were maintained every month.`
          : next
            ? `${dollars(next.from - sales)} more in a month would move this to ${next.rate}% — approximately ${dollars(commission * 12)} over twelve months at the current rate.`
            : `Approximately ${dollars(commission * 12)} over twelve months at the same qualifying sales each month.`}
      </p>
      <p className="mt-3 text-xs text-ivory/70">Illustrative estimate only. Not a guarantee or projection of actual earnings.</p>
    </div>
  );
}
