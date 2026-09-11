import { createFileRoute } from "@tanstack/react-router";
import { SimplePage } from "@/components/simple-page";

const title = "Privacy Policy — Natural State Peptides";
const description =
  "How Natural State Peptides collects, uses, and protects information from inquiries, order requests, referral links, customer records, and the ambassador program.";

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
      "When you submit a product inquiry, an order request, a COA request, an availability request, or an ambassador application, we collect the information you provide: your first and last name, email address, phone number, city and state (for applications), your message, the products and quantities you ask about, your preferred payment method (for example cash, Cash App, Venmo, crypto or other) and whether you prefer pickup or local delivery (and, for delivery, the details needed to deliver).",
      "When you buy from us, we keep a customer record with a permanent customer ID and an order record for each purchase: the date, products, amounts paid, order status, how it was fulfilled, and which ambassador (if any) referred you.",
      "If you are an approved ambassador, we additionally store your name, contact details, city and state, referral code, account email, and the attributed customers, recorded sales, commission statements, adjustments and payouts associated with your account.",
      "We do not collect payment card or bank details through this site. This site does not process checkout or payments; payment is arranged directly with our team.",
    ],
  ],
  [
    "Referral attribution",
    [
      "When you arrive through an ambassador's referral link (for example /r/CODE or a link containing ?ref=CODE), we record the visit so the right ambassador is credited. We store the referral code, the time of your visit, and a random visitor identifier in your browser's local storage on this site only (first-party storage, not a third-party cookie). This referral is remembered for a limited window (currently 30 days) and is then ignored.",
      "On our servers, a referral visit record contains the ambassador code, the page you landed on, the website that sent you (domain only), the random visitor identifier, and a one-way hashed version of your IP address used only to count unique visits and prevent abuse. We do not store your raw IP address with these records.",
      "If you submit an inquiry or order request after a referral visit, the referral is attached to it. Once you make a first purchase, you are attributed to the referring ambassador according to our program rules. Ambassadors see only your first name and last initial, never your contact details.",
      "You can clear the stored referral at any time by clearing this site's data in your browser.",
    ],
  ],
  [
    "How we use information",
    [
      "We use the information you submit to respond to your inquiry or order request, arrange payment and delivery, keep accurate customer and order records, evaluate ambassador applications, calculate and pay ambassador commissions, prevent fraud and self-referral, and meet recordkeeping obligations. We do not sell your information to third parties.",
      "Submitting an inquiry or order request does not sign you up for marketing communications.",
    ],
  ],
  [
    "Service providers",
    [
      "We use Supabase to store requests, customer, order and ambassador records and to manage account sign-in, and we use Resend to deliver email notifications of new requests to our team. The site is hosted by Lovable. These providers process data on our behalf and are bound by their own security and privacy practices.",
    ],
  ],
  [
    "Data retention",
    [
      "We retain inquiry, customer, order and ambassador records for as long as reasonably necessary to fulfil orders, operate the ambassador program (including commission and payout history), and meet recordkeeping, tax and legal obligations, after which records may be deleted or anonymized. Records of changes to sales, attribution, commissions and payouts are kept in an audit log that cannot be edited.",
    ],
  ],
  [
    "Your choices",
    [
      "You can ask us to access, correct, or delete the personal information you have submitted by contacting us through the contact page. We will respond to verified requests within a reasonable time. Some order and commission records may need to be kept for legal or accounting reasons.",
    ],
  ],
  [
    "Cookies and tracking",
    [
      "This site does not use advertising cookies or third-party tracking pixels. Referral attribution uses first-party browser storage as described above. Signed-in ambassadors and staff also have a session stored in the browser so they stay signed in. We may view aggregate traffic statistics provided by our hosting platform.",
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
      "Customer, order and ambassador data are stored with access controls enforced on our servers: ambassadors can see only their own records, and business records are available only to authorized owners. Administrative actions are logged. No method of transmission or storage is completely secure, and we cannot guarantee absolute security.",
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
        Last updated: September 11, 2026.
      </p>
    </SimplePage>
  );
}
