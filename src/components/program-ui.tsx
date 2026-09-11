import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Small building blocks shared by the Owner Control Center and Ambassador Dashboard. */

export function Stat({
  label,
  value,
  sub,
  emphasis = false,
  className = "",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  emphasis?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border p-4 sm:p-5",
        emphasis ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
        className,
      )}
    >
      <p className={cn("text-[0.66rem] tracking-[0.18em] uppercase", emphasis ? "text-primary-foreground/70" : "text-muted-foreground")}>
        {label}
      </p>
      <p className={cn("mt-2 truncate font-serif text-2xl sm:text-3xl", emphasis ? "" : "text-primary")}>{value}</p>
      {sub && <p className={cn("mt-1 text-xs", emphasis ? "text-primary-foreground/75" : "text-muted-foreground")}>{sub}</p>}
    </div>
  );
}

const TONES: Record<string, string> = {
  NEW: "bg-[oklch(0.93_0.05_150)] text-[oklch(0.33_0.08_150)]",
  RESIDUAL: "bg-[oklch(0.93_0.05_78)] text-[oklch(0.42_0.1_70)]",
  UNATTRIBUTED: "bg-muted text-muted-foreground",
  EXCLUDED: "bg-[oklch(0.94_0.03_27)] text-[oklch(0.45_0.14_27)]",
  paid: "bg-[oklch(0.93_0.05_150)] text-[oklch(0.33_0.08_150)]",
  fulfilled: "bg-[oklch(0.93_0.05_150)] text-[oklch(0.33_0.08_150)]",
  approved: "bg-[oklch(0.93_0.05_150)] text-[oklch(0.33_0.08_150)]",
  active: "bg-[oklch(0.93_0.05_150)] text-[oklch(0.33_0.08_150)]",
  awaiting_payment: "bg-[oklch(0.93_0.05_78)] text-[oklch(0.42_0.1_70)]",
  pending: "bg-[oklch(0.93_0.05_78)] text-[oklch(0.42_0.1_70)]",
  held: "bg-[oklch(0.93_0.05_78)] text-[oklch(0.42_0.1_70)]",
  new: "bg-[oklch(0.93_0.05_78)] text-[oklch(0.42_0.1_70)]",
  draft: "bg-muted text-muted-foreground",
  expired: "bg-muted text-muted-foreground",
  inactive: "bg-muted text-muted-foreground",
  reviewed: "bg-muted text-muted-foreground",
  closed: "bg-muted text-muted-foreground",
  converted: "bg-[oklch(0.93_0.05_150)] text-[oklch(0.33_0.08_150)]",
  cancelled: "bg-[oklch(0.94_0.03_27)] text-[oklch(0.45_0.14_27)]",
  refunded: "bg-[oklch(0.94_0.03_27)] text-[oklch(0.45_0.14_27)]",
  disputed: "bg-[oklch(0.94_0.03_27)] text-[oklch(0.45_0.14_27)]",
  suspended: "bg-[oklch(0.94_0.03_27)] text-[oklch(0.45_0.14_27)]",
  archived: "bg-muted text-muted-foreground",
  declined: "bg-muted text-muted-foreground",
};

export function Pill({ value, label }: { value: string | null | undefined; label?: string }) {
  if (!value) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[0.7rem] font-medium tracking-wide",
        TONES[value] ?? "bg-muted text-muted-foreground",
      )}
    >
      {label ?? value.replace(/_/g, " ")}
    </span>
  );
}

export function Progress({ value, max, className = "" }: { value: number; max: number; className?: string }) {
  const pctValue = max <= 0 ? 100 : Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pctValue)}
      className={cn("h-2.5 w-full overflow-hidden rounded-full bg-primary-foreground/20", className)}
    >
      <div className="h-full rounded-full bg-gold transition-[width] duration-500" style={{ width: pctValue + "%" }} />
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className={cn(
          "max-h-[100dvh] w-full max-w-none overflow-y-auto rounded-none border-border bg-background p-5 sm:max-h-[92vh] sm:rounded-2xl sm:p-7",
          wide ? "sm:max-w-3xl" : "sm:max-w-xl",
        )}
      >
        <DialogHeader className="text-left">
          <DialogTitle className="pr-8 font-serif text-2xl font-normal text-primary">{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="min-w-0">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{children}</p>;
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "error" | "ok"; children: ReactNode }) {
  const tones = {
    info: "border-border bg-secondary/50 text-foreground",
    ok: "border-[oklch(0.8_0.06_150)] bg-[oklch(0.96_0.03_150)] text-[oklch(0.3_0.07_150)]",
    warn: "border-[oklch(0.83_0.08_78)] bg-[oklch(0.97_0.03_85)] text-[oklch(0.4_0.09_70)]",
    error: "border-[oklch(0.8_0.08_27)] bg-[oklch(0.97_0.02_27)] text-[oklch(0.45_0.14_27)]",
  } as const;
  return <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-lg border px-4 py-3 text-sm", tones[tone])}>{children}</div>;
}

/** Responsive table: horizontal scroll inside its own box, never the page. */
export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="-mx-1 overflow-x-auto px-1"><table className="w-full min-w-[40rem] border-collapse text-left text-sm">{children}</table></div>;
}
export const th = "border-b border-border px-3 py-2 text-[0.66rem] font-medium tracking-[0.14em] text-muted-foreground uppercase whitespace-nowrap";
export const td = "border-b border-border/70 px-3 py-3 align-top";
