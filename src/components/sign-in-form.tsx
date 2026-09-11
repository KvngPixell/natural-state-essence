import { useState } from "react";
import { db, rpc, field, button, outline, publicSite, errorText } from "@/lib/backend";
import type { Role } from "@/components/portal-context";

/**
 * Supabase email + password sign-in, shared by the ambassador login and the
 * owner login. After signing in, the user's role is read from the server
 * (nsp_me) — never from anything the browser can edit.
 */
export function SignInForm({ onSignedIn }: { onSignedIn: (role: Role) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (!db) return;
    setBusy(true);
    setStatus("");
    const { error } = await db.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setBusy(false);
      setStatus(error.message === "Invalid login credentials" ? "Email or password is incorrect." : error.message);
      return;
    }
    const me = (await rpc("nsp_me").catch(() => null)) as { role: Role } | null;
    setBusy(false);
    onSignedIn(me?.role ?? null);
  }
  async function reset() {
    if (!db || !email.trim()) {
      setStatus("Enter your email first.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await db.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: (publicSite || window.location.origin) + "/ambassador/reset",
      });
      setStatus(error ? error.message : "If an account exists, check your email for a password-reset link.");
    } catch (err) {
      setStatus(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={login} className="grid gap-5">
      <label className="grid gap-2 text-sm">
        Email
        <input type="email" required className={field} autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="grid gap-2 text-sm">
        Password
        <input type="password" required className={field} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      <button disabled={busy} className={button}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
      <button type="button" disabled={busy} className={outline} onClick={reset}>
        Reset password
      </button>
      <p role="status" className="text-sm">
        {status}
      </p>
    </form>
  );
}
