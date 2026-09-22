import HeroSliderStore, { type StoreHeroSlide } from '../components/HeroSliderStore';
import AnnouncementTicker from '../components/AnnouncementTicker';
import TrustBadges from '../components/TrustBadges';
import SocialProofCounters from '../components/SocialProofCounters';
import CategoryGrid from '../components/CategoryGrid';
import ShopBySector from '../components/ShopBySector';
import ProductCarousel, { type CarouselProduct } from '../components/ProductCarousel';
import BundleGrid, { type BundleCard } from '../components/BundleGrid';
import AdSlot, { type AdData } from '../components/AdSlot';
import InstallationShowcase, { type FeaturedProject } from '../components/InstallationShowcase';
import ReviewsCarousel, { type ReviewCard } from '../components/ReviewsCarousel';
import NewsletterSignup from '../components/NewsletterSignup';
import BusinessDeskCTA from '../components/BusinessDeskCTA';
import { serverFetch } from '../lib/api';
import { formatRand, type Advertisement, type Bundle, type Category, type Product, type Project, type ProductList } from '../lib/catalog-types';
import type { ContentBlock, LatestReview } from '../lib/content-types';

// Route: / (home) — the 18-section stack described in the spec (docs/02-storefront-ux-ia.md).
// Every section reads live data from the API via serverFetch; each falls back to a static
// placeholder when the catalogue is empty or the API is unreachable, so the homepage always
// renders something real rather than a 500.

const FALLBACK_TRENDING: CarouselProduct[] = [
  { sku: 'ALS-PVD-0017', name: 'Pivot Entrance Door — 1509×2700mm', priceLabel: 'R 20,734' },
  { sku: 'ALS-CMW-0031', name: 'Casement Window — 1209×1209mm', priceLabel: 'R 4,714' },
];

const FALLBACK_BUNDLES: BundleCard[] = [
  { id: 'b1', name: 'Starter Sliding Door Bundle', description: 'Door + heavy-duty roller set + multi-point lock', discountPct: 0.08, itemCount: 3 },
  { id: 'b2', name: 'Complete Window Hardware Kit', description: 'Handle, friction hinge, and stay arm', discountPct: 0.1, itemCount: 3 },
];

function toCarouselProducts(products: Product[]): CarouselProduct[] {
  return products.map((p) => ({
    sku: p.sku,
    name: `${p.name}${p.widthMm && p.heightMm ? ` — ${p.widthMm}×${p.heightMm}mm` : ''}`,
    priceLabel: formatRand(p.retailPrice),
    badge: p.fulfilmentType === 'MADE_TO_ORDER' ? 'Made to Order' : undefined,
  }));
}

// Clearance shows two prices: the markdown charged and the retail it came off, struck through.
// The saving is computed from the two figures the API returned rather than a stored percentage,
// so the badge can never disagree with the prices beside it.
function toClearanceProducts(products: Product[]): CarouselProduct[] {
  return products
    .filter((p) => p.clearancePrice != null)
    .map((p) => ({
      sku: p.sku,
      name: `${p.name}${p.widthMm && p.heightMm ? ` — ${p.widthMm}×${p.heightMm}mm` : ''}`,
      priceLabel: formatRand(p.clearancePrice as string | number),
      originalPriceLabel: formatRand(p.retailPrice),
      badge: 'Clearance',
    }));
}

export default async function Page() {
  const [categories, trending, recent, clearance, bundles, ads, projects, reviews, announcements, heroSlides] = await Promise.all([
    serverFetch<Category[]>('/catalog/categories'),
    serverFetch<ProductList>('/catalog/products?sort=name&take=8'),
    serverFetch<ProductList>('/catalog/products?sort=recent&take=8'),
    serverFetch<ProductList>('/catalog/clearance?take=8'),
    serverFetch<Bundle[]>('/promotions/bundles'),
    serverFetch<Advertisement[]>('/advertisements/active'),
    serverFetch<Project[]>('/projects/featured'),
    serverFetch<LatestReview[]>('/reviews/latest?take=6'),
    serverFetch<ContentBlock[]>('/cms/content-blocks?type=ANNOUNCEMENT'),
    serverFetch<ContentBlock[]>('/cms/content-blocks?type=HERO_SLIDE'),
  ]);

  const trendingCards = trending?.items?.length ? toCarouselProducts(trending.items) : FALLBACK_TRENDING;
  const recentCards = recent?.items?.length ? toCarouselProducts(recent.items) : [];
  // No fallback here: a clearance shelf with nothing on it must disappear rather than advertise
  // a made-up discount, so the section is omitted entirely when the API returns nothing.
  const clearanceCards = clearance?.items?.length ? toClearanceProducts(clearance.items) : [];
  const bundleCards: BundleCard[] = bundles?.length
    ? bundles.map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description ?? undefined,
        discountPct: Number(b.discountPct),
        itemCount: b.items?.length ?? 0,
      }))
    : FALLBACK_BUNDLES;
  const adFor = (slot: number): AdData | null => {
    const found = ads?.find((a) => a.slot === slot);
    return found ? { slot: found.slot, campaignName: found.campaignName, imageUrl: found.imageUrl, linkUrl: found.linkUrl } : null;
  };
  const featuredProjects: FeaturedProject[] = (projects ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    sector: p.sector,
    imageUrl: p.images?.[0]?.url ?? '',
  }));
  const reviewCards: ReviewCard[] = (reviews ?? []).map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment ?? '',
    authorName: r.user?.name ?? 'Verified buyer',
    productName: r.product?.name ?? '',
  }));

  // CMS-driven homepage copy, with the component's own hardcoded set as the fallback for a
  // deployment where nobody has edited it yet.
  const announcementTexts: string[] = (announcements ?? [])
    .map((b) => b.title)
    .filter((t): t is string => Boolean(t));
  const storeHeroSlides: StoreHeroSlide[] = (heroSlides ?? []).map((b) => ({
    tag: b.title,
    title: b.title,
    sub: b.body ?? '',
    ctaLabel: 'Shop Now',
    ctaHref: b.linkUrl ?? '/catalogue',
    bg: '#1B2733',
  }));

  return (
    <main>
      <HeroSliderStore slides={storeHeroSlides.length ? storeHeroSlides : undefined} />
      <AnnouncementTicker announcements={announcementTexts} />
      <TrustBadges />
      <SocialProofCounters />

      <section style={{ padding: '64px 32px', maxWidth: 1240, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 26, color: '#1B2733' }}>Shop by Category</h2>
        <div style={{ marginTop: 24 }}><CategoryGrid categories={categories ?? undefined} /></div>
      </section>

      <ShopBySector />
      <ProductCarousel anchorId="trending" title="Trending" subtitle="This month's most-configured products" products={trendingCards} />
      <AdSlot ad={adFor(1)} />
      <BundleGrid anchorId="bundles" bundles={bundleCards} />
      <ProductCarousel anchorId="recent-arrivals" title="Recent Arrivals" products={recentCards} />
      {clearanceCards.length > 0 && (
        <ProductCarousel anchorId="clearance" title="Clearance Sale" subtitle="End-of-line and overstock, while it lasts" products={clearanceCards} />
      )}
      <AdSlot ad={adFor(2)} />
      <AdSlot ad={adFor(3)} />
      <InstallationShowcase projects={featuredProjects} />
      <ReviewsCarousel reviews={reviewCards} />
      <NewsletterSignup />
      <BusinessDeskCTA />
    </main>
  );
}
