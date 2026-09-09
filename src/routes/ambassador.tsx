import { createFileRoute, Link } from "@tanstack/react-router";
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
      intro="Interested in representing Natural State Peptides? Start a conversation about your audience, experience, and approach to research-focused communication."
    >
      <p>
        Our program is in development. Tell us where you create content, who you reach, and why you
        are interested in the brand. Program terms and any compensation arrangements must be
        confirmed before participation.
      </p>
      <Link
        to="/contact"
        search={{ intent: "partnership" }}
        className="inline-flex rounded-md bg-primary px-7 py-3.5 text-sm text-primary-foreground hover:opacity-90"
      >
        Start a Partnership Inquiry
      </Link>
    </SimplePage>
  ),
});
