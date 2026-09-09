import vialImage from "@/assets/vial-nsp.jpg";

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

const TESTING_STATUS = "Third-party testing documentation available on request.";

const STORAGE =
  "Store lyophilised material refrigerated at 2–8°C. Protect from light and moisture. Handle according to standard laboratory practice.";

interface Seed {
  name: string;
  slug: string;
  strength: string;
  category: ProductCategory;
  shortDescription: string;
  longDescription: string;
  featured?: boolean;
}

const seeds: Seed[] = [
  {
    name: "Retatrutide",
    slug: "retatrutide",
    strength: "20 mg",
    category: "Research Compounds",
    shortDescription:
      "A research compound supplied as a lyophilised powder for controlled laboratory settings.",
    longDescription:
      "Retatrutide is supplied strictly as a research compound in lyophilised form. It is intended for laboratory research use only and is not supplied for human or animal use. Additional characterisation details will be published here as documentation is finalised.",
    featured: true,
  },
  {
    name: "CJC-1295 (No DAC) + Ipamorelin",
    slug: "cjc-1295-no-dac-ipamorelin",
    strength: "10 mg",
    category: "Blends",
    shortDescription:
      "A blended research preparation combining two peptides in a single lyophilised vial.",
    longDescription:
      "This blended preparation combines CJC-1295 (No DAC) and Ipamorelin in a single lyophilised vial for laboratory research applications. Blend ratio documentation will be published here once finalised.",
    featured: true,
  },
  {
    name: "Oxytocin",
    slug: "oxytocin",
    strength: "10 mg",
    category: "Peptides",
    shortDescription:
      "A research peptide supplied in lyophilised form for laboratory research applications.",
    longDescription:
      "Oxytocin is supplied as a lyophilised powder for laboratory research use only. Handling and characterisation notes will be added here as documentation becomes available.",
  },
  {
    name: "Semax",
    slug: "semax",
    strength: "10 mg",
    category: "Peptides",
    shortDescription:
      "A research peptide supplied in lyophilised form for laboratory research applications.",
    longDescription:
      "Semax is supplied as a lyophilised powder for laboratory research use only. Additional product documentation will be published here as it is finalised.",
  },
  {
    name: "PT-141",
    slug: "pt-141",
    strength: "10 mg",
    category: "Peptides",
    shortDescription:
      "A research peptide supplied in lyophilised form for laboratory research applications.",
    longDescription:
      "PT-141 is supplied as a lyophilised powder for laboratory research use only. Further characterisation details will be added here as documentation becomes available.",
  },
  {
    name: "KLOW",
    slug: "klow",
    strength: "80 mg",
    category: "Blends",
    shortDescription:
      "A multi-peptide blended research preparation supplied in a single lyophilised vial.",
    longDescription:
      "KLOW is a multi-peptide blended preparation supplied in lyophilised form for laboratory research use only. Component and ratio documentation will be published here once finalised.",
    featured: true,
  },
  {
    name: "GLOW",
    slug: "glow",
    strength: "70 mg",
    category: "Blends",
    shortDescription:
      "A multi-peptide blended research preparation supplied in a single lyophilised vial.",
    longDescription:
      "GLOW is a multi-peptide blended preparation supplied in lyophilised form for laboratory research use only. Component and ratio documentation will be published here once finalised.",
    featured: true,
  },
  {
    name: "GHK-Cu",
    slug: "ghk-cu",
    strength: "100 mg",
    category: "Peptides",
    shortDescription:
      "A copper-peptide research compound supplied in lyophilised form for laboratory use.",
    longDescription:
      "GHK-Cu is supplied as a lyophilised copper peptide for laboratory research use only. Additional documentation will be published here as it is finalised.",
  },
  {
    name: "BPC-157 + TB-500",
    slug: "bpc-157-tb-500",
    strength: "10 mg",
    category: "Blends",
    shortDescription:
      "A blended research preparation combining two peptides in a single lyophilised vial.",
    longDescription:
      "This blended preparation combines BPC-157 and TB-500 in a single lyophilised vial for laboratory research applications. Blend ratio documentation will be published here once finalised.",
    featured: true,
  },
  {
    name: "Pinealon",
    slug: "pinealon",
    strength: "10 mg",
    category: "Peptides",
    shortDescription:
      "A short-chain research peptide supplied in lyophilised form for laboratory applications.",
    longDescription:
      "Pinealon is supplied as a lyophilised powder for laboratory research use only. Additional documentation will be added here as it becomes available.",
  },
  {
    name: "SS-31",
    slug: "ss-31",
    strength: "50 mg",
    category: "Peptides",
    shortDescription:
      "A research peptide supplied in lyophilised form for laboratory research applications.",
    longDescription:
      "SS-31 is supplied as a lyophilised powder for laboratory research use only. Characterisation and handling documentation will be published here as it is finalised.",
    featured: true,
  },
  {
    name: "Tesamorelin",
    slug: "tesamorelin",
    strength: "20 mg",
    category: "Peptides",
    shortDescription:
      "A research peptide supplied in lyophilised form for laboratory research applications.",
    longDescription:
      "Tesamorelin is supplied as a lyophilised powder for laboratory research use only. Additional documentation will be published here as it becomes available.",
  },
  {
    name: "Selank",
    slug: "selank",
    strength: "10 mg",
    category: "Peptides",
    shortDescription:
      "A research peptide supplied in lyophilised form for laboratory research applications.",
    longDescription:
      "Selank is supplied as a lyophilised powder for laboratory research use only. Further product documentation will be added here as it is finalised.",
  },
  {
    name: "MOTS-C",
    slug: "mots-c",
    strength: "40 mg",
    category: "Peptides",
    shortDescription:
      "A research peptide supplied in lyophilised form for laboratory research applications.",
    longDescription:
      "MOTS-C is supplied as a lyophilised powder for laboratory research use only. Additional characterisation details will be published here as documentation becomes available.",
    featured: true,
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
  shortDescription: s.shortDescription,
  longDescription: s.longDescription,
  image: vialImage,
  coaUrl: "#",
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

export function getProductBySlug(slug: string) {
  return products.find((p) => p.slug === slug);
}

export const RESEARCH_DISCLAIMER =
  "All products are intended for laboratory research use only. They are not intended for human or animal consumption, diagnostic, therapeutic, or clinical use of any kind.";
