import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { db, backendReady, panel, outline } from "@/lib/backend";
import { SignInForm } from "@/components/sign-in-form";
import { usePortal, type Role } from "@/components/portal-context";

export const Route = createFileRoute("/ambassador/login")({
  head: () => ({
    meta: [
      { title: "Ambassador Login — Natural State Peptides" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const { user, role, loading } = usePortal();
  const [denied, setDenied] = useState(false);

  function route(r: Role) {
    if (r === "owner" || r === "admin") void navigate({ to: "/owner" });
    else if (r === "ambassador") void navigate({ to: "/ambassador/dashboard" });
    else setDenied(true);
  }
  // Already signed in: send them where they belong.
  useEffect(() => {
    if (!loading && user) route(role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, role]);

  return (
    <section className="mx-auto max-w-md px-5 py-20">
      <p className="eyebrow">Natural State Ambassadors</p>
      <h1 className="my-5 font-serif text-5xl">Welcome back.</h1>
      <p className="mb-8 text-muted-foreground">
        Your referrals, recorded sales, customers and commission in one place.
      </p>
      <div className={panel}>
        {!backendReady ? (
          <p className="text-sm">
            Ambassador access is not open yet.{" "}
            <Link to="/ambassador" className="underline">
              Register your interest.
            </Link>
          </p>
        ) : denied ? (
          <div className="grid gap-4">
            <h2 className="font-serif text-2xl text-primary">No ambassador access on this account</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              You're signed in, but this account isn't linked to an approved ambassador. If you've
              applied, we'll be in touch once your application is reviewed.
            </p>
            <button
              className={outline}
              onClick={async () => {
                await db?.auth.signOut();
                setDenied(false);
              }}
            >
              Sign out
            </button>
          </div>
        ) : (
          <SignInForm onSignedIn={route} />
        )}
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Accounts are issued to approved ambassadors.{" "}
        <Link to="/ambassador" className="underline">
          Apply to join.
        </Link>
      </p>
    </section>
  );
}
