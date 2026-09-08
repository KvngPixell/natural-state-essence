import { createFileRoute } from "@tanstack/react-router";
import { SimplePage } from "@/components/simple-page";

const title = "Quality & Testing — Natural State Peptides";
const description =
  "How Natural State Peptides approaches third-party testing, purity verification, and transparent documentation for research compounds.";

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
      intro="This page is a placeholder. Full testing and documentation details will be published here."
    >
      <p>
        Planned content includes our third-party testing approach, purity verification process,
        documentation standards, and a COA lookup tool.
      </p>
      <p>
        No purity figures, certifications, or laboratory results are stated until verified
        documentation is available.
      </p>
    </SimplePage>
  ),
});
