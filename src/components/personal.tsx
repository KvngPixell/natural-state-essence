import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { accentOf, initials } from "@/lib/personal";

/** Shared personalized chrome for the Control Center and the Ambassador Dashboard. */

export function Monogram({
  first,
  last,
  accent,
  className = "",
}: {
  first?: string | null;
  last?: string | null;
  accent?: string | null;
  className?: string;
}) {
  const a = accentOf(accent);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-full font-serif text-base tracking-wide ring-4 sm:size-12 sm:text-lg",
        a.chip,
        a.ring,
        className,
      )}
    >
      {initials(first, last)}
    </span>
  );
}

/** Greeting block: monogram, "Good morning, Isaac.", and a quiet line beneath. */
export function PersonalHeader({
  eyebrow,
  greeting,
  subline,
  first,
  last,
  accent,
  actions,
}: {
  eyebrow: string;
  greeting: string;
  subline?: ReactNode;
  first?: string | null;
  last?: string | null;
  accent?: string | null;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-5">
      <div className="flex min-w-0 items-start gap-4">
        <Monogram first={first} last={last} accent={accent} className="mt-1.5" />
        <div className="min-w-0">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-2 font-serif text-3xl leading-tight text-primary sm:text-[2.75rem]">{greeting}</h1>
          {subline && <div className="mt-2 text-sm text-muted-foreground">{subline}</div>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export interface DigestItem {
  n: number;
  one: string;
  many: string;
  /** Rendered instead of the count when present (used for money). */
  display?: string;
}

/**
 * "Since you were last here." Renders nothing at all on a first sign-in — an
 * empty digest would be worse than no digest. When the counts are all zero it
 * says so plainly rather than showing a wall of noughts.
 */
export function Digest({
  since,
  items,
  footer,
  quiet = "All quiet — nothing new since then.",
}: {
  /** Human phrase like "Thursday evening"; null hides the whole card. */
  since: string | null;
  items: DigestItem[];
  footer?: ReactNode;
  quiet?: string;
}) {
  if (!since) return null;
  const shown = items.filter((i) => i.n > 0);
  return (
    <div className="rounded-2xl border border-border bg-secondary/40 p-5 sm:p-6">
      <p className="eyebrow">Since you were last here</p>
      <p className="mt-2 font-serif text-xl text-primary sm:text-2xl">You were last here {since}.</p>
      {shown.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{quiet}</p>
      ) : (
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
          {shown.map((i) => (
            <li key={i.one} className="min-w-0">
              <span className="font-serif text-2xl text-primary tabular-nums sm:text-3xl">{i.display ?? i.n}</span>
              <span className="ml-2 text-sm text-muted-foreground">{i.n === 1 ? i.one : i.many}</span>
            </li>
          ))}
        </ul>
      )}
      {footer && <div className="mt-4 border-t border-border pt-3 text-sm text-muted-foreground">{footer}</div>}
    </div>
  );
}

/** The "Keep It Natural." sign-off that closes both dashboards. */
export function Signature({ note }: { note?: string }) {
  return (
    <div className="pt-4 text-center">
      {note && <p className="text-xs tracking-wide text-muted-foreground">{note}</p>}
      <p className="script mt-2 text-3xl text-accent sm:text-4xl">Keep It Natural.</p>
    </div>
  );
}
