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
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref && /^[a-z0-9_-]{3,32}$/i.test(ref)) setReferral(ref.toUpperCase());
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
