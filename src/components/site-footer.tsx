import { Link } from "@tanstack/react-router";
import { Instagram, Send, Twitter } from "lucide-react";

const links = [
  { to: "/catalog", label: "Catalog" },
  { to: "/quality", label: "Quality & Testing" },
  { to: "/ambassador", label: "Ambassador" },
  { to: "/contact", label: "Contact" },
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
] as const;

export function SiteFooter() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-serif text-2xl">Natural State Peptides</p>
          <div className="rule-gold mt-4" />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-primary-foreground/75">
            An Arkansas-based research supplier focused on transparent testing, consistent
            standards, and accessible documentation for research professionals.
          </p>
          <p className="mt-6 font-serif text-lg text-accent">Keep it natural.</p>
        </div>

        <nav aria-label="Footer">
          <p className="text-[0.68rem] tracking-[0.22em] text-accent uppercase">Explore</p>
          <ul className="mt-5 space-y-3 text-sm">
            {links.map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  className="text-primary-foreground/75 transition-colors hover:text-accent"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="text-[0.68rem] tracking-[0.22em] text-accent uppercase">Connect</p>
          <div className="mt-5 flex gap-3">
            {[Instagram, Twitter, Send].map((Icon, i) => (
              <span
                key={i}
                aria-hidden
                className="grid size-10 place-items-center rounded-md border border-primary-foreground/20 text-primary-foreground/70"
              >
                <Icon className="size-4" />
              </span>
            ))}
          </div>
          <p className="mt-5 text-sm text-primary-foreground/60">
            Social links coming soon (placeholder).
          </p>
        </div>
      </div>

      <div className="border-t border-primary-foreground/15">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-xs text-primary-foreground/60 sm:flex-row sm:justify-between sm:px-8">
          <p>© {new Date().getFullYear()} Natural State Peptides. All rights reserved.</p>
          <p>For laboratory research use only. Not for human consumption.</p>
        </div>
      </div>
    </footer>
  );
}
