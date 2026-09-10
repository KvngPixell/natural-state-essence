/** Persistent, site-wide research-use disclaimer. Kept short and legible on mobile. */
export function ResearchBanner() {
  return (
    <div className="bg-primary px-4 py-2 text-center text-[0.7rem] tracking-wide text-primary-foreground/90 sm:text-xs">
      For laboratory research use only — not for human or animal consumption, diagnostic, or
      therapeutic use.
    </div>
  );
}
