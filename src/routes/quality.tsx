import { createFileRoute } from "@tanstack/react-router";
import { FileText, ScanLine, FlaskConical, Layers } from "lucide-react";
import { InquiryForm } from "@/components/inquiry-form";
import { panel } from "@/lib/backend";
export const Route = createFileRoute("/quality")({
  head: () => ({
    meta: [
      { title: "Quality & Documentation — Natural State Peptides" },
      {
        name: "description",
        content:
          "Request available product documentation and understand report source, product matching and lot references.",
      },
    ],
  }),
  component: Quality,
});
const cards = [
  {
    icon: FlaskConical,
    title: "Product match",
    copy: "Confirm the compound and strength shown on the report.",
  },
  {
    icon: ScanLine,
    title: "Lot reference",
    copy: "Ask whether the report applies to the lot supplied.",
  },
  {
    icon: Layers,
    title: "Report source",
    copy: "Distinguish supplier-provided reports from testing commissioned by Natural State.",
  },
  {
    icon: FileText,
    title: "Report details",
    copy: "Check the issuing lab, report date and tests actually reported.",
  },
];
function Quality() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
      <div className="max-w-3xl">
        <p className="eyebrow">Quality & Documentation</p>
        <h1 className="mt-4 font-serif text-5xl leading-tight text-primary sm:text-6xl">
          Know the documentation behind your research material.
        </h1>
        <p className="mt-6 max-w-2xl leading-relaxed text-muted-foreground">
          Request the documentation available for your product. Include the compound, strength, and
          any lot reference so we can clarify which report applies.
        </p>
      </div>
      <div className="my-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ icon: Icon, title, copy }) => (
          <div key={title} className={panel}>
            <Icon className="size-6 text-accent" strokeWidth={1.4} />
            <h2 className="mt-4 font-serif text-2xl">{title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{copy}</p>
          </div>
        ))}
      </div>
      <div className="grid items-start gap-10 lg:grid-cols-[.85fr_1.15fr]">
        <div>
          <h2 className="font-serif text-3xl">Know the source</h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Supplier-provided documentation and testing commissioned by Natural State Peptides are
            different. Ask us to identify the source and scope of the report available for your
            product. Documentation availability varies.
          </p>
          {[
            [
              "Are COAs public?",
              "We share available documentation upon request. There is no public report library at this time.",
            ],
            [
              "Does every product have the same documentation?",
              "No universal testing coverage is implied. Ask which documents are available for the specific compound and lot.",
            ],
            [
              "What if my vial has no lot reference?",
              "Include the product name and strength. We can clarify which documentation is available and its scope.",
            ],
            [
              "Does a report cover every lot?",
              "A report applies to the sample described in it. It should not be treated as verification of every product or lot.",
            ],
          ].map(([q, a]) => (
            <details className="mt-5 border-b border-border pb-5" key={q}>
              <summary className="cursor-pointer text-sm font-medium">{q}</summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
        <div className={panel}>
          <p className="eyebrow">Request documentation</p>
          <h2 className="mt-3 mb-6 font-serif text-3xl">Tell us what you need.</h2>
          <InquiryForm initialKind="coa" />
        </div>
      </div>
    </section>
  );
}
