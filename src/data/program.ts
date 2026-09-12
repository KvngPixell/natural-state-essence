/**
 * Public-facing ambassador program figures.
 *
 * The live commission engine reads its tiers from the database (Control Center
 * → Program Settings). These values are what the public /ambassador page
 * shows, so if the ranks are ever changed in Settings, change them here too.
 */
export interface PublicTier {
  /** Monthly qualifying sales at which this rate applies, in whole dollars. */
  from: number;
  /** Commission rate as a percentage. */
  rate: number;
  /** Sales figure used for the illustrative example on the page. */
  example: number;
  /** True for the top tier, which is shown as "$10,000+". */
  top?: boolean;
}

export const PUBLIC_TIERS: PublicTier[] = [
  { from: 0, rate: 15, example: 500 },
  { from: 1000, rate: 17.5, example: 1000 },
  { from: 2500, rate: 20, example: 2500 },
  { from: 5000, rate: 22.5, example: 5000 },
  { from: 10000, rate: 25, example: 10000, top: true },
];

export const COMMISSION_RANGE = "15%–25%";
export const RESIDUAL_MONTHS = 6;

/** Commission rate for a month's qualifying sales, in percent. */
export function rateFor(sales: number) {
  let rate = PUBLIC_TIERS[0].rate;
  for (const t of PUBLIC_TIERS) if (sales >= t.from) rate = t.rate;
  return rate;
}

/** The next rank up, or null at the top. */
export function nextTier(sales: number) {
  return PUBLIC_TIERS.find((t) => sales < t.from) ?? null;
}

/** "$1,125" — whole dollars, no cents. */
export const dollars = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
