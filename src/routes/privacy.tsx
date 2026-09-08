import { createFileRoute } from "@tanstack/react-router";
import { SimplePage } from "@/components/simple-page";

const title = "Privacy Policy — Natural State Peptides";
const description = "Privacy policy placeholder for Natural State Peptides.";

export const Route = createFileRoute("/privacy")({
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
      heading="Privacy Policy"
      intro="This page is a placeholder. Final privacy language will be added here."
    />
  ),
});
