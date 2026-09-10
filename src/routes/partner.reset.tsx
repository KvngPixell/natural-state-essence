import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { db, field, button, panel } from "@/lib/backend";
import { usePortal } from "@/components/portal-context";
export const Route = createFileRoute("/partner/reset")({
  head: () => ({
    meta: [
      { title: "Set Password — Natural State Peptides" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Reset,
});
function Reset() {
  const { user, loading } = usePortal();
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!db) return;
    if (password !== again) {
      setStatus("Passwords must match.");
      return;
    }
    setBusy(true);
    const { error } = await db.auth.updateUser({ password });
    setStatus(error ? error.message : "Password saved. You can open your dashboard.");
    setBusy(false);
  }
  return (
    <section className="mx-auto max-w-md px-5 py-20">
      <h1 className="mb-8 font-serif text-4xl">Set your password</h1>
      <div className={panel}>
        {loading ? (
          <p>Checking invitation…</p>
        ) : !user ? (
          <p>
            Open the invitation or recovery link from your email.{" "}
            <Link to="/partner/login" className="underline">
              Request a new reset link.
            </Link>
          </p>
        ) : (
          <form onSubmit={submit} className="grid gap-4">
            <label className="grid gap-2">
              New password
              <input
                type="password"
                minLength={12}
                required
                autoComplete="new-password"
                className={field}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label className="grid gap-2">
              Confirm password
              <input
                type="password"
                required
                autoComplete="new-password"
                className={field}
                value={again}
                onChange={(e) => setAgain(e.target.value)}
              />
            </label>
            <button disabled={busy} className={button}>
              Save password
            </button>
          </form>
        )}
        <p role="status" className="mt-4 text-sm">
          {status}
        </p>
        <Link to="/partner/dashboard" className="mt-5 inline-block underline">
          Open dashboard
        </Link>
      </div>
    </section>
  );
}
