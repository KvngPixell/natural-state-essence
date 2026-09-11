import { createFileRoute } from "@tanstack/react-router";
import { getProductBySlug } from "@/data/products";
import { InquiryForm } from "@/components/inquiry-form";
import { panel } from "@/lib/backend";
export const Route = createFileRoute("/contact")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { product?: string | undefined; intent?: string | undefined } => ({
    product:
      typeof s["product"] === "string" && getProductBySlug(s["product"]) ? s["product"] : undefined,
    intent:
      typeof s["intent"] === "string" &&
      ["coa", "product", "ambassador", "partnership", "application", "availability"].includes(s["intent"])
        ? s["intent"]
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Contact — Natural State Peptides" },
      {
        name: "description",
        content:
          "Ask about our research catalog, request documentation, or apply to become a Natural State ambassador.",
      },
    ],
  }),
  component: Contact,
});
function Contact() {
  const s = Route.useSearch();
  return (
    <section className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[.8fr_1fr]">
      <div>
        <p className="eyebrow">Natural State Peptides</p>
        <h1 className="mt-5 font-serif text-5xl text-primary">A clear next step.</h1>
        <p className="mt-6 leading-relaxed text-muted-foreground">
          Product questions, documentation requests and ambassador applications. Tell us what you need so we
          can help you find the right information.
        </p>
        <div className="rule-gold my-8" />
        <h2 className="font-serif text-2xl">Make your request specific</h2>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Include the compound and strength. For documentation, add a lot reference if one is
          available. Reports are shared upon request, where available.
        </p>
        <p className="mt-8 text-sm text-primary">Arkansas, USA · Laboratory research only</p>
      </div>
      <div className={panel}>
        <InquiryForm
          initialProduct={s.product ?? ""}
          initialKind={s.intent === "ambassador" || s.intent === "partnership" ? "application" : (s.intent ?? "product")}
        />
      </div>
    </section>
  );
}
