import { useEffect } from "react";

/**
 * Forwards an old /partner/* or /admin/partners URL to its ambassador
 * equivalent. Runs in the browser so the query string and #hash survive —
 * Supabase invite and recovery links carry their tokens there.
 */
export function LegacyRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to + window.location.search + window.location.hash);
  }, [to]);
  return (
    <section className="mx-auto max-w-md px-5 py-20 text-center">
      <p>
        This page has moved.{" "}
        <a href={to} className="underline">
          Continue
        </a>
      </p>
    </section>
  );
}
