import { useState, type ReactNode } from "react";
import { OwnerContext, OWNER_TABS, LABELS, type OwnerCtx, type OwnerTab } from "@/components/owner/owner-context";
export { OWNER_TABS, type OwnerTab } from "@/components/owner/owner-context";
import { Plus } from "lucide-react";
import { db, button, outline } from "@/lib/backend";
import { RecordSale, type SalePrefill } from "@/components/owner/record-sale";
import { Overview } from "@/components/owner/overview";
import { Inquiries } from "@/components/owner/inquiries";
import { Customers } from "@/components/owner/customers";
import { Orders } from "@/components/owner/orders";
import { Ambassadors } from "@/components/owner/ambassadors";
import { Applications } from "@/components/owner/applications";
import { Commissions } from "@/components/owner/commissions";
import { Payouts } from "@/components/owner/payouts";
import { Analytics } from "@/components/owner/analytics";
import { ProgramSettingsPanel } from "@/components/owner/settings";
import { AuditLog } from "@/components/owner/audit";

export function ControlCenter({ tab, setTab }: { tab: OwnerTab; setTab: (t: OwnerTab) => void }) {
  const [sale, setSale] = useState<{ open: boolean; prefill?: SalePrefill }>({ open: false });
  const [version, setVersion] = useState(0);
  const [focus, setFocus] = useState<{ tab: OwnerTab; id: string } | null>(null);
  const ctx: OwnerCtx = {
    recordSale: (prefill) => setSale({ open: true, prefill }),
    version,
    refresh: () => setVersion((v) => v + 1),
    go: setTab,
    focus,
    setFocus: (f) => {
      setFocus(f);
      if (f) setTab(f.tab);
    },
  };
  let body: ReactNode;
  switch (tab) {
    case "inquiries": body = <Inquiries />; break;
    case "customers": body = <Customers />; break;
    case "orders": body = <Orders />; break;
    case "ambassadors": body = <Ambassadors />; break;
    case "applications": body = <Applications />; break;
    case "commissions": body = <Commissions />; break;
    case "payouts": body = <Payouts />; break;
    case "analytics": body = <Analytics />; break;
    case "settings": body = <ProgramSettingsPanel />; break;
    case "audit": body = <AuditLog />; break;
    default: body = <Overview />;
  }
  return (
    <OwnerContext.Provider value={ctx}>
      <section className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-8 sm:pt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Natural State Peptides</p>
            <h1 className="mt-2 font-serif text-3xl text-primary sm:text-5xl">Natural State Control Center</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={button} onClick={() => ctx.recordSale()}>
              <Plus className="size-4" /> Record sale
            </button>
            <button className={outline} onClick={() => db?.auth.signOut()}>
              Sign out
            </button>
          </div>
        </div>
        <nav
          aria-label="Control Center"
          className="sticky top-20 z-30 -mx-4 mt-6 overflow-x-auto border-y border-border bg-background/95 px-4 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-2"
        >
          <ul className="flex min-w-max gap-1 py-2">
            {OWNER_TABS.map((t) => (
              <li key={t}>
                <button
                  onClick={() => {
                    setFocus(null);
                    setTab(t);
                  }}
                  aria-current={tab === t ? "page" : undefined}
                  className={
                    "whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors " +
                    (tab === t ? "bg-primary text-primary-foreground" : "text-primary/80 hover:bg-secondary")
                  }
                >
                  {LABELS[t]}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-6">{body}</div>
      </section>
      {/* Floating record-sale button for phones */}
      <button
        onClick={() => ctx.recordSale()}
        className="fixed right-4 bottom-4 z-40 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-4 text-sm font-medium text-primary-foreground shadow-lift sm:hidden"
      >
        <Plus className="size-5" /> Record sale
      </button>
      <RecordSale
        open={sale.open}
        prefill={sale.prefill}
        onClose={() => setSale({ open: false })}
        onSaved={() => ctx.refresh()}
      />
    </OwnerContext.Provider>
  );
}
