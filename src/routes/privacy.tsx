import { createFileRoute } from "@tanstack/react-router";
import { SimplePage } from "@/components/simple-page";

const title = "Privacy Policy — Natural State Peptides";
const description =
  "How Natural State Peptides collects, uses, and protects information submitted through inquiries, COA requests, and the partner program.";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Privacy,
});

const sections: [string, string[]][] = [
  [
    "Information we collect",
    [
      "When you submit a product inquiry, COA request, availability request, or ambassador application, we collect the information you provide directly: your name, email address, message, the product and lot reference you ask about (if any), and a referral code (if any).",
      "If you are an approved partner, we additionally store your account email, referral code, agreed commission terms, and the recorded sales, commissions, and payouts associated with your account.",
      "We do not collect payment card details through this site, and this site does not process checkout or payment.",
    ],
  ],
  [
    "How we use information",
    [
      "We use the information you submit to respond to your inquiry, evaluate ambassador applications, administer approved partner accounts, and maintain records required to operate the ambassador program. We do not sell your information to third parties.",
      "Submitting an inquiry does not sign you up for marketing communications.",
    ],
  ],
  [
    "Service providers",
    [
      "We use Supabase to store submitted requests and to manage partner account authentication, and we use Resend to deliver email notifications of new inquiries to our team. These providers process data on our behalf and are bound by their own security and privacy practices.",
    ],
  ],
  [
    "Data retention",
    [
      "We retain inquiry and partner records for as long as reasonably necessary to respond to requests, operate the ambassador program, and meet recordkeeping and legal obligations, after which records may be deleted or anonymized.",
    ],
  ],
  [
    "Your choices",
    [
      "You can ask us to access, correct, or delete the personal information you have submitted by contacting us through the contact page. We will respond to verified requests within a reasonable time.",
    ],
  ],
  [
    "Cookies and tracking",
    [
      "This site does not use advertising or analytics cookies. A referral code passed in a link (for example, ?ref=CODE) is read from the page URL to prefill an inquiry form and is not stored as a persistent tracking cookie across sessions.",
    ],
  ],
  [
    "Children's privacy",
    [
      "This site is intended for adults conducting or supporting laboratory research and is not directed to individuals under 18. We do not knowingly collect information from children.",
    ],
  ],
  [
    "Security",
    [
      "Submitted requests and partner account data are stored with access controls that restrict who can read them, and administrative actions are logged. No method of transmission or storage is completely secure, and we cannot guarantee absolute security.",
    ],
  ],
  [
    "Changes to this policy",
    [
      "We may update this policy from time to time. The date below reflects the most recent revision.",
    ],
  ],
  [
    "Contact",
    ["Questions about this policy or your information can be sent through our contact page."],
  ],
];

function Privacy() {
  return (
    <SimplePage
      eyebrow="Legal"
      heading="Privacy Policy"
      intro="This policy explains what information Natural State Peptides collects through this site and how it is used."
    >
      {sections.map(([heading, paragraphs]) => (
        <div key={heading}>
          <h2 className="font-serif text-2xl text-primary">{heading}</h2>
          {paragraphs.map((p, i) => (
            <p key={i} className="mt-3">
              {p}
            </p>
          ))}
        </div>
      ))}
      <p className="pt-6 text-sm text-muted-foreground">
        Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.
      </p>
    </SimplePage>
  );
}
