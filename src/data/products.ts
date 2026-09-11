import vialImage from "@/assets/vial-nsp.jpg";

export type ProductCategory = "Peptides" | "Blends" | "Research Compounds";
export type ProductStatus = "In Stock" | "Coming Soon";

export interface Product {
  id: string;
  name: string;
  slug: string;
  strength: string;
  category: ProductCategory;
  status: ProductStatus;
  shortDescription: string;
  longDescription: string;
  image: string;
  testingStatus: string;
  storage: string;
  featured: boolean;
  sortOrder: number;
}

const TESTING_STATUS =
  "Contact us to request available product documentation. Ask us to confirm the report source and whether it matches your product and lot. Documentation availability varies by product.";

const STORAGE =
  "Store lyophilised material refrigerated at 2–8°C. Protect from light and moisture. Handle according to standard laboratory practice.";

interface Seed {
  name: string;
  slug: string;
  strength: string;
  category: ProductCategory;
  status: ProductStatus;
  shortDescription: string;
  featured?: boolean;
}

const seeds: Seed[] = [
  {
    name: "Retatrutide",
    slug: "retatrutide",
    strength: "20 mg",
    category: "Research Compounds",
    status: "In Stock",
    shortDescription:
      "Multi-receptor research peptide studied for metabolic signaling, appetite-regulation pathways, energy balance, and glucose-related physiology.",
    featured: true,
  },
  {
    name: "Epitalon",
    slug: "epitalon",
    strength: "10 mg",
    category: "Peptides",
    status: "In Stock",
    shortDescription:
      "Short synthetic peptide studied in research involving cellular aging, circadian signaling, telomere-related mechanisms, and longevity pathways.",
    featured: true,
  },
  {
    name: "CJC-1295 (No DAC) + Ipamorelin",
    slug: "cjc-1295-no-dac-ipamorelin",
    strength: "10 mg",
    category: "Blends",
    status: "In Stock",
    shortDescription:
      "Peptide blend studied for growth-hormone signaling, recovery pathways, body-composition research, and sleep-related physiology.",
    featured: true,
  },
  {
    name: "Pinealon",
    slug: "pinealon",
    strength: "10 mg",
    category: "Peptides",
    status: "In Stock",
    shortDescription:
      "Short peptide studied in research involving neurological function, cognition, cellular aging, and neuroprotective signaling.",
    featured: true,
  },
  {
    name: "MOTS-C",
    slug: "mots-c",
    strength: "40 mg",
    category: "Peptides",
    status: "In Stock",
    shortDescription:
      "Mitochondrial-derived peptide studied for metabolic signaling, glucose utilization, exercise physiology, and cellular energy regulation.",
    featured: true,
  },
  {
    name: "Oxytocin",
    slug: "oxytocin",
    strength: "5 mg",
    category: "Peptides",
    status: "Coming Soon",
    shortDescription:
      "Naturally occurring peptide hormone researched for social-bonding pathways, stress response, mood-related signaling, and reproductive physiology.",
  },
  {
    name: "Semax",
    slug: "semax",
    strength: "10 mg",
    category: "Peptides",
    status: "Coming Soon",
    shortDescription:
      "Synthetic peptide researched for neurological signaling, cognition, stress response, and neuroprotective pathways.",
  },
  {
    name: "PT-141",
    slug: "pt-141",
    strength: "10 mg",
    category: "Peptides",
    status: "Coming Soon",
    shortDescription:
      "Melanocortin-receptor peptide studied for sexual-arousal pathways and central nervous system signaling.",
  },
  {
    name: "KLOW",
    slug: "klow",
    strength: "80 mg",
    category: "Blends",
    status: "Coming Soon",
    shortDescription:
      "Four-peptide research blend containing GHK-Cu, BPC-157, TB-500, and KPV, studied across tissue-repair, matrix-remodeling, inflammatory-signaling, and recovery-related pathways.",
  },
  {
    name: "GLOW",
    slug: "glow",
    strength: "70 mg",
    category: "Blends",
    status: "Coming Soon",
    shortDescription:
      "Research blend containing GHK-Cu, BPC-157, and TB-500, studied across tissue-repair, collagen-related, cellular-migration, and recovery pathways.",
  },
  {
    name: "GHK-Cu",
    slug: "ghk-cu",
    strength: "100 mg",
    category: "Peptides",
    status: "Coming Soon",
    shortDescription:
      "Copper-binding peptide researched for tissue repair, collagen-related pathways, skin biology, hair biology, and wound-healing mechanisms.",
  },
  {
    name: "BPC-157 + TB-500",
    slug: "bpc-157-tb-500",
    strength: "10 mg",
    category: "Blends",
    status: "Coming Soon",
    shortDescription:
      "Research blend investigated for tissue-repair pathways, inflammation signaling, vascular responses, and recovery mechanisms.",
  },
  {
    name: "SS-31",
    slug: "ss-31",
    strength: "50 mg",
    category: "Peptides",
    status: "Coming Soon",
    shortDescription:
      "Mitochondria-targeting research peptide studied for cellular energy production, oxidative stress, and mitochondrial function.",
  },
  {
    name: "Tesamorelin",
    slug: "tesamorelin",
    strength: "20 mg",
    category: "Peptides",
    status: "Coming Soon",
    shortDescription:
      "Growth-hormone-releasing hormone analogue studied for growth-hormone signaling, metabolism, and body-composition pathways.",
  },
  {
    name: "Kisspeptin-10",
    slug: "kisspeptin-10",
    strength: "5 mg",
    category: "Peptides",
    status: "Coming Soon",
    shortDescription:
      "Signalling peptide studied in reproductive endocrinology research, including gonadotropin-releasing pathways and hormonal regulation mechanisms.",
  },
  {
    name: "KPV",
    slug: "kpv",
    strength: "10 mg",
    category: "Peptides",
    status: "Coming Soon",
    shortDescription:
      "Tripeptide fragment studied for inflammatory-signalling pathways, cellular response mechanisms, and tissue-related research.",
  },
  {
    name: "Selank",
    slug: "selank",
    strength: "10 mg",
    category: "Peptides",
    status: "Coming Soon",
    shortDescription:
      "Synthetic peptide researched for anxiety-related signaling, cognition, stress response, and neurological function.",
  },
];

/**
 * Central product catalog.
 * Edit this list to add, remove, or update products — every page reads from here.
 */
export const products: Product[] = seeds.map((s, i) => ({
  id: String(i + 1),
  name: s.name,
  slug: s.slug,
  strength: s.strength,
  category: s.category,
  status: s.status,
  shortDescription: s.shortDescription,
  longDescription: `${s.name} is supplied as a lyophilised research material for laboratory research use only. ${s.shortDescription} It is not supplied for human or animal use, and no dosing or handling guidance beyond standard laboratory practice is provided.`,
  image: vialImage,
  testingStatus: TESTING_STATUS,
  storage: STORAGE,
  featured: s.featured ?? false,
  sortOrder: i + 1,
}));

export const categoryFilters = [
  "All Products",
  "Peptides",
  "Blends",
  "Featured",
  "Research Compounds",
] as const;

export const availabilityFilters = ["All", "In Stock", "Coming Soon"] as const;

export function getProductBySlug(slug: string) {
  return products.find((p) => p.slug === slug);
}

export const RESEARCH_DISCLAIMER =
  "All products are intended for laboratory research use only. They are not intended for human or animal consumption, diagnostic, therapeutic, or clinical use of any kind.";
