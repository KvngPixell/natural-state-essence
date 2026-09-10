import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { db, rpc } from "@/lib/backend";
const Context = createContext<{
  user: User | null;
  loading: boolean;
  admin: boolean;
  referral: string;
  setReferral: (s: string) => void;
}>({ user: null, loading: true, admin: false, referral: "", setReferral: () => {} });
export const usePortal = () => useContext(Context);
export function PortalProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState(false);
  const [referral, setReferral] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref && /^[a-z0-9_-]{3,32}$/i.test(ref)) {
      setReferral(ref.toUpperCase());
      // Strip ?ref= from the address bar once captured: keeps the referral in
      // memory for this session while preventing search engines from indexing
      // a separate duplicate URL per ambassador code.
      params.delete("ref");
      const query = params.toString();
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname + (query ? "?" + query : "") + window.location.hash,
      );
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
      setAdmin(false);
      if (u) {
        const allowed = await rpc("nsp_is_admin").catch(() => false);
        if (alive && current === version) setAdmin(Boolean(allowed));
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
  return (
    <Context.Provider value={{ user, loading, admin, referral, setReferral }}>
      {children}
    </Context.Provider>
  );
}
