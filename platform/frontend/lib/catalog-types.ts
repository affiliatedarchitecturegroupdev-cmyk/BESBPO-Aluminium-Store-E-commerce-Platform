// Shared catalogue types — the shapes the backend's catalog read model returns.
// Kept in one file so a page and the components it feeds agree on the contract.

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  iconKey: string | null;
  sortOrder: number;
  _count?: { subCategories: number };
};

export type SubCategory = {
  id: string;
  name: string;
  slug: string;
  pricingBasis: string;
  category?: Category;
};

export type ProductImage = { id: string; url: string; altText: string; sortOrder: number };

export type Finish = {
  id: string;
  name: string;
  hex: string;
  costPerM2: string | number;
  qualicoat: boolean;
  qualanod: boolean;
};

export type GlazingPackage = {
  id: string;
  name: string;
  upgradeRateM2: string | number;
  nrcsApproved: boolean;
  description: string | null;
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  configuration: string;
  standardSize: string | null;
  widthMm: number | null;
  heightMm: number | null;
  glazingSpec: string | null;
  unitOfSale: string;
  segments: string[];
  fulfilmentType: 'STOCK' | 'MADE_TO_ORDER' | 'CMI_PARTNER_NETWORK';
  baseCost: string | number;
  active: boolean;
  images?: ProductImage[];
  finish?: Finish | null;
  subCategory?: SubCategory;
  complianceRefs?: { id: string; standard: string; docType: string; issuer: string | null; fileUrl: string | null }[];
  stockLevel?: { quantity: number; reserved: number } | null;
};

export type ProductList = { items: Product[]; total: number; take: number; skip: number };

export type ProjectImage = { id: string; url: string; caption: string | null; sortOrder: number };
export type Project = {
  id: string;
  title: string;
  description: string;
  sector: string;
  categorySlug: string | null;
  featured: boolean;
  completedAt: string | null;
  images: ProjectImage[];
};

export type ContentBlock = {
  id: string;
  key: string;
  type: string;
  title: string | null;
  body: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  sortOrder: number;
};

export type Advertisement = {
  id: string;
  slot: number;
  campaignName: string;
  imageUrl: string;
  linkUrl: string;
};

export type Bundle = {
  id: string;
  name: string;
  description: string | null;
  discountPct: string | number;
  items: { id: string; quantity: number; product: { name: string; sku: string } }[];
};

/** Format a Rand amount the way the rest of the storefront does (en-ZA, two decimals). */
export function formatRand(value: string | number | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (n == null || Number.isNaN(n)) return '—';
  return `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}