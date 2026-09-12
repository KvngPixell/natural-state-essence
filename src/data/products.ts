import vialImage from "@/assets/vial-nsp.jpg";

export type ProductCategory = "Peptides" | "Blends" | "Research Compounds";
export type ProductStatus = "In Stock" | "Coming Soon";

/** Whole-dollar prices for 1, 2 and 3 vials of one strength. */
export type VialPrices = readonly [number, number, number];

/** One orderable strength of a product. `sku` is what orders record. */
export interface Variant {
  sku: string;
  strength: string;
  status: ProductStatus;
  prices: VialPrices | null;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  /** Default (first) strength — kept for places that show a single strength. */
  strength: string;
  variants: Variant[];
  /** Lowest single-vial price across strengths, or null when not yet priced. */
  fromPrice: number | null;
  category: ProductCategory;
  status: ProductStatus;
  shortDescription: string;
  longDescription: string;
  researchNotes: string;
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
  /**
   * Descriptive research context: what the compound is structurally and which
   * research areas it appears in. Deliberately contains no dosing, no
   * administration guidance, no human- or animal-use framing, and no efficacy
   * or safety claims. Keep it that way when editing.
   */
  researchNotes: string;
  featured?: boolean;
  /** Price for 1, 2, 3 vials of the default strength. */
  prices?: VialPrices;
  /** Additional strengths sold under the same product page. */
  more?: { strength: string; status: ProductStatus; prices?: VialPrices }[];
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
    researchNotes:
      "Retatrutide is a synthetic peptide described in the literature as a triple receptor agonist, acting at the GLP-1, GIP, and glucagon receptors. That combined receptor profile is what distinguishes it from the single- and dual-agonist peptides studied in the same area. Published work concerns incretin signaling, energy expenditure, glucose homeostasis, and the regulation of appetite pathways. It remains an investigational compound under clinical study and has not been approved for any use.",
    featured: true,
    prices: [100, 175, 230],
    more: [{ strength: "40 mg", status: "In Stock", prices: [165, 300, 395] }],
  },
  {
    name: "Epitalon",
    slug: "epitalon",
    strength: "10 mg",
    category: "Peptides",
    status: "In Stock",
    shortDescription:
      "Short synthetic peptide studied in research involving cellular aging, circadian signaling, telomere-related mechanisms, and longevity pathways.",
    researchNotes:
      "Epitalon, also written Epithalon, is a synthetic tetrapeptide with the sequence Ala-Glu-Asp-Gly. It was developed as a synthetic counterpart to epithalamin, a pineal gland extract, in Russian gerontology research. Published literature concerns telomerase activity, pineal and circadian regulation, and markers associated with cellular senescence. Much of the primary research originates from a small number of research groups, which is worth weighing when reading the available evidence.",
    featured: true,
    prices: [40, 75, 90],
  },
  {
    name: "CJC-1295 (No DAC) + Ipamorelin",
    slug: "cjc-1295-no-dac-ipamorelin",
    strength: "10 mg",
    category: "Blends",
    status: "In Stock",
    shortDescription:
      "Peptide blend studied for growth-hormone signaling, recovery pathways, body-composition research, and sleep-related physiology.",
    researchNotes:
      "This blend combines two peptides that act on the somatotropic axis by different routes. CJC-1295 without DAC, also known as Modified GRF (1-29), is an analogue of growth hormone releasing hormone. Ipamorelin is a selective agonist at the growth hormone secretagogue receptor, the same receptor targeted by ghrelin. Research on the pair concerns growth hormone pulsatility and the interaction between these two signaling routes; they are frequently studied together because the mechanisms are complementary rather than overlapping.",
    featured: true,
    prices: [50, 85, 120],
  },
  {
    name: "Pinealon",
    slug: "pinealon",
    strength: "10 mg",
    category: "Peptides",
    status: "In Stock",
    shortDescription:
      "Short peptide studied in research involving neurological function, cognition, cellular aging, and neuroprotective signaling.",
    researchNotes:
      "Pinealon is a tripeptide with the sequence Glu-Asp-Arg, one of a family of short peptides described in Russian research literature as peptide bioregulators. Published work concerns neuronal cell function, responses to oxidative stress, and cognition-related measures in animal models. As with other compounds in that family, the body of primary research is concentrated among a small number of groups.",
    featured: true,
    prices: [45, 80, 95],
  },
  {
    name: "MOTS-C",
    slug: "mots-c",
    strength: "40 mg",
    category: "Peptides",
    status: "In Stock",
    shortDescription:
      "Mitochondrial-derived peptide studied for metabolic signaling, glucose utilization, exercise physiology, and cellular energy regulation.",
    researchNotes:
      "MOTS-c is a mitochondrial-derived peptide, meaning it is encoded within mitochondrial DNA rather than the nuclear genome — in this case within the 12S rRNA region. Its identification contributed to a wider research interest in mitochondria as a signaling organelle rather than solely a site of energy production. Published work concerns AMPK signaling, metabolic homeostasis, insulin sensitivity, and responses associated with exercise physiology.",
    featured: true,
    prices: [90, 160, 215],
  },
  {
    name: "Oxytocin",
    slug: "oxytocin",
    strength: "5 mg",
    category: "Peptides",
    status: "In Stock",
    shortDescription:
      "Naturally occurring peptide hormone researched for social-bonding pathways, stress response, mood-related signaling, and reproductive physiology.",
    researchNotes:
      "Oxytocin is a naturally occurring nonapeptide produced in the hypothalamus and released via the posterior pituitary. It is among the most extensively studied peptides in this catalog, with a research literature spanning parturition and lactation physiology, social and affiliative behavior, and modulation of the stress axis. Its close structural relationship to vasopressin, differing at only two residues, is itself a recurring subject of receptor-selectivity research.",
    prices: [30, 50, 65],
  },
  {
    name: "Semax",
    slug: "semax",
    strength: "10 mg",
    category: "Peptides",
    status: "In Stock",
    shortDescription:
      "Synthetic peptide researched for neurological signaling, cognition, stress response, and neuroprotective pathways.",
    researchNotes:
      "Semax is a synthetic heptapeptide derived from the ACTH(4-10) fragment, extended with a Pro-Gly-Pro sequence that increases stability relative to the parent fragment. Unlike ACTH itself, it is described in the literature as lacking corticotropic activity. Published research concerns BDNF expression, neuroprotective signaling, and measures of attention and cognition, largely in Russian-language literature where the compound was developed.",
    prices: [35, 60, 75],
  },
  {
    name: "PT-141",
    slug: "pt-141",
    strength: "10 mg",
    category: "Peptides",
    status: "In Stock",
    shortDescription:
      "Melanocortin-receptor peptide studied for sexual-arousal pathways and central nervous system signaling.",
    researchNotes:
      "PT-141, also known as bremelanotide, is a cyclic heptapeptide and a metabolite of melanotan II. It acts as an agonist at melanocortin receptors, with research attention focused on MC3R and MC4R. What distinguishes it in the literature is that its studied mechanism is central rather than vascular, which separates it from an entirely different class of compounds researched in adjacent areas.",
    prices: [40, 55, 75],
  },
  {
    name: "KLOW",
    slug: "klow",
    strength: "80 mg",
    category: "Blends",
    status: "Coming Soon",
    shortDescription:
      "Four-peptide research blend containing GHK-Cu, BPC-157, TB-500, and KPV, studied across tissue-repair, matrix-remodeling, inflammatory-signaling, and recovery-related pathways.",
    researchNotes:
      "KLOW is a four-component blend of GHK-Cu, BPC-157, TB-500, and KPV. Each component has its own research literature, described on its individual product page where listed. The blend groups peptides studied in overlapping areas — extracellular matrix remodeling, angiogenesis, cell migration, and inflammatory signaling. Research on individual components should not be read as research on the combination: blends of this kind are not themselves the subject of the studies describing their parts.",
  },
  {
    name: "GLOW",
    slug: "glow",
    strength: "70 mg",
    category: "Blends",
    status: "In Stock",
    shortDescription:
      "Research blend containing GHK-Cu, BPC-157, and TB-500, studied across tissue-repair, collagen-related, cellular-migration, and recovery pathways.",
    researchNotes:
      "GLOW is a three-component blend of GHK-Cu, BPC-157, and TB-500 — the same grouping as KLOW without the KPV fragment. The shared research theme across its components is tissue repair: collagen and extracellular matrix biology for GHK-Cu, angiogenesis and cytoprotection for BPC-157, and actin binding and cell migration for TB-500. As with any blend, published research describes the individual peptides rather than this particular combination.",
    prices: [90, 165, 230],
  },
  {
    name: "GHK-Cu",
    slug: "ghk-cu",
    strength: "100 mg",
    category: "Peptides",
    status: "In Stock",
    shortDescription:
      "Copper-binding peptide researched for tissue repair, collagen-related pathways, skin biology, hair biology, and wound-healing mechanisms.",
    researchNotes:
      "GHK is a naturally occurring tripeptide, Gly-His-Lys, with a high affinity for copper(II); the complexed form is written GHK-Cu. It was first isolated from human plasma, where its reported concentration declines with age. Published research concerns collagen synthesis, extracellular matrix remodeling, wound-healing models, and broader effects on gene expression. It is among the better-characterised compounds in this catalog, with a literature spanning several decades.",
    prices: [45, 75, 110],
  },
  {
    name: "BPC-157",
    slug: "bpc-157",
    strength: "20 mg",
    category: "Peptides",
    status: "In Stock",
    shortDescription:
      "Synthetic pentadecapeptide studied in tissue-repair models, angiogenesis, cytoprotection, and gastrointestinal research.",
    researchNotes:
      "BPC-157, short for Body Protection Compound-157, is a synthetic peptide of fifteen amino acids whose sequence was identified within a larger protein isolated from gastric juice. Published research, almost entirely in cell and animal models, concerns healing models in tendon, ligament, muscle and gastrointestinal tissue, the formation of new blood vessels, and nitric-oxide signaling. A large share of the literature comes from a single research group, which is worth weighing when reading it. It is not an approved product.",
    featured: true,
    prices: [70, 130, 170],
  },
  {
    name: "BPC-157 + TB-500",
    slug: "bpc-157-tb-500",
    strength: "10 mg",
    category: "Blends",
    status: "In Stock",
    shortDescription:
      "Research blend investigated for tissue-repair pathways, inflammation signaling, vascular responses, and recovery mechanisms.",
    researchNotes:
      "This blend pairs two peptides studied in overlapping tissue-repair research. BPC-157 is a pentadecapeptide derived from a sequence identified in gastric juice, with published work concerning angiogenesis, cytoprotection, and healing models in connective tissue. TB-500 is a synthetic fragment of thymosin beta-4 containing its actin-binding domain, studied for cell migration and cytoskeletal dynamics. Both are studied predominantly in animal models; neither is an approved product.",
    prices: [50, 85, 120],
  },
  {
    name: "SS-31",
    slug: "ss-31",
    strength: "50 mg",
    category: "Peptides",
    status: "In Stock",
    shortDescription:
      "Mitochondria-targeting research peptide studied for cellular energy production, oxidative stress, and mitochondrial function.",
    researchNotes:
      "SS-31, also known as elamipretide, is a tetrapeptide that concentrates in the inner mitochondrial membrane, where research describes it associating with cardiolipin, a phospholipid central to mitochondrial cristae structure. That targeting mechanism is why it appears in bioenergetics literature specifically rather than in general antioxidant research. Published work concerns cristae architecture, electron transport efficiency, and reactive oxygen species production.",
    prices: [140, 260, 365],
  },
  {
    name: "Tesamorelin",
    slug: "tesamorelin",
    strength: "20 mg",
    category: "Peptides",
    status: "In Stock",
    shortDescription:
      "Growth-hormone-releasing hormone analogue studied for growth-hormone signaling, metabolism, and body-composition pathways.",
    researchNotes:
      "Tesamorelin is a stabilised analogue of human growth hormone releasing hormone, GHRH(1-44), modified to resist enzymatic degradation. Published research concerns the GH/IGF-1 axis, lipid metabolism, and visceral adipose tissue measures. Among the GHRH-related compounds in this catalog it has the most substantial clinical research record, which makes it a common comparison point in the literature for the shorter fragments.",
    prices: [110, 190, 265],
  },
  {
    name: "Kisspeptin-10",
    slug: "kisspeptin-10",
    strength: "5 mg",
    category: "Peptides",
    status: "In Stock",
    shortDescription:
      "Signalling peptide studied in reproductive endocrinology research, including gonadotropin-releasing pathways and hormonal regulation mechanisms.",
    researchNotes:
      "Kisspeptin-10 is the C-terminal decapeptide fragment of kisspeptin, the product of the KISS1 gene, and binds the receptor KISS1R, also written GPR54. Its identification reshaped reproductive endocrinology research: kisspeptin signaling is now described as an upstream regulator of GnRH release and therefore of the hypothalamic-pituitary-gonadal axis. Published work concerns pubertal onset, GnRH pulse generation, and hypothalamic control of reproductive hormones.",
    prices: [30, 50, 65],
  },
  {
    name: "KPV",
    slug: "kpv",
    strength: "10 mg",
    category: "Peptides",
    status: "In Stock",
    shortDescription:
      "Tripeptide fragment studied for inflammatory-signalling pathways, cellular response mechanisms, and tissue-related research.",
    researchNotes:
      "KPV is a tripeptide, Lys-Pro-Val, corresponding to the C-terminal fragment of alpha-melanocyte-stimulating hormone. Research describes it as retaining anti-inflammatory activity associated with the parent hormone while lacking its pigmentary effects, which is the principal reason the fragment is studied separately. Published work concerns NF-κB signaling, epithelial and mucosal models, and transport via the PepT1 peptide transporter.",
    prices: [40, 65, 95],
  },
  {
    name: "Selank",
    slug: "selank",
    strength: "10 mg",
    category: "Peptides",
    status: "In Stock",
    shortDescription:
      "Synthetic peptide researched for anxiety-related signaling, cognition, stress response, and neurological function.",
    researchNotes:
      "Selank is a synthetic heptapeptide based on tuftsin, an immunomodulatory tetrapeptide, extended with the same Pro-Gly-Pro stabilising sequence used in Semax. Published research concerns anxiolytic-like measures in animal models, modulation of GABAergic and serotonergic signaling, and effects on immune mediators. Like Semax, it was developed in Russia and much of its primary literature is Russian-language.",
    prices: [35, 60, 75],
  },
];

/**
 * Central product catalog.
 * Edit this list to add, remove, or update products — every page reads from here.
 */
const skuFor = (slug: string, strength: string, first: boolean) =>
  first ? slug : `${slug}-${strength.toLowerCase().replace(/\s+/g, "")}`;

export const products: Product[] = seeds.map((s, i) => {
  const variants: Variant[] = [
    { strength: s.strength, status: s.status, prices: s.prices ?? null },
    ...(s.more ?? []).map((m) => ({ strength: m.strength, status: m.status, prices: m.prices ?? null })),
  ].map((v, j) => ({ ...v, sku: skuFor(s.slug, v.strength, j === 0) }));
  const priced = variants.filter((v) => v.prices).map((v) => (v.prices as VialPrices)[0]);
  return {
  id: String(i + 1),
  name: s.name,
  slug: s.slug,
  strength: s.strength,
  variants,
  fromPrice: priced.length ? Math.min(...priced) : null,
  category: s.category,
  status: (variants.some((v) => v.status === "In Stock") ? "In Stock" : "Coming Soon") as ProductStatus,
  shortDescription: s.shortDescription,
  longDescription: `${s.name} is supplied as a lyophilised research material for laboratory research use only. ${s.shortDescription} It is not supplied for human or animal use, and no dosing or handling guidance beyond standard laboratory practice is provided.`,
  researchNotes: s.researchNotes,
  image: vialImage,
  testingStatus: TESTING_STATUS,
  storage: STORAGE,
  featured: s.featured ?? false,
  sortOrder: i + 1,
  };
});

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

/** Every orderable strength as its own line — what order forms list and orders record. */
export interface Sku extends Variant {
  product: Product;
  name: string;
  /** "Retatrutide 40 mg" */
  label: string;
}
export const skus: Sku[] = products.flatMap((p) =>
  p.variants.map((v) => ({ ...v, product: p, name: p.name, label: `${p.name} ${v.strength}` })),
);
export function getSku(sku: string | null | undefined) {
  return sku ? skus.find((s) => s.sku === sku) : undefined;
}

/** Published prices cover up to this many vials of one strength; larger quantities are quoted. */
export const MAX_PRICED_QTY = 3;

/** Estimated price in cents for `qty` vials, or null when unpriced or above the published quantities. */
export function priceCents(sku: string | null | undefined, qty: number): number | null {
  const s = getSku(sku);
  if (!s?.prices || !Number.isInteger(qty) || qty < 1 || qty > MAX_PRICED_QTY) return null;
  return s.prices[qty - 1] * 100;
}

export const usd = (dollars: number) => "$" + dollars.toLocaleString("en-US");

export const RESEARCH_DISCLAIMER =
  "All products are intended for laboratory research use only. They are not intended for human or animal consumption, diagnostic, therapeutic, or clinical use of any kind.";
