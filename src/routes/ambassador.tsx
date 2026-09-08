import { createFileRoute } from "@tanstack/react-router";
import { SimplePage } from "@/components/simple-page";

const title = "Ambassador Program — Natural State Peptides";
const description =
  "Information about the upcoming Natural State Peptides ambassador and partnership program.";

export const Route = createFileRoute("/ambassador")({
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
      eyebrow="Ambassador"
      heading="Ambassador Program"
      intro="This page is a placeholder. Program details will be published here."
    >
      <p>
        For partnership or ambassador inquiries in the meantime, please reach out through the
        contact page.
      </p>
    </SimplePage>
  ),
});
