import type { ReactNode } from "react";
import { ContactCta } from "@/components/contact-cta";

export function SimplePage({
  eyebrow,
  heading,
  intro,
  children,
}: {
  eyebrow: string;
  heading: string;
  intro: string;
  children?: ReactNode;
}) {
  return (
    <>
      <section className="mx-auto max-w-3xl px-5 py-24 sm:px-8">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-4 font-serif text-5xl text-primary sm:text-6xl">{heading}</h1>
        <div className="rule-gold mt-6" />
        <p className="mt-7 text-base leading-relaxed text-foreground/75">{intro}</p>
        <div className="mt-8 space-y-5 text-base leading-relaxed text-foreground/75">
          {children}
        </div>
      </section>
      <ContactCta />
    </>
  );
}
