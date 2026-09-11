import { useEffect, useState } from "react";
import { rpc, fmtDateTime, button, outline, panel, field, errorText } from "@/lib/backend";
import { useOwner } from "@/components/owner/owner-context";
import type { RequestRecord } from "@/lib/program-types";
import { Empty, Modal, Notice, Pill } from "@/components/program-ui";
import { AmbassadorForm } from "@/components/owner/ambassadors";

export function Applications() {
  const { version, refresh, setFocus } = useOwner();
  const [rows, setRows] = useState<RequestRecord[] | null>(null);
  const [show, setShow] = useState<"pending" | "decided">("pending");
  const [open, setOpen] = useState<string | null>(null);
  const [approving, setApproving] = useState<RequestRecord | null>(null);
  const [declining, setDeclining] = useState<RequestRecord | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    rpc("nsp_owner_requests", { p_kind: "application", p_status: null, p_q: null, p_limit: 300 })
      .then((r) => setRows(r as RequestRecord[]))
      .catch((e) => setError(errorText(e)));
  }, [version]);

  const pending = (rows ?? []).filter((r) => ["new", "reviewed"].includes(r.status));
  const decided = (rows ?? []).filter((r) => !["new", "reviewed"].includes(r.status));
  const list = show === "pending" ? pending : decided;

  return (
    <div className="grid gap-4">
      <div className="flex gap-2">
        <button className={show === "pending" ? button : outline} onClick={() => setShow("pending")}>Pending ({pending.length})</button>
        <button className={show === "decided" ? button : outline} onClick={() => setShow("decided")}>Decided ({decided.length})</button>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {!rows ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : list.length === 0 ? (
        <Empty>{show === "pending" ? "No pending ambassador applications." : "No decided applications yet."}</Empty>
      ) : (
        <ul className="grid gap-3">
          {list.map((r) => (
            <li key={r.id} className={panel + " p-4 sm:p-5"}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-primary">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmtDateTime(r.created_at)} · {r.email}{r.phone ? ` · ${r.phone}` : ""}
                    {r.city || r.state ? ` · ${[r.city, r.state].filter(Boolean).join(", ")}` : ""}
                  </p>
                </div>
                <Pill value={r.status} />
              </div>
              <p className={"mt-3 whitespace-pre-wrap text-sm " + (open === r.id ? "" : "line-clamp-3")}>{r.message}</p>
              {r.decision_reason && <p className="mt-2 text-xs text-muted-foreground">Reason: {r.decision_reason}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <button className={outline} onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? "Less" : "View"}</button>
                {["new", "reviewed"].includes(r.status) && (
                  <>
                    <button className={button} onClick={() => setApproving(r)}>Approve</button>
                    <button className={outline} onClick={() => setDeclining(r)}>Decline</button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {approving && (
        <AmbassadorForm
          applicationId={approving.id}
          initial={{
            first_name: approving.first_name ?? approving.name.split(" ")[0],
            last_name: approving.last_name ?? approving.name.split(" ").slice(1).join(" "),
            email: approving.email,
            phone: approving.phone ?? "",
            city: approving.city ?? "",
            state: approving.state ?? "",
          }}
          onClose={() => setApproving(null)}
          onSaved={(a) => {
            setApproving(null);
            setFocus({ tab: "ambassadors", id: a.id });
          }}
        />
      )}
      {declining && (
        <Decline
          r={declining}
          onClose={() => setDeclining(null)}
          onDone={() => {
            setDeclining(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function Decline({ r, onClose, onDone }: { r: RequestRecord; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  async function go() {
    try {
      await rpc("nsp_decline_application", { p_request: r.id, p_reason: reason || null });
      onDone();
    } catch (e) {
      setError(errorText(e));
    }
  }
  return (
    <Modal open onClose={onClose} title={`Decline ${r.name}?`}>
      <div className="grid gap-3 text-sm">
        <label className="grid gap-1">Internal reason (optional, not sent to the applicant)
          <input className={field} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex gap-2">
          <button className={button} onClick={go}>Decline application</button>
          <button className={outline} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </Modal>
  );
}
