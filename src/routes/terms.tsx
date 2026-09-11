import { createFileRoute } from "@tanstack/react-router";
import { SimplePage } from "@/components/simple-page";

const title = "Terms — Natural State Peptides";
const description =
  "Terms of use for Natural State Peptides: research-use-only scope, no medical or human-use claims, ambassador program terms, and limitation of liability.";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Terms,
});

const sections: [string, string[]][] = [
  [
    "1. Research-use-only scope",
    [
      "Natural State Peptides supplies laboratory research materials for use by qualified researchers, institutions and laboratories. Every product offered through this site is sold strictly for in-vitro laboratory research and is not a drug, dietary supplement, cosmetic, or food.",
      "Products are not intended, labeled, or approved for human or animal consumption, diagnosis, treatment, cure, or prevention of any disease. Nothing on this site is medical, dosing, or administration advice, and none should be inferred from product descriptions, images, or ambassador content.",
      "By submitting an inquiry or requesting a product, you represent that you are acquiring information for legitimate research purposes, that you are at least 18 years old, and that you will not use, or cause any other person to use, our products for human or animal consumption.",
    ],
  ],
  [
    "2. No medical or therapeutic claims",
    [
      "Statements about research compounds on this site describe published research areas only. They are not claims that a product is safe, effective, or appropriate for any human or animal use, and they have not been evaluated by the U.S. Food and Drug Administration.",
    ],
  ],
  [
    "3. Inquiries and availability",
    [
      "This site currently operates as a product-information and inquiry platform. Submitting an inquiry, COA request, or availability request does not create a binding order or sale. Any transaction discussed after an inquiry is handled directly between you and Natural State Peptides outside of this website, subject to separately confirmed terms.",
      "Product availability, specifications, and documentation are subject to change without notice.",
    ],
  ],
  [
    "4. Ordering, shipping and delivery",
    [
      "Orders are arranged directly following an inquiry. Local pickup is available in Arkansas. For shipped orders, material is dispatched from Hot Springs, Arkansas, normally within 72 hours of an order being confirmed.",
      "We currently ship within the United States only. Shipping is typically by USPS with tracking provided. Shipping cost is calculated at the time an order is arranged. We may offer free shipping on orders above a stated threshold; any such offer will be confirmed with your order rather than assumed.",
      "Shipped material is packed appropriate to the product, including temperature-protective packaging where the product requires it.",
    ],
  ],
  [
    "5. Returns, damage and errors",
    [
      "All sales are final. Because these are laboratory research materials, we cannot accept returns or exchanges of correctly supplied product.",
      "This does not remove our responsibility for our own mistakes. If material arrives damaged, or if the wrong product or strength is supplied, contact us within 7 days of delivery with the order reference and photographs where relevant, and we will correct it by replacement.",
      "Claims made outside that window, or relating to storage, handling or use after delivery, cannot be accepted.",
    ],
  ],
  [
    "6. Certificates of Analysis and documentation",
    [
      "Documentation is shared upon request where available. A Certificate of Analysis or other report relates only to the specific sample and lot described in that report. It is not a guarantee that every unit of a product, or any other lot, matches the tested sample.",
    ],
  ],
  [
    "7. Ambassador program",
    [
      "Participation in the Natural State Ambassador program is by approval only and is governed by the individual commission, payout, and conduct terms provided to each approved ambassador at the time of acceptance. Those individual terms control in the event of any conflict with this page.",
      "Ambassadors must comply with the Natural State Ambassador Copy Guide, disclose their financial relationship near any endorsement, and must not make human-use, dosing, or therapeutic claims on Natural State's behalf.",
    ],
  ],
  [
    "8. Intellectual property",
    [
      "The Natural State Peptides name, logo, site design, and original content are the property of Natural State Peptides and may not be copied or used without written permission.",
    ],
  ],
  [
    "9. Disclaimer of warranties",
    [
      'This site and the information on it are provided "as is" without warranties of any kind, express or implied, including implied warranties of merchantability, fitness for a particular purpose, or non-infringement.',
    ],
  ],
  [
    "10. Limitation of liability",
    [
      "To the fullest extent permitted by law, Natural State Peptides is not liable for any indirect, incidental, special, or consequential damages arising from your use of this site or any product, including any use inconsistent with the research-use-only scope described above.",
    ],
  ],
  [
    "11. Governing law",
    [
      "These terms are governed by the laws of the State of Arkansas, without regard to conflict-of-law principles.",
    ],
  ],
  [
    "12. Changes to these terms",
    [
      "We may update these terms from time to time. Continued use of the site after an update constitutes acceptance of the revised terms.",
    ],
  ],
  [
    "13. Contact",
    ["Questions about these terms can be sent through our contact page."],
  ],
];

function Terms() {
  return (
    <SimplePage
      eyebrow="Legal"
      heading="Terms of Use"
      intro="Please read these terms carefully before using this site or submitting an inquiry. This page is a general reference and is not a substitute for a signed agreement or legal advice specific to your situation."
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
