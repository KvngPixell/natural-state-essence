import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { usePortal } from "@/components/portal-context";
import { SignInForm } from "@/components/sign-in-form";
import { ControlCenter, OWNER_TABS, type OwnerTab } from "@/components/owner/control-center";
import { db, backendReady, outline, panel } from "@/lib/backend";

/**
 * Natural State Control Center. Unlisted (not linked anywhere, noindex, and
 * deliberately not named in robots.txt) — but that is a convenience, not the security. Access is
 * enforced by Supabase Auth plus server-side role checks inside every owner
 * function and Row Level Security on every table. No business data is
 * requested until the server has confirmed the signed-in user is an owner.
 */
export const Route = createFileRoute("/owner")({
  validateSearch: (s: Record<string, unknown>): { tab?: OwnerTab } => ({
    tab: typeof s["tab"] === "string" && (OWNER_TABS as readonly string[]).includes(s["tab"]) ? (s["tab"] as OwnerTab) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Control Center — Natural State Peptides" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Owner,
});

function Owner() {
  const { user, role, loading } = usePortal();
  const navigate = useNavigate();
  const { tab } = Route.useSearch();

  useEffect(() => {
    if (!loading && user && role === "ambassador") void navigate({ to: "/ambassador/dashboard" });
  }, [loading, user, role, navigate]);

  if (!backendReady) return <p className="p-12 text-center">The account service is not connected.</p>;
  if (loading) return <p className="p-12 text-center">Checking access…</p>;

  if (!user)
    return (
      <section className="mx-auto max-w-md px-5 py-20">
        <p className="eyebrow">Natural State Peptides</p>
        <h1 className="my-5 font-serif text-5xl text-primary">Owner sign in</h1>
        <div className={panel}>
          <SignInForm
            onSignedIn={(r) => {
              if (r === "ambassador") void navigate({ to: "/ambassador/dashboard" });
            }}
          />
        </div>
      </section>
    );

  if (role !== "owner" && role !== "admin")
    return (
      <section className="mx-auto max-w-md px-5 py-20">
        <h1 className="font-serif text-4xl text-primary">Access denied</h1>
        <p className="my-5 text-muted-foreground">This account does not have access to this area.</p>
        <button className={outline} onClick={() => db?.auth.signOut()}>
          Sign out
        </button>
      </section>
    );

  return (
    <ControlCenter
      tab={tab ?? "overview"}
      setTab={(t) => void navigate({ to: "/owner", search: { tab: t === "overview" ? undefined : t } })}
    />
  );
}
