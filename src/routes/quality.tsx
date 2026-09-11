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
          "How to read a certificate of analysis: which lab issued it, which lot it covers, what HPLC and mass spectrometry each establish, and the signs worth questioning. Plus how to request documentation from Natural State Peptides.",
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
/** Anatomy of a certificate of analysis. Written to be useful whoever you buy
 *  from — the closing section invites the reader to hold us to it too. */
const anatomy: [string, string][] = [
  [
    "Who issued it",
    "A report is only as independent as the lab that produced it. A manufacturer testing its own material is not third-party testing, however official the document looks. Look for a named laboratory, and ideally an accreditation such as ISO 17025, which means the lab's methods themselves have been audited.",
  ],
  [
    "Which lot it covers",
    "This is the detail that connects a document to the vial in your hand. A lot or batch number on the report should match the one on the label. Without that link, a report describes a sample you have no way of connecting to your material.",
  ],
  [
    "When it was issued",
    "A date tells you whether the report describes current inventory or a batch from years ago. An old report is not necessarily a bad one, but it should correspond to the material actually being supplied.",
  ],
  [
    "What was measured",
    "Purity and identity are different questions, answered by different methods. HPLC separates a sample into its components and reports what proportion is the target compound — that is a purity figure. Mass spectrometry measures molecular weight to confirm the compound is what it claims to be — that is identity. A purity number alone does not establish identity.",
  ],
  [
    "What was not measured",
    "Most reports in this market cover purity and identity only. Sterility, endotoxin, residual solvents, and heavy metals are separate tests and are frequently absent. Their absence is not necessarily a problem, but it is worth knowing rather than assuming.",
  ],
];

const redFlags = [
  "No lot number, or a lot number that does not match the label",
  "No named laboratory, or a lab that cannot be found to exist",
  "A cropped or screenshotted report rather than the full document",
  "The same report reused across several different products",
  "A report labelled as a sample or example",
  "A purity figure quoted in marketing with no document behind it",
];

function ReadingACoa() {
  return (
    <div className="my-16 border-y border-border py-14">
      <div className="max-w-3xl">
        <p className="eyebrow">A short guide</p>
        <h2 className="mt-3 font-serif text-4xl text-primary">
          How to read a certificate of analysis
        </h2>
        <p className="mt-5 leading-relaxed text-muted-foreground">
          A certificate of analysis describes one sample, tested once, on one date. It is evidence
          about that sample — not a guarantee covering every vial a supplier holds. Reading one
          properly takes about a minute, and the same five questions work whoever you buy from.
        </p>
      </div>

      <div className="mt-10 grid gap-x-10 gap-y-8 lg:grid-cols-2">
        <ol className="grid gap-6">
          {anatomy.map(([title, body], i) => (
            <li key={title} className="grid grid-cols-[2rem_1fr] gap-4">
              <span className="pt-1 font-serif text-lg text-accent tabular-nums">{i + 1}</span>
              <div>
                <h3 className="font-medium text-primary">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="grid content-start gap-6">
          <div className={panel}>
            <h3 className="font-serif text-2xl text-primary">Signs worth questioning</h3>
            <ul className="mt-4 grid gap-3">
              {redFlags.map((f) => (
                <li
                  key={f}
                  className="border-b border-border pb-3 text-sm leading-relaxed text-muted-foreground last:border-0 last:pb-0"
                >
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className={panel}>
            <h3 className="font-serif text-2xl text-primary">Ask any supplier four questions</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Which lab issued the report? What date? Which lot does it cover? What was actually
              tested?
            </p>
            <p className="mt-4 text-sm leading-relaxed text-primary">
              Including us. If a supplier cannot answer those four about their own documentation,
              that is itself the answer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

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
      <ReadingACoa />

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
