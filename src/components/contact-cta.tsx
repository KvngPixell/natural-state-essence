import { Link } from "@tanstack/react-router";

export function ContactCta() {
  return (
    <section className="bg-primary">
      <div className="mx-auto max-w-3xl px-5 py-24 text-center sm:px-8">
        <div className="rule-gold mx-auto" />
        <h2 className="mt-8 font-serif text-4xl text-primary-foreground sm:text-5xl">
          Questions about our catalog?
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-primary-foreground/75">
          Contact Natural State Peptides for product information, testing documentation,
          partnerships, or general inquiries.
        </p>
        <Link
          to="/contact"
          className="mt-9 inline-flex rounded-md border border-accent bg-accent px-7 py-3.5 text-sm text-primary transition-opacity hover:opacity-90"
        >
          Get in Touch
        </Link>
      </div>
    </section>
  );
}
