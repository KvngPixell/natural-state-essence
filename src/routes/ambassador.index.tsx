import { createFileRoute, Link } from "@tanstack/react-router";
import { InquiryForm } from "@/components/inquiry-form";
import { panel, outline } from "@/lib/backend";
export const Route = createFileRoute("/ambassador/")({
  head: () => ({
    meta: [
      { title: "Natural State Ambassadors — Apply or Sign In" },
      {
        name: "description",
        content:
          "Become a Natural State Ambassador. Approved ambassadors receive a personal referral link, a private dashboard, and a clear record of attributed customers, sales, commissions and payouts.",
      },
    ],
  }),
  component: Ambassador,
});
function Ambassador() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_.8fr]">
        <div>
          <p className="eyebrow">Natural State Ambassadors</p>
          <h1 className="mt-4 font-serif text-5xl leading-tight text-primary sm:text-6xl">
            Your voice.
            <br />
            Our shared standards.
          </h1>
          <p className="mt-6 max-w-xl leading-relaxed text-muted-foreground">
            We welcome thoughtful creators and research-focused communities. Tell us about your
            audience and how you would represent Natural State.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="#apply"
              className="rounded-lg bg-primary px-6 py-3 text-sm text-primary-foreground"
            >
              Apply to be an ambassador
            </a>
            <Link to="/ambassador/login" className={outline}>
              Ambassador login
            </Link>
          </div>
        </div>
        <div className={panel + " self-center"}>
          <h2 className="font-serif text-3xl">What ambassadors receive</h2>
          <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
            <li>A personal referral link, code and QR code to share</li>
            <li>A private dashboard with your rank and progress for the month</li>
            <li>Every recorded sale you're credited for, and the customers attributed to you</li>
            <li>Monthly commission statements and a full payout history</li>
            <li>Brand guidance and approved language</li>
          </ul>
          <p className="mt-6 text-xs">
            Access is issued after approval. Commission rates and payout timing are confirmed with
            you before you start.
          </p>
        </div>
      </div>
      <div className="my-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["01", "Apply", "Share your public channels and proposed approach."],
          ["02", "Review", "The team reviews your application and confirms terms."],
          ["03", "Share your link", "Customers who come through your link or code are credited to you."],
          ["04", "Earn on recorded sales", "Paid orders are recorded by our team and appear in your dashboard."],
        ].map(([n, t, c]) => (
          <div className={panel} key={n}>
            <p className="text-accent">{n}</p>
            <h2 className="mt-3 font-serif text-2xl">{t}</h2>
            <p className="mt-3 text-sm text-muted-foreground">{c}</p>
          </div>
        ))}
      </div>
      <div className={panel + " mb-12"}>
        <h2 className="font-serif text-3xl">How commission works</h2>
        <div className="mt-6 grid gap-6 text-sm text-muted-foreground md:grid-cols-3">
          <div>
            <h3 className="font-medium text-primary">New customers</h3>
            <p className="mt-2">
              When a first-time customer is introduced through your link or code, their first
              purchase earns commission at your rank for that month.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-primary">Ranks that rise with you</h3>
            <p className="mt-2">
              Your rank is set by your total qualified sales in the calendar month. When you reach a
              higher rank, it applies to every new-customer sale that month — not just the ones after.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-primary">Returning customers</h3>
            <p className="mt-2">
              Customers you introduce stay attributed to you, and their repeat orders earn a
              residual commission for a set period that also counts toward your rank.
            </p>
          </div>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Commission is paid on product amounts actually received — not shipping, tax, discounts,
          refunds, your own purchases, or clicks. Earnings depend entirely on real sales; we make no
          income promises.
        </p>
      </div>
      <div id="apply" className="grid scroll-mt-24 gap-10 lg:grid-cols-2">
        <div>
          <h2 className="font-serif text-4xl">Represent the brand responsibly.</h2>
          <p className="mt-5 leading-relaxed text-muted-foreground">
            Keep communication focused on legitimate research information and the actual catalog.
            Clearly disclose your financial relationship near endorsements.
          </p>
          <ul className="mt-6 list-disc space-y-3 pl-5 text-sm text-muted-foreground">
            <li>
              No human-use guidance, dosing, treatment promises or unsupported testing claims.
            </li>
            <li>No spam, fabricated reviews or misleading income claims.</li>
            <li>
              Commissions depend on qualifying recorded paid sales, not clicks or copied inquiries.
            </li>
          </ul>
          <p className="mt-6 text-sm text-muted-foreground">
            Have an account already?{" "}
            <Link to="/ambassador/login" className="underline">
              Sign in here.
            </Link>
          </p>
        </div>
        <div className={panel}>
          <h2 className="mb-6 font-serif text-3xl">Start the conversation</h2>
          <InquiryForm initialKind="application" />
        </div>
      </div>
    </section>
  );
}
