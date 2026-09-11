import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { db, rpc } from "@/lib/backend";
import { captureReferral, storedReferral } from "@/lib/referral";

export type Role = "owner" | "admin" | "ambassador" | null;
interface Me {
  role: Role;
  ambassador: { id: string; public_id: string; first_name: string; status: string } | null;
}

const Context = createContext<{
  user: User | null;
  loading: boolean;
  /** True for owner/admin. Display only — every owner function re-checks on the server. */
  admin: boolean;
  role: Role;
  me: Me | null;
  /** Referral code captured from /r/CODE or ?ref=CODE (empty when none). */
  referral: string;
  /** True when `referral` came from a link rather than being typed. */
  referralCaptured: boolean;
  setReferral: (s: string) => void;
}>({
  user: null,
  loading: true,
  admin: false,
  role: null,
  me: null,
  referral: "",
  referralCaptured: false,
  setReferral: () => {},
});
export const usePortal = () => useContext(Context);

export function PortalProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Me | null>(null);
  const [referral, setReferralState] = useState("");
  const [referralCaptured, setReferralCaptured] = useState(false);

  function setReferral(code: string) {
    setReferralState(code);
    setReferralCaptured(false);
  }

  useEffect(() => {
    const saved = storedReferral();
    if (saved) {
      setReferralState(saved.code);
      setReferralCaptured(true);
    }
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref && /^[a-z0-9_-]{3,32}$/i.test(ref)) {
      // Strip ?ref= from the address bar once captured, so search engines do
      // not index one duplicate URL per ambassador code.
      params.delete("ref");
      const query = params.toString();
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname + (query ? "?" + query : "") + window.location.hash,
      );
      void captureReferral(ref, "param").then((code) => {
        if (code) {
          setReferralState(code);
          setReferralCaptured(true);
        }
      });
    }
    if (!db) {
      setLoading(false);
      return;
    }
    let alive = true;
    let version = 0;
    async function apply(u: User | null) {
      const current = ++version;
      if (!alive) return;
      setUser(u);
      setMe(null);
      if (u) {
        const result = (await rpc("nsp_me").catch(() => null)) as Me | null;
        if (alive && current === version) setMe(result);
      }
      if (alive && current === version) setLoading(false);
    }
    const subscription = db.auth.onAuthStateChange((_event, session) => {
      void apply(session?.user ?? null);
    });
    void db.auth.getSession().then(({ data }) => apply(data.session?.user ?? null));
    return () => {
      alive = false;
      subscription.data.subscription.unsubscribe();
    };
  }, []);

  const role = me?.role ?? null;
  return (
    <Context.Provider
      value={{
        user,
        loading,
        admin: role === "owner" || role === "admin",
        role,
        me,
        referral,
        referralCaptured,
        setReferral,
      }}
    >
      {children}
    </Context.Provider>
  );
}
