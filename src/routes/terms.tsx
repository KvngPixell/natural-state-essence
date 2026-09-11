import { createFileRoute } from "@tanstack/react-router";
import { SimplePage } from "@/components/simple-page";

const title = "Terms — Natural State Peptides";
const description =
  "Terms of use for Natural State Peptides: research-use-only scope, order requests, ambassador program and commission terms, and limitation of liability.";

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
    "3. Inquiries, order requests and availability",
    [
      "This site is a product-information and request platform. Submitting an inquiry, an order request (the \u201cPlace Order\u201d form), a COA request, or an availability request tells our team what you would like and how you prefer to pay; it does not create a binding order or sale, and no payment is taken on this site.",
      "Our team will contact you to confirm availability, the total, and payment and delivery details. A sale is complete only once we have confirmed it with you and received payment by the agreed method (such as cash, Cash App, Venmo, crypto or another method we accept). We may decline any request.",
      "Product availability, pricing, specifications, and documentation are subject to change without notice.",
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
      "Participation in the Natural State Ambassador program is by approval only. Approved ambassadors receive a personal referral link and code and a private dashboard. The specific commission rates, rank thresholds, residual period and payout timing in effect are shown in the ambassador dashboard and confirmed at approval; any individual written terms control in the event of a conflict with this page.",
      "Attribution. A customer is credited to an ambassador when they arrive through that ambassador's referral link within the referral window, or when the ambassador's code is provided with their request or purchase. A customer is treated as a new customer only once; after their first purchase they remain attributed to the same ambassador, and repeat purchases may earn a residual commission for the residual period. Attribution is determined from our records, and Natural State may correct attribution in cases of error, duplicate records, or abuse.",
      "Commission basis. Commission is calculated only on recorded, paid product amounts actually received, after discounts. Shipping, taxes, fees, refunded or cancelled amounts, disputed payments, excluded products, and purchases by an ambassador for themselves or their own household do not earn commission. Clicks, visits and inquiries do not earn commission on their own.",
      "Monthly statements. Rank is determined by an ambassador's total qualified revenue in a calendar month (Central time), and the rank reached applies to all new-customer sales in that month. Commission for a month is finalized after the month closes and is approved by Natural State before payment. Refunds or chargebacks after payment may be deducted from later commission.",
      "Payouts are made outside this site by the method agreed with the ambassador and are recorded in the dashboard. Ambassadors are independent participants, not employees, and are responsible for their own taxes. We may request tax information before paying commission.",
      "Conduct. Ambassadors must follow the Natural State brand guidance, clearly disclose their financial relationship near any endorsement, and must not make human-use, dosing, therapeutic, or income claims, send spam, create fake reviews, or refer themselves. Natural State may suspend or end participation, and withhold commission connected to a violation, at its discretion.",
      "Natural State may change program rules going forward. Changes do not reduce commission already approved or paid.",
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
        Last updated: September 11, 2026.
      </p>
    </SimplePage>
  );
}
