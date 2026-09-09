import { createFileRoute } from "@tanstack/react-router";
import { CatalogPage } from "@/components/catalog-page";

const title = "Natural State Peptides — Research Peptide Catalog";
const description =
  "Explore research compounds from Natural State Peptides. Check product availability and request available testing documentation.";

export const Route = createFileRoute("/")({
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
