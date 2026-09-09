import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Clock, Mail, MapPin } from "lucide-react";

import bannerImage from "@/assets/contact-banner.jpg";
import { products } from "@/data/products";

const title = "Contact — Natural State Peptides";
const description =
  "Contact Natural State Peptides with product inquiries, testing documentation requests, partnership questions, or general questions.";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: ContactPage,
});

const faqs = [
  {
    q: "Where can I find product testing information?",
    a: "Testing documentation is linked from each product page and is also available on request.",
  },
  {
    q: "How quickly do you respond?",
    a: "Including the product name in your message helps us respond more efficiently.",
  },
  {
    q: "Can I inquire about partnerships or ambassador opportunities?",
    a: "Yes. Use the form and select a relevant subject, or mention partnerships or ambassador interest in your message.",
  },
];

type Errors = Partial<Record<"name" | "email" | "subject" | "message", string>>;

function ContactPage() {
  const [values, setValues] = useState({
    name: "",
    email: "",
    subject: "",
    product: "",
    message: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "success">("idle");

  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const fieldClass =
    "w-full rounded-md border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:ring-1 focus:ring-accent";
  const labelClass = "block text-sm text-primary";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    if (!values.name.trim()) next.name = "Please enter your name.";
    else if (values.name.length > 100) next.name = "Name must be under 100 characters.";
    if (!values.email.trim()) next.email = "Please enter your email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
      next.email = "Please enter a valid email address.";
    if (!values.subject.trim()) next.subject = "Please enter a subject.";
    if (!values.message.trim()) next.message = "Please enter a message.";
    else if (values.message.length > 2000) next.message = "Message must be under 2000 characters.";

    setErrors(next);
    if (Object.keys(next).length > 0) {
      setStatus("idle");
      return;
    }

    setStatus("success");
    setValues({ name: "", email: "", subject: "", product: "", message: "" });
  }

  return (
    <>
      <section className="relative isolate border-b border-border">
        <img
          src={bannerImage}
          alt="Calm Arkansas lake at dawn"
          width={1920}
          height={720}
          className="absolute inset-0 -z-10 size-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-background/75" />
        <div className="mx-auto max-w-3xl px-5 py-24 text-center sm:px-8">
          <p className="eyebrow">Natural State Peptides</p>
          <h1 className="mt-5 font-serif text-5xl text-primary sm:text-6xl">Get in Touch</h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-foreground/75">
            Questions, product inquiries, partnerships, or testing documentation? We'd be happy
            to hear from you.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-16 px-5 py-24 sm:px-8 lg:grid-cols-[0.85fr_1fr]">
        <div>
          <h2 className="font-serif text-4xl text-primary">Contact Natural State Peptides</h2>
          <div className="rule-gold mt-5" />

          <ul className="mt-9 space-y-6">
            <li className="flex gap-4">
              <Mail className="mt-1 size-4 shrink-0 text-accent" strokeWidth={1.4} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-primary">Email</p>
                <p className="text-sm break-words text-muted-foreground">
                  Email address to be added
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <MapPin className="mt-1 size-4 shrink-0 text-accent" strokeWidth={1.4} />
              <div>
                <p className="text-sm font-medium text-primary">Location</p>
                <p className="text-sm text-muted-foreground">Arkansas, USA</p>
              </div>
            </li>
            <li className="flex gap-4">
              <Clock className="mt-1 size-4 shrink-0 text-accent" strokeWidth={1.4} />
              <div>
                <p className="text-sm font-medium text-primary">Response time</p>
                <p className="text-sm text-muted-foreground">
                  To be confirmed
                </p>
              </div>
            </li>
          </ul>

          <p className="mt-8 text-sm text-muted-foreground">
            Social links to be added.
          </p>

          <div className="mt-8 rounded-lg border border-border bg-secondary/50 p-6">
            <p className="text-sm leading-relaxed text-foreground/75">
              For product-specific inquiries, include the product name in your message so we can
              respond more efficiently.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-7 shadow-soft sm:p-9">
          {status === "success" && (
            <div
              role="status"
              className="mb-7 rounded-md border border-accent/40 bg-secondary/60 px-5 py-4 text-sm text-primary"
            >
              Thank you — your message has been received. We'll be in touch shortly.
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="grid gap-5">
            <div>
              <label htmlFor="name" className={labelClass}>
                Name
              </label>
              <input
                id="name"
                value={values.name}
                onChange={set("name")}
                maxLength={100}
                className={`${fieldClass} mt-2`}
                aria-invalid={!!errors.name}
              />
              {errors.name && <p className="mt-2 text-xs text-destructive">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="email" className={labelClass}>
                Email
              </label>
              <input
                id="email"
                type="email"
                value={values.email}
                onChange={set("email")}
                maxLength={255}
                className={`${fieldClass} mt-2`}
                aria-invalid={!!errors.email}
              />
              {errors.email && <p className="mt-2 text-xs text-destructive">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="subject" className={labelClass}>
                Subject
              </label>
              <input
                id="subject"
                value={values.subject}
                onChange={set("subject")}
                maxLength={150}
                className={`${fieldClass} mt-2`}
                aria-invalid={!!errors.subject}
              />
              {errors.subject && (
                <p className="mt-2 text-xs text-destructive">{errors.subject}</p>
              )}
            </div>

            <div>
              <label htmlFor="product" className={labelClass}>
                Product of Interest <span className="text-muted-foreground">(optional)</span>
              </label>
              <select
                id="product"
                value={values.product}
                onChange={set("product")}
                className={`${fieldClass} mt-2`}
              >
                <option value="">Select a product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="message" className={labelClass}>
                Message
              </label>
              <textarea
                id="message"
                rows={6}
                value={values.message}
                onChange={set("message")}
                maxLength={2000}
                className={`${fieldClass} mt-2 resize-y`}
                aria-invalid={!!errors.message}
              />
              {errors.message && (
                <p className="mt-2 text-xs text-destructive">{errors.message}</p>
              )}
            </div>

            <button
              type="submit"
              className="mt-1 rounded-md bg-primary px-7 py-3.5 text-sm text-primary-foreground transition-opacity hover:opacity-90"
            >
              Send Message
            </button>
          </form>
        </div>
      </section>

      <section className="border-t border-border bg-secondary/40">
        <div className="mx-auto max-w-3xl px-5 py-20 sm:px-8">
          <p className="eyebrow">FAQ</p>
          <h2 className="mt-4 font-serif text-4xl text-primary">Common questions</h2>
          <div className="mt-9 divide-y divide-border border-y border-border">
            {faqs.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="cursor-pointer list-none text-base text-primary marker:hidden">
                  <span className="flex items-start justify-between gap-4">
                    {f.q}
                    <span className="text-accent transition-transform group-open:rotate-45">
                      +
                    </span>
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-foreground/75">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
