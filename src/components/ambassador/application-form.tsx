import { useState } from "react";
import { usePortal } from "@/components/portal-context";
import { backendReady, edge, errorText } from "@/lib/backend";
import { checkCode, visitorId } from "@/lib/referral";

const CHANNELS = [
  "Facebook",
  "Instagram",
  "TikTok",
  "Gym / Fitness Community",
  "Wellness Community",
  "Local Business",
  "Professional Network",
  "Friends / Family",
  "Other",
] as const;

const STATES = [
  "AR", "AL", "AK", "AZ", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "HI", "IA", "ID", "IL", "IN", "KS", "KY", "LA",
  "MA", "MD", "ME", "MI", "MN", "MO", "MS", "MT", "NC", "ND", "NE", "NH", "NJ", "NM", "NV", "NY", "OH", "OK", "OR",
  "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VA", "VT", "WA", "WI", "WV", "WY",
];

const input =
  "w-full min-w-0 rounded-md border border-border bg-background px-4 py-3.5 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-accent focus:ring-2 focus:ring-accent/25";
const labelText = "text-[0.7rem] tracking-[0.18em] text-primary/70 uppercase";

/** Ambassador application. Sends a request of kind "application" to the team. */
export function AmbassadorApplication() {
  const { referral, referralCaptured } = usePortal();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("AR");
  const [channels, setChannels] = useState<string[]>([]);
  const [about, setAbout] = useState("");
  const [heard, setHeard] = useState("");
  const [code, setCode] = useState("");
  const [codeState, setCodeState] = useState<"" | "valid" | "invalid">("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const toggle = (c: string) =>
    setChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!about.trim()) return setError("Tell us a little about your network so we can review your application.");
    const effectiveCode = referralCaptured ? referral : code.trim().toUpperCase();
    setBusy(true);
    try {
      await edge({
        action: "submit",
        request: {
          id: crypto.randomUUID(),
          kind: "application",
          first_name: first.trim(),
          last_name: last.trim() || null,
          name: [first.trim(), last.trim()].filter(Boolean).join(" "),
          email: email.trim(),
          phone: phone.trim() || null,
          city: city.trim() || null,
          state,
          message: [
            "Ambassador application.",
            channels.length ? "Where they have influence: " + channels.join(", ") : "",
            "About their network: " + about.trim(),
            heard.trim() ? "Heard about the program: " + heard.trim() : "",
          ]
            .filter(Boolean)
            .join("\n\n"),
          referral_code: effectiveCode || null,
          referral_captured: referralCaptured,
          visitor_id: visitorId() || null,
          website,
        },
      });
      setSent(true);
    } catch (err) {
      setError(errorText(err) || "Could not send. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 sm:p-10">
        <p className="eyebrow">Thank you</p>
        <h3 className="mt-3 font-serif text-3xl text-primary sm:text-4xl">Application received.</h3>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          If there's a fit, we'll reach out with the next step and the applicable Ambassador Program terms.
        </p>
        <p className="script mt-8 text-3xl text-accent">Keep It Natural.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-6 rounded-lg border border-border bg-card p-6 sm:p-9">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className={labelText}>First name</span>
          <input required={backendReady} maxLength={60} autoComplete="given-name" className={input} value={first} onChange={(e) => setFirst(e.target.value)} />
        </label>
        <label className="grid gap-2">
          <span className={labelText}>Last name</span>
          <input maxLength={60} autoComplete="family-name" className={input} value={last} onChange={(e) => setLast(e.target.value)} />
        </label>
        <label className="grid gap-2">
          <span className={labelText}>Email</span>
          <input required={backendReady} type="email" maxLength={254} autoComplete="email" className={input} value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="grid gap-2">
          <span className={labelText}>Phone</span>
          <input required={backendReady} type="tel" maxLength={40} autoComplete="tel" className={input} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label className="grid gap-2">
          <span className={labelText}>City</span>
          <input maxLength={80} autoComplete="address-level2" className={input} value={city} onChange={(e) => setCity(e.target.value)} />
        </label>
        <label className="grid gap-2">
          <span className={labelText}>State</span>
          <select className={input} value={state} onChange={(e) => setState(e.target.value)}>
            {STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="grid gap-3">
        <legend className={labelText + " mb-2"}>Where do you have influence?</legend>
        <div className="flex flex-wrap gap-2">
          {CHANNELS.map((c) => {
            const on = channels.includes(c);
            return (
              <label
                key={c}
                className={
                  "cursor-pointer rounded-md border px-4 py-2.5 text-sm transition-colors " +
                  (on ? "border-primary bg-primary text-primary-foreground" : "border-border text-primary hover:border-accent")
                }
              >
                <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(c)} />
                {c}
              </label>
            );
          })}
        </div>
      </fieldset>

      <label className="grid gap-2">
        <span className={labelText}>Tell us about your network and why Natural State interests you</span>
        <textarea
          required={backendReady}
          rows={5}
          maxLength={2000}
          className={input}
          value={about}
          onChange={(e) => setAbout(e.target.value)}
        />
      </label>

      <label className="grid gap-2">
        <span className={labelText}>How did you hear about the Ambassador Program?</span>
        <input maxLength={200} className={input} value={heard} onChange={(e) => setHeard(e.target.value)} />
      </label>

      {!referralCaptured && (
        <label className="grid gap-2">
          <span className={labelText}>Referral code (optional)</span>
          <input
            maxLength={32}
            pattern="[A-Za-z0-9_-]*"
            className={input}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setCodeState("");
            }}
            onBlur={async () => {
              if (!code.trim()) return setCodeState("");
              setCodeState((await checkCode(code)) ? "valid" : "invalid");
            }}
          />
          {codeState === "valid" && <span className="text-xs text-primary">Referral code applied.</span>}
          {codeState === "invalid" && <span className="text-xs text-destructive">We couldn't find that code.</span>}
        </label>
      )}

      <div className="hidden" aria-hidden="true">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <button
        className="inline-flex w-full items-center justify-center rounded-md bg-primary px-8 py-4 text-sm tracking-wide text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        disabled={busy || !backendReady}
      >
        {busy ? "Sending…" : "Submit Application →"}
      </button>
      <p className="text-xs leading-relaxed text-muted-foreground">
        We use these details to review your application and contact you. Applying does not create an ambassador
        relationship; approved ambassadors receive written program terms.
      </p>
    </form>
  );
}
