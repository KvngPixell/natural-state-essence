import { createFileRoute, Link } from "@tanstack/react-router";
import { OrderForm } from "@/components/order-form";
import { RESEARCH_DISCLAIMER } from "@/data/products";

const title = "Your Order Request — Natural State Peptides";
const description =
  "Review the products you've added, then send an order request. We confirm availability and your total before any payment.";

export const Route = createFileRoute("/order")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderPage,
});

function OrderPage() {
  return (
    <section className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-16">
      <Link to="/catalog" className="text-sm text-muted-foreground transition-colors hover:text-accent">
        ← Continue browsing
      </Link>
      <p className="eyebrow mt-8">Order request</p>
      <h1 className="mt-3 font-serif text-4xl text-primary sm:text-5xl">Review your order.</h1>
      <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">
        Check the quantities, tell us how you'd like to pay, and send it over. Nothing is charged here — we confirm
        availability and your total with you first, then arrange local pickup or delivery.
      </p>
      <div className="mt-10">
        <OrderForm cartMode />
      </div>
      <p className="mt-10 text-xs leading-relaxed text-muted-foreground">{RESEARCH_DISCLAIMER}</p>
    </section>
  );
}
