import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const navLinks = [
  { to: "/catalogue", label: "Catalogue" },
  { to: "/quality", label: "Quality & Testing" },
  { to: "/ambassador", label: "Ambassador" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/95 backdrop-blur">
      <div className="mx-auto grid h-20 max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 sm:px-8 lg:h-22">
        <Link to="/" className="min-w-0" aria-label="Natural State Peptides home">
          {/* Temporary text logo — swap for the final brand mark later */}
          <span className="block truncate font-serif text-xl leading-none text-primary sm:text-2xl">
            Natural State Peptides
          </span>
          <span className="mt-1 hidden text-[0.6rem] tracking-[0.3em] text-accent uppercase sm:block">
            Arkansas
          </span>
        </Link>

        <nav className="hidden items-center gap-9 lg:flex" aria-label="Main">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm text-primary/80 transition-colors hover:text-accent"
              activeProps={{ className: "text-accent" }}
            >
              {l.label}
            </Link>
          ))}
          <Link
            to="/contact"
            className="rounded-md bg-primary px-5 py-2.5 text-sm text-primary-foreground transition-opacity hover:opacity-90"
          >
            Contact Us
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="shrink-0 rounded-md border border-border p-2 text-primary lg:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-border bg-background lg:hidden" aria-label="Mobile">
          <div className="mx-auto flex max-w-7xl flex-col px-5 py-3 sm:px-8">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="border-b border-border/60 py-4 text-base text-primary last:border-0"
              >
                {l.label}
              </Link>
            ))}
            <Link
              to="/contact"
              onClick={() => setOpen(false)}
              className="mt-4 mb-2 rounded-md bg-primary px-5 py-3 text-center text-sm text-primary-foreground"
            >
              Contact Us
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
