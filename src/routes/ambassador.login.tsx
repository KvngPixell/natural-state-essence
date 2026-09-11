import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { db, backendReady, field, button, outline, panel, publicSite } from "@/lib/backend";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (!db) return;
    setBusy(true);
    const { error } = await db.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setStatus(error.message);
    else await navigate({ to: "/ambassador/dashboard" });
  }
  async function reset() {
    if (!db || !email) {
      setStatus("Enter your email first.");
      return;
    }
    setBusy(true);
    const { error } = await db.auth.resetPasswordForEmail(email, {
      redirectTo: (publicSite || window.location.origin) + "/ambassador/reset",
    });
    setStatus(
      error ? error.message : "If an account exists, check your email for a password-reset link.",
    );
    setBusy(false);
  }
  return (
    <section className="mx-auto max-w-md px-5 py-20">
      <p className="eyebrow">Natural State Ambassadors</p>
      <h1 className="my-5 font-serif text-5xl">Welcome back.</h1>
      <p className="mb-8 text-muted-foreground">
        Your referrals, recorded sales and commission history in one place.
      </p>
      <div className={panel}>
        {!backendReady ? (
          <p className="text-sm">
            Ambassador access is not open yet.{" "}
            <Link to="/ambassador" className="underline">
              Register your interest.
            </Link>
          </p>
        ) : (
          <form onSubmit={login} className="grid gap-5">
            <label className="grid gap-2 text-sm">
              Email
              <input
                type="email"
                required
                className={field}
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm">
              Password
              <input
                type="password"
                required
                className={field}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button disabled={busy} className={button}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
            <button type="button" disabled={busy} className={outline} onClick={reset}>
              Reset password
            </button>
          </form>
        )}
        <p role="status" className="mt-5 text-sm">
          {status}
        </p>
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
