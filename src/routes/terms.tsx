import { createFileRoute } from "@tanstack/react-router";
import { SimplePage } from "@/components/simple-page";

const title = "Terms — Natural State Peptides";
const description = "Terms of use placeholder for Natural State Peptides.";

export const Route = createFileRoute("/terms")({
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
      eyebrow="Legal"
      heading="Terms of Use"
      intro="This page is a placeholder. Final terms language will be added here."
    />
  ),
});
