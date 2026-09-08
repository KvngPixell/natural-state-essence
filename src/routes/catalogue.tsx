import { createFileRoute } from "@tanstack/react-router";
import { CataloguePage } from "@/components/catalogue-page";

const title = "Catalogue — Natural State Peptides";
const description =
  "Browse the current Natural State Peptides research catalogue, including peptides, blends, and research compounds with available testing documentation.";

export const Route = createFileRoute("/catalogue")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: CataloguePage,
});
