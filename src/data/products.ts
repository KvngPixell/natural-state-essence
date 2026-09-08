import vialImage from "@/assets/vial-generic.jpg";

export type ProductCategory = "Peptides" | "Blends" | "Research Compounds";

export interface Product {
  id: string;
  name: string;
  slug: string;
  strength: string;
  category: ProductCategory;
  shortDescription: string;
  longDescription: string;
  image: string;
  coaUrl: string;
  testingStatus: string;
  storage: string;
  featured: boolean;
  sortOrder: number;
}

/**
 * Central product catalogue.
 * Edit this list to add, remove, or update products — every page reads from here.
 * Replace placeholder text and COA links with verified information when available.
 */
export const products: Product[] = [
  {
    id: "1",
    name: "MOTS-C",
    slug: "mots-c",
    strength: "10 mg (placeholder)",
    category: "Peptides",
    shortDescription:
      "A research peptide supplied in lyophilised form for laboratory research applications.",
    longDescription:
      "MOTS-C is supplied as a lyophilised powder intended for laboratory research use only. Product specifications, including strength and presentation, are listed as placeholders until verified documentation is published.",
    image: vialImage,
    coaUrl: "#",
    testingStatus: "Third-party testing documentation pending publication",
    storage:
      "Store lyophilised material as indicated on the product label. Keep away from light and excess heat. Storage details are placeholders pending final documentation.",
    featured: true,
    sortOrder: 1,
  },
  {
    id: "2",
    name: "Retatrutide",
    slug: "retatrutide",
    strength: "10 mg (placeholder)",
    category: "Research Compounds",
    shortDescription:
      "A research compound supplied for controlled laboratory research settings.",
    longDescription:
      "Retatrutide is supplied strictly as a research compound. All specifications shown are placeholders and will be updated once verified testing documentation is available.",
    image: vialImage,
    coaUrl: "#",
    testingStatus: "Third-party testing documentation pending publication",
    storage:
      "Store as indicated on the product label. Storage details are placeholders pending final documentation.",
    featured: true,
    sortOrder: 2,
  },
  {
    id: "3",
    name: "CJC-1295 + Ipamorelin",
    slug: "cjc-1295-ipamorelin",
    strength: "Blend (placeholder)",
    category: "Blends",
    shortDescription:
      "A blended research preparation supplied for laboratory research applications.",
    longDescription:
      "This blended preparation is supplied for research use only. Composition ratios and strengths are listed as placeholders pending verified documentation.",
    image: vialImage,
    coaUrl: "#",
    testingStatus: "Third-party testing documentation pending publication",
    storage:
      "Store as indicated on the product label. Storage details are placeholders pending final documentation.",
    featured: true,
    sortOrder: 3,
  },
  {
    id: "4",
    name: "Epitalon",
    slug: "epitalon",
    strength: "10 mg (placeholder)",
    category: "Peptides",
    shortDescription:
      "A research peptide supplied in lyophilised form for laboratory research applications.",
    longDescription:
      "Epitalon is supplied as a lyophilised powder for research use only. Specifications shown are placeholders pending verified documentation.",
    image: vialImage,
    coaUrl: "#",
    testingStatus: "Third-party testing documentation pending publication",
    storage:
      "Store as indicated on the product label. Storage details are placeholders pending final documentation.",
    featured: false,
    sortOrder: 4,
  },
  {
    id: "5",
    name: "Pinealon",
    slug: "pinealon",
    strength: "10 mg (placeholder)",
    category: "Peptides",
    shortDescription:
      "A research peptide supplied in lyophilised form for laboratory research applications.",
    longDescription:
      "Pinealon is supplied as a lyophilised powder for research use only. Specifications shown are placeholders pending verified documentation.",
    image: vialImage,
    coaUrl: "#",
    testingStatus: "Third-party testing documentation pending publication",
    storage:
      "Store as indicated on the product label. Storage details are placeholders pending final documentation.",
    featured: false,
    sortOrder: 5,
  },
];

export const categoryFilters = [
  "All Products",
  "Peptides",
  "Blends",
  "Featured",
  "Research Compounds",
] as const;

export function getProductBySlug(slug: string) {
  return products.find((p) => p.slug === slug);
}

export const RESEARCH_DISCLAIMER =
  "All products are intended for laboratory research use only. They are not intended for human or animal consumption, diagnostic, therapeutic, or clinical use of any kind.";
