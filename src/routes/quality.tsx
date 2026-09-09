import { createFileRoute, Link } from "@tanstack/react-router";
import { SimplePage } from "@/components/simple-page";

const title = "Quality & Testing — Natural State Peptides";
const description =
  "Request available product documentation and learn what to check in a certificate of analysis.";

export const Route = createFileRoute("/quality")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: () => (
    <SimplePage
      eyebrow="Quality & Testing"
      heading="Testing Information"
      intro="Product documentation is shared upon request, where available. Contact us with the product name, strength, and any lot reference so we can clarify which documentation applies."
    >
      <h2 className="font-serif text-3xl text-primary">Know the source</h2>
      <p>
        A supplier-provided report is different from independent testing commissioned by Natural
        State Peptides. Request the report source, issuing laboratory, date, and applicable product
        or lot. A report for one sample should not be treated as verification of every product or
        lot.
      </p>
      <h2 className="pt-5 font-serif text-3xl text-primary">Request the details</h2>
      <p>
        Ask which reports are available and what they cover. If you have a vial, include its product
        name, strength, and lot reference when present. We do not currently publish a public COA
        library.
      </p>
      <Link
        to="/contact"
        search={{ intent: "coa" }}
        className="mt-4 inline-flex justify-center rounded-md bg-primary px-7 py-3.5 text-sm text-primary-foreground hover:opacity-90"
      >
        Request COA
      </Link>
    </SimplePage>
  ),
});
