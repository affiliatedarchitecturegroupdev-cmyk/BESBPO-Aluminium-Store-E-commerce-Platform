// Types for the ten merchandising sections in docs/37-merchandising-sections.md (spec v1.0).
// Kept separate from `catalog-types.ts` so the core catalogue contract stays readable: every
// type here is a *view* over catalogue + order + review + analytics data, not a new entity the
// rest of the storefront needs to know about.

import type { Product, ProductList } from './catalog-types';

/** Best Sellers — Product with the cumulative units sold that produced its rank. */
export type BestSellerProduct = Product & { unitsSold: number };

/** Top Rated — Product with its rating summary and the newest review that carries text. */
export type TopRatedProduct = Product & {
  averageRating: number;
  reviewCount: number;
  topQuote: string | null;
  topQuoteAuthor: string | null;
};

/** Shop by Finish — a swatch plus how many live products carry it. */
export type FinishSwatch = {
  id: string;
  name: string;
  hex: string;
  description: string | null;
  qualicoat: boolean;
  qualanod: boolean;
  productCount: number;
};

export type FinishSwatchSet = { items: FinishSwatch[] };
export type FinishProductList = { finishId: string; items: Product[]; total: number };

export type BudgetTier = {
  key: string;
  label: string;
  blurb: string;
  count: number;
};

export type BudgetShop = {
  tiers: BudgetTier[];
  activeTier: string;
  items: Product[];
  // The server flags the bands as approximate; the section renders that qualifier rather than
  // letting the shopper read them as exact price points.
  approximate: boolean;
  approximationNote: string;
};

export type DailyDeal = {
  id: string;
  productId: string;
  dealPrice: string | number;
  stockLimit: number;
  claimed: number;
  remaining: number;
  headline: string | null;
  startsAt: string;
  endsAt: string;
  msRemaining: number;
  soldOut: boolean;
  product: Product;
};

export type FeaturedPick = {
  id: string;
  productId: string;
  // The curator's own words — rendered verbatim, not generated.
  note: string;
  curator: string | null;
  isHero: boolean;
  sortOrder: number;
  product: Product;
};

export type CollectionSummary = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  season: string | null;
  accentHex: string | null;
  finish: { id: string; name: string; hex: string } | null;
  _count: { items: number };
  items: { id: string; note: string | null; sortOrder: number; product: Product }[];
};

export type ProductPairing = {
  id: string;
  note: string | null;
  sortOrder: number;
  target: Product;
};

export type RecentlyViewedProduct = Product & { viewedAt: string };

export type RecommendationResult = {
  items: Product[];
  basis: { anchorSku: string; anchorName: string; subCategory: string | null } | null;
  // The section's own statement of what it is based on, so it does not imply a personalisation
  // engine exists behind it.
  reason: string;
};

/** A product list is what several sections page through; re-exported for convenience. */
export type { ProductList };
