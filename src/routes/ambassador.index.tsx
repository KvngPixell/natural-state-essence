import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import heroImage from "@/assets/hero-arkansas.jpg";
import lakeImage from "@/assets/contact-banner.jpg";
import arkansasMark from "@/assets/arkansas-hero.webp";
import { Reveal, RevealFallbackStyle } from "@/components/reveal";
import { EarningsCalculator } from "@/components/ambassador/earnings-calculator";
import { AmbassadorApplication } from "@/components/ambassador/application-form";
import { COMMISSION_RANGE, PUBLIC_TIERS, dollars } from "@/data/program";

const title = "Natural State Ambassador Program — Apply";
const description =
  "Represent an Arkansas research peptide brand. Approved Natural State Ambassadors earn 15%–25% commission on qualifying referred sales, with a personal referral link and a private dashboard.";

export const Route = createFileRoute("/ambassador/")({
  validateSearch: (s: Record<string, unknown>): { source?: string } => ({
    source: typeof s["source"] === "string" ? s["source"].slice(0, 40) : undefined,
  }),
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: AmbassadorLanding,
});

const SHELL = "mx-auto w-full max-w-7xl px-5 sm:px-8";
const CTA_BASE =
  "inline-flex items-center justify-center gap-2.5 rounded-md px-8 py-4 text-[0.72rem] tracking-[0.18em] uppercase transition-colors";
const CTA_LIGHT = CTA_BASE + " bg-primary text-primary-foreground hover:bg-forest/90";
const CTA_ON_DARK = CTA_BASE + " bg-ivory text-forest hover:bg-gold";
const EYEBROW_DARK = "text-[0.7rem] tracking-[0.24em] text-gold uppercase";

/** Very small parallax on the hero photograph. Disabled for reduced motion. */
function useParallax() {
  const ref = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(max-width: 767px)").matches) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const y = Math.min(window.scrollY, 700) * 0.12;
        el.style.transform = `translate3d(0, ${y}px, 0) scale(1.06)`;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);
  return ref;
}

function AmbassadorLanding() {
  const { source } = Route.useSearch();
  const invited = source === "card";
  const parallax = useParallax();

  return (
    <>
      <RevealFallbackStyle />

      {/* 1 — HERO ------------------------------------------------------- */}
      <section className="relative isolate overflow-hidden bg-forest">
        <img
          ref={parallax}
          src={heroImage}
          alt=""
          width={1920}
          height={1080}
          fetchPriority="high"
          className="absolute inset-0 -z-20 size-full scale-[1.06] object-cover object-center will-change-transform"
        />
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(180deg, oklch(0.244 0.045 160 / 0.86) 0%, oklch(0.244 0.045 160 / 0.62) 42%, oklch(0.244 0.045 160 / 0.9) 100%)",
          }}
        />
        <div className={SHELL + " relative flex min-h-[82svh] flex-col justify-center py-16 sm:py-24 lg:min-h-[42rem] lg:py-28"}>
          <div className="grid gap-14 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] lg:items-end lg:gap-20">
            <Reveal>
              <p className={EYEBROW_DARK}>{invited ? "You were invited." : "Natural State Ambassadors"}</p>
              <h1 className="mt-5 max-w-[15ch] font-serif text-[2.6rem] leading-[0.98] text-ivory sm:mt-6 sm:text-6xl lg:text-7xl">
                {invited ? (
                  <>
                    Become a Natural
                    <br className="hidden sm:block" /> State Ambassador.
                  </>
                ) : (
                  <>
                    Turn conversations
                    <br className="hidden sm:block" /> into opportunity.
                  </>
                )}
              </h1>
              <p className="mt-6 max-w-xl leading-relaxed text-ivory/85 sm:mt-7 sm:text-lg">
                {invited ? "Turn conversations into opportunity. " : ""}
                Represent a growing Arkansas brand and earn {COMMISSION_RANGE} commission on qualifying referred sales.
              </p>
              <p className="mt-3 hidden max-w-xl leading-relaxed text-ivory/75 sm:block">
                Your link. Your customers. Your progress. We handle the rest.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:mt-9 sm:flex-row sm:items-center">
                <a href="#apply" className={CTA_ON_DARK}>
                  Apply to become an Ambassador →
                </a>
                <Link
                  to="/ambassador/login"
                  className="text-sm text-ivory/75 underline underline-offset-8 transition-colors hover:text-gold"
                >
                  Already approved? Ambassador Login
                </Link>
              </div>
              <p className="script mt-9 text-[2.1rem] text-gold sm:mt-12 sm:text-5xl">Keep It Natural.</p>
            </Reveal>

            {/* Opportunity panel — a column of the composition, not a card. */}
            <Reveal delay={120} className="border-t border-ivory/20 pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-12">
              <p className="font-serif text-6xl leading-none text-gold tabular-nums sm:text-7xl">{COMMISSION_RANGE}</p>
              <p className="mt-3 text-[0.7rem] tracking-[0.24em] text-ivory/70 uppercase">Commission potential</p>
              <ul className="mt-8 grid gap-3 text-sm text-ivory/80">
                {[
                  "Personal referral link",
                  "Private dashboard",
                  "Performance-based growth",
                  "Eligible repeat-order attribution",
                ].map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 2 — VALUE STRIP ------------------------------------------------ */}
      <section className="bg-background py-16 sm:py-20">
        <div className={SHELL}>
          <div className="grid gap-10 sm:grid-cols-3 sm:gap-8 sm:divide-x sm:divide-border">
            {[
              [COMMISSION_RANGE, "Commission potential"],
              ["$0", "Inventory required"],
              ["1", "Personal referral link"],
            ].map(([figure, label], i) => (
              <Reveal key={label} delay={i * 90} className={i ? "sm:pl-8" : ""}>
                <p className="font-serif text-5xl leading-none text-primary tabular-nums sm:text-6xl">{figure}</p>
                <p className="mt-3 text-[0.7rem] tracking-[0.22em] text-muted-foreground uppercase">{label}</p>
              </Reveal>
            ))}
          </div>
          <Reveal delay={220}>
            <p className="mt-14 font-serif text-2xl text-accent sm:text-3xl">Your effort. Your growth.</p>
          </Reveal>
        </div>
      </section>

      {/* 3 — THE OPPORTUNITY -------------------------------------------- */}
      <section className="border-t border-border bg-secondary/35 py-20 sm:py-28">
        <div className={SHELL}>
          <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
            <Reveal>
              <p className="eyebrow">The opportunity</p>
              <h2 className="mt-5 max-w-[14ch] font-serif text-4xl leading-[1.05] text-primary sm:text-5xl">
                Same people.
                <br />A bigger opportunity.
              </h2>
              <p className="mt-7 max-w-xl text-lg leading-relaxed text-foreground/75">
                You already have conversations. You already know people. The Natural State Ambassador Program gives
                those relationships a way to create additional income while helping grow a recognizable Arkansas brand.
              </p>
              <dl className="mt-12 grid gap-9">
                {[
                  ["Personal referral link + QR", "Easy to share. Easy to track."],
                  [
                    "Private Ambassador Dashboard",
                    "See qualifying sales, attributed customers, current rank, commissions, and payout history.",
                  ],
                  [
                    "Performance-based commission",
                    "Your commission rate can grow as your qualifying monthly sales increase.",
                  ],
                  [
                    "Repeat-order potential",
                    "Eligible customers you introduce may remain attributed to you according to the Ambassador Program terms.",
                  ],
                ].map(([term, detail], i) => (
                  <Reveal key={term} delay={i * 70}>
                    <dt className="text-[0.7rem] tracking-[0.2em] text-primary uppercase">{term}</dt>
                    <dd className="mt-2 max-w-lg leading-relaxed text-muted-foreground">{detail}</dd>
                  </Reveal>
                ))}
              </dl>
            </Reveal>

            <Reveal delay={120} className="lg:sticky lg:top-28 lg:self-start">
              <figure className="relative overflow-hidden rounded-lg">
                <img
                  src={lakeImage}
                  alt="Mist over a lake at sunrise in the Ouachita Mountains of Arkansas"
                  width={1920}
                  height={720}
                  loading="lazy"
                  className="h-[26rem] w-full object-cover object-center transition-transform duration-[1200ms] ease-out hover:scale-[1.03] sm:h-[34rem]"
                />
                <figcaption
                  className="absolute inset-x-0 bottom-0 p-8 sm:p-10"
                  style={{ background: "linear-gradient(0deg, oklch(0.244 0.045 160 / 0.85) 0%, transparent 100%)" }}
                >
                  <p className="font-serif text-2xl leading-tight text-ivory sm:text-3xl">
                    Build something local
                    <br />
                    that can grow beyond local.
                  </p>
                </figcaption>
              </figure>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 4 + 5 — EARNING POTENTIAL & CALCULATOR -------------------------- */}
      <section className="bg-forest py-20 text-ivory sm:py-28">
        <div className={SHELL}>
          <Reveal>
            <p className={EYEBROW_DARK}>Your earning potential</p>
            <h2 className="mt-5 max-w-[18ch] font-serif text-4xl leading-[1.05] text-ivory sm:text-5xl">
              The more value you create,
              <br className="hidden sm:block" /> the more you can earn.
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ivory/70">
              Our performance-based commission structure rewards consistent qualifying sales and growth.
            </p>
          </Reveal>

          <div className="mt-14">
            <div className="hidden grid-cols-[1fr_auto_auto] gap-8 pb-4 text-[0.68rem] tracking-[0.2em] text-ivory/70 uppercase sm:grid">
              <span>Monthly qualifying sales</span>
              <span className="text-right">Commission</span>
              <span className="w-40 text-right">Illustrative commission</span>
            </div>
            <ul>
              {PUBLIC_TIERS.map((t, i) => {
                const featured = t.from >= 5000;
                return (
                  <Reveal
                    as="li"
                    key={t.from}
                    delay={i * 60}
                    className={
                      "grid grid-cols-2 items-baseline gap-x-6 gap-y-2 border-t border-ivory/12 py-6 sm:grid-cols-[1fr_auto_auto] sm:gap-8 " +
                      (featured ? "border-l-2 border-l-gold pl-5 sm:pl-6" : "")
                    }
                  >
                    <span
                      className={
                        "font-serif text-3xl tabular-nums sm:text-4xl " + (featured ? "text-ivory" : "text-ivory/85")
                      }
                    >
                      {dollars(t.example)}
                      {t.top ? "+" : ""}
                    </span>
                    <span
                      className={
                        "justify-self-end text-right text-lg tabular-nums sm:text-xl " +
                        (featured ? "text-gold" : "text-ivory/70")
                      }
                    >
                      {t.rate}%
                    </span>
                    <span
                      className={
                        "col-span-2 font-serif text-3xl tabular-nums sm:col-span-1 sm:w-40 sm:justify-self-end sm:text-right sm:text-4xl " +
                        (featured ? "text-gold" : "text-ivory")
                      }
                    >
                      {dollars((t.example * t.rate) / 100)}
                      {t.top ? "+" : ""}
                    </span>
                  </Reveal>
                );
              })}
            </ul>
            <p className="mt-8 max-w-3xl text-sm leading-relaxed text-ivory/72">
              Illustrative examples only. Earnings are not guaranteed. Actual earnings depend on qualifying completed
              sales, applicable commission tiers, cancellations, returns, and Ambassador Program terms. Ambassadors are
              compensated for qualifying sales, not recruitment.
            </p>
          </div>

          <EarningsCalculator />

          <Reveal className="mt-14">
            <a href="#apply" className={CTA_ON_DARK}>
              Apply to become an Ambassador →
            </a>
          </Reveal>
        </div>
      </section>

      {/* 6 — THE STANDARD ------------------------------------------------ */}
      <section className="bg-secondary/35 py-20 sm:py-28">
        <div className={SHELL}>
          <Reveal className="max-w-2xl">
            <p className="eyebrow">The Natural State standard</p>
            <h2 className="mt-5 font-serif text-4xl leading-[1.05] text-primary sm:text-5xl">
              We're not looking for everyone.
            </h2>
            <p className="mt-7 text-lg leading-relaxed text-foreground/75">
              We're building a selective group of people who represent Natural State thoughtfully, communicate clearly,
              and understand that long-term trust matters more than a quick sale.
            </p>
          </Reveal>

          <div className="mt-16 grid gap-12 md:grid-cols-3 md:gap-10">
            {[
              ["You know people.", "You have genuine relationships, an audience, a community, or a professional network."],
              ["You communicate well.", "You can share information responsibly without exaggeration."],
              ["You want to build.", "You're interested in growing something over time rather than sharing a link once."],
            ].map(([head, body], i) => (
              <Reveal key={head} delay={i * 90}>
                <h3 className="font-serif text-2xl leading-tight text-primary sm:text-3xl">{head}</h3>
                <p className="mt-4 leading-relaxed text-muted-foreground">{body}</p>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-16 flex flex-col gap-5 sm:flex-row sm:items-center">
            <p className="font-serif text-2xl text-primary">Think that's you?</p>
            <a href="#apply" className={CTA_LIGHT}>
              Apply to become an Ambassador →
            </a>
          </Reveal>
        </div>
      </section>

      {/* 7 — HOW IT WORKS ------------------------------------------------ */}
      <section className="bg-background py-20 sm:py-28">
        <div className={SHELL}>
          <Reveal>
            <p className="eyebrow">How it works</p>
            <h2 className="mt-5 font-serif text-4xl leading-[1.05] text-primary sm:text-5xl">
              Simple. Transparent. Trackable.
            </h2>
          </Reveal>
          <ol className="mt-16 grid gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
            {[
              ["01", "Apply", "Tell us about yourself, your network, and how you would represent Natural State."],
              ["02", "Get approved", "Approved ambassadors receive program terms, an account, and approved resources."],
              ["03", "Share", "Use your personal referral link, QR code, and approved Natural State materials."],
              [
                "04",
                "Grow",
                "Track qualifying sales, attributed customers, rank, commission, and progress through your Ambassador Dashboard.",
              ],
            ].map(([n, head, body], i) => (
              <Reveal as="li" key={n} delay={i * 80}>
                <p className="font-serif text-3xl text-accent tabular-nums">{n}</p>
                <h3 className="mt-4 text-[0.72rem] tracking-[0.2em] text-primary uppercase">{head}</h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">{body}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* 8 — DASHBOARD --------------------------------------------------- */}
      <section className="border-y border-border bg-secondary/35 py-20 sm:py-28">
        <div className={SHELL}>
          <div className="grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center lg:gap-16">
            <Reveal>
              <p className="eyebrow">Your dashboard</p>
              <h2 className="mt-5 font-serif text-4xl leading-[1.05] text-primary sm:text-5xl">
                Know exactly where you stand.
              </h2>
              <p className="mt-7 max-w-lg text-lg leading-relaxed text-foreground/75">
                Your Ambassador Dashboard keeps your performance in one place — qualifying sales, attributed customers,
                rank, commission history, and payout information.
              </p>
            </Reveal>
            <Reveal delay={120}>
              <DashboardPreview />
            </Reveal>
          </div>
        </div>
      </section>

      {/* 9 — WHY NATURAL STATE ------------------------------------------- */}
      <section className="bg-forest py-20 text-ivory sm:py-28">
        <div className={SHELL}>
          <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-20">
            <Reveal>
              <h2 className="max-w-[16ch] font-serif text-4xl leading-[1.05] text-ivory sm:text-5xl">
                Something worth putting
                <br className="hidden sm:block" /> your name behind.
              </h2>
              <dl className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-8">
                {[
                  ["Arkansas roots", "A recognizable local identity built in the Natural State."],
                  ["Transparency", "Clear information, documentation, and responsible communication."],
                  [
                    "Long-term brand",
                    "A consistent identity built around education, accountability, relationships, and trust.",
                  ],
                ].map(([term, detail], i) => (
                  <Reveal key={term} delay={i * 90}>
                    <dt className="text-[0.7rem] tracking-[0.2em] text-gold uppercase">{term}</dt>
                    <dd className="mt-3 leading-relaxed text-ivory/70">{detail}</dd>
                  </Reveal>
                ))}
              </dl>
              <p className="script mt-14 text-4xl text-gold sm:text-5xl">Keep It Natural.</p>
            </Reveal>
            <Reveal delay={140} className="justify-self-center">
              <img
                src={arkansasMark}
                alt="The state of Arkansas rendered as a gold-framed window onto a sunrise over forested ridges"
                width={900}
                height={1139}
                loading="lazy"
                className="w-52 opacity-90 drop-shadow-[0_24px_48px_rgba(0,0,0,0.35)] sm:w-64 lg:w-72"
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* 10 — BRAND STANDARDS -------------------------------------------- */}
      <section className="bg-background py-20 sm:py-28">
        <div className={SHELL}>
          <Reveal className="max-w-2xl">
            <p className="eyebrow">Protecting the brand</p>
            <h2 className="mt-5 font-serif text-4xl leading-[1.05] text-primary sm:text-5xl">
              Trust is part of the partnership.
            </h2>
            <p className="mt-7 text-lg leading-relaxed text-foreground/75">
              Strong brands are built through responsible communication. Natural State Ambassadors are expected to
              represent the company accurately, transparently, and consistently.
            </p>
          </Reveal>
          <dl className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {[
              ["Be accurate", "Do not make claims that are unsupported or inconsistent with approved materials."],
              ["Be transparent", "Clearly disclose your financial relationship when promoting Natural State."],
              ["Be responsible", "Keep communication consistent with current program standards and approved materials."],
              ["Be genuine", "No spam, fabricated testimonials, deceptive promotion, or misleading earnings claims."],
            ].map(([term, detail], i) => (
              <Reveal key={term} delay={i * 70}>
                <dt className="text-[0.72rem] tracking-[0.2em] text-primary uppercase">{term}</dt>
                <dd className="mt-3 leading-relaxed text-muted-foreground">{detail}</dd>
              </Reveal>
            ))}
          </dl>
          <Reveal className="mt-12">
            <Link to="/terms" className="text-sm text-primary underline underline-offset-8 transition-colors hover:text-accent">
              Read full Ambassador Standards →
            </Link>
          </Reveal>
        </div>
      </section>

      {/* 11 — APPLICATION ------------------------------------------------ */}
      <section id="apply" className="scroll-mt-24 border-t border-border bg-secondary/35">
        <div className="grid lg:grid-cols-2">
          <div className="relative min-h-[16rem] lg:min-h-full">
            <img
              src={heroImage}
              alt="Sunrise over the Ouachita Mountains and a still Arkansas lake"
              width={1920}
              height={1080}
              loading="lazy"
              className="absolute inset-0 size-full object-cover object-center"
            />
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(180deg, oklch(0.244 0.045 160 / 0.55) 0%, oklch(0.244 0.045 160 / 0.8) 100%)" }}
            />
            <div className="relative flex h-full flex-col justify-end p-8 sm:p-12 lg:p-16">
              <p className="script text-4xl text-gold sm:text-5xl">Keep It Natural.</p>
              <p className="mt-5 max-w-sm leading-relaxed text-ivory/80">
                Applications are reviewed individually. We'll be in touch if there's a fit.
              </p>
            </div>
          </div>
          <div className="px-5 py-16 sm:px-8 sm:py-20 lg:px-16">
            <Reveal className="mx-auto max-w-xl">
              <p className="eyebrow">Become an Ambassador</p>
              <h2 className="mt-5 font-serif text-4xl leading-[1.05] text-primary sm:text-5xl">
                Ready to build something?
              </h2>
              <p className="mt-5 leading-relaxed text-muted-foreground">
                Apply to join the Natural State Ambassador Program.
              </p>
              <div className="mt-10">
                <AmbassadorApplication />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 12 — FINAL BRAND MOMENT ----------------------------------------- */}
      <section className="relative isolate overflow-hidden bg-forest">
        <img
          src={lakeImage}
          alt=""
          width={1920}
          height={720}
          loading="lazy"
          className="absolute inset-0 -z-20 size-full object-cover object-center"
        />
        <div
          className="absolute inset-0 -z-10"
          style={{ background: "linear-gradient(180deg, oklch(0.244 0.045 160 / 0.72) 0%, oklch(0.244 0.045 160 / 0.92) 100%)" }}
        />
        <div className={SHELL + " relative flex flex-col items-center py-24 text-center sm:py-32"}>
          <Reveal>
            <p className="script text-5xl text-gold sm:text-7xl">Keep It Natural.</p>
            <p className="mt-8 font-serif text-3xl leading-tight text-ivory sm:text-4xl">
              Build something you're proud to represent.
            </p>
            <div className="mt-10 flex justify-center">
              <a href="#apply" className={CTA_ON_DARK}>
                Become a Natural State Ambassador →
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

/** Illustrative preview of the real Ambassador Dashboard. */
function DashboardPreview() {
  const progress = (4275 / 5000) * 100;
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-lift">
      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-7">
        <p className="font-serif text-lg text-primary">Ambassador Dashboard</p>
        <p className="text-[0.65rem] tracking-[0.2em] text-muted-foreground uppercase">September</p>
      </div>
      <div className="grid gap-px bg-border sm:grid-cols-2">
        {[
          ["Qualifying sales", "$4,275", "31 attributed customers"],
          ["Current commission", "20%", "8 eligible repeat orders"],
        ].map(([label, value, sub]) => (
          <div key={label} className="bg-card px-5 py-6 sm:px-7">
            <p className="text-[0.65rem] tracking-[0.2em] text-muted-foreground uppercase">{label}</p>
            <p className="mt-2 font-serif text-4xl text-primary tabular-nums">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>
      <div className="border-t border-border px-5 py-6 sm:px-7">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[0.65rem] tracking-[0.2em] text-muted-foreground uppercase">Next level</p>
          <p className="text-sm text-primary tabular-nums">$725 to 22.5%</p>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-gold" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="grid gap-px border-t border-border bg-border sm:grid-cols-2">
        {[
          ["Illustrative commission", "$855"],
          ["Paid to date", "$3,140"],
        ].map(([label, value]) => (
          <div key={label} className="bg-card px-5 py-5 sm:px-7">
            <p className="text-[0.65rem] tracking-[0.2em] text-muted-foreground uppercase">{label}</p>
            <p className="mt-1.5 font-serif text-2xl text-primary tabular-nums">{value}</p>
          </div>
        ))}
      </div>
      <p className="bg-secondary/60 px-5 py-3 text-center text-[0.68rem] text-muted-foreground sm:px-7">
        Example figures shown for illustration.
      </p>
    </div>
  );
}
