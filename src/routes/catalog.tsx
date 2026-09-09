import { createFileRoute } from "@tanstack/react-router";
import { CatalogPage } from "@/components/catalog-page";

const title = "Catalog — Natural State Peptides";
const description =
  "Browse the current Natural State Peptides research catalog, including peptides, blends, and research compounds with available testing documentation.";

export const Route = createFileRoute("/catalog")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: CatalogPage,
});
