// Response types for the content endpoints (blog, FAQ, legal, locations).

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  body: string;
  authorName: string;
  tags: string[];
  publishedAt: string | null;
};

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
};

export type LegalDocument = {
  id: string;
  slug: string;
  type: string;
  title: string;
  version: string;
  bodyMarkdown: string;
  publishedAt: string | null;
};

export type LocationRecord = {
  id: string;
  name: string;
  province: string;
  address: string;
  isHub: boolean;
};

export type LatestReview = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user?: { name: string } | null;
  product?: { name: string; sku: string } | null;
};