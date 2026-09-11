import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { captureReferral } from "@/lib/referral";

/**
 * Ambassador referral link: /r/K7P4XZ (optionally /r/K7P4XZ?to=/product/kpv).
 * Records the visit, remembers the referral in first-party storage, then
 * sends the visitor to the normal site so the code never stays in view.
 * Only same-site paths are accepted as a destination.
 */
export const Route = createFileRoute("/r/$code")({
  validateSearch: (s: Record<string, unknown>): { to?: string } => ({
    to: typeof s["to"] === "string" && /^\/(?!\/)[A-Za-z0-9/_\-.?=&#]*$/.test(s["to"]) ? s["to"] : undefined,
  }),
  head: () => ({ meta: [{ title: "Natural State Peptides" }, { name: "robots", content: "noindex" }] }),
  component: ReferralLink,
});

function ReferralLink() {
  const { code } = Route.useParams();
  const { to } = Route.useSearch();
  useEffect(() => {
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      window.location.replace(to ?? "/");
    };
    // Never strand the visitor if the network is slow: continue after 2.5s.
    const timer = window.setTimeout(go, 2500);
    void captureReferral(code, "link").finally(() => {
      window.clearTimeout(timer);
      go();
    });
    return () => window.clearTimeout(timer);
  }, [code, to]);
  return (
    <section className="mx-auto flex min-h-[50vh] max-w-md items-center justify-center px-5 py-20 text-center">
      <p className="font-serif text-2xl text-primary">Welcome to Natural State Peptides…</p>
    </section>
  );
}
