/**
 * Seed script — the platform's reference dataset.
 *
 * The catalogue itself is not written here. It is generated from the Pricing Framework workbook
 * by `platform/scripts/import-catalogue.py` and committed as `data/catalogue.json`, which this
 * script loads: 7 categories, 31 sub-categories, and all 2,147 priced SKUs. To change the
 * catalogue, change the workbook and re-run the importer — never hand-edit prices here.
 *
 * Beyond the catalogue this seeds the operating backdrop the storefront needs: the 5 standard
 * finishes, the NRCS-approved glazing packages, delivery zones, legal document stubs, CMI
 * partners, a trade account and an admin user.
 *
 * Sub-category and finish names match `pricing-service/assumptions.json` exactly; a mismatch
 * here is the most likely cause of a 422 from the pricing service. The importer enforces that
 * agreement, so it should not be possible to seed a taxonomy the pricing service cannot price.
 */
import {
  PrismaClient,
  PricingBasis,
  UnitOfSale,
  FulfilmentType,
  Segment,
  Province,
  LegalDocumentType,
  ContentType,
  UserRole,
  CompanyRole,
  DiscountTier,
  CouponType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const prisma = new PrismaClient();

// The catalogue is generated from the Pricing Framework workbook by
// platform/scripts/import-catalogue.py and committed as data/catalogue.json. It supplies the
// taxonomy (7 categories / 31 sub-categories), every product with its three price tiers, and the
// workbook's SHA-256 so a seeded database can prove which revision it came from.
//
// The seed does not carry a hand-written product list. It previously did — 33 lines whose SKUs
// collided with real workbook SKUs while describing different products, and whose prices were
// cost figures rather than retail. Loading the workbook output is what makes the storefront and
// the pricing engine agree.
type CatalogueSubCategory = { name: string; slug: string; pricingBasis: PricingBasis };
type CatalogueCategory = {
  name: string;
  slug: string;
  iconKey: string;
  description: string;
  sortOrder: number;
  subCategories: CatalogueSubCategory[];
};
type CatalogueProduct = {
  sku: string;
  name: string;
  category: string;
  subCategory: string;
  configuration: string;
  standardSize: string | null;
  finish: string | null;
  glazingSpec: string | null;
  unitOfSale: UnitOfSale;
  segments: Segment[];
  fulfilmentType: FulfilmentType;
  frameClass: string | null;
  widthMm: number | null;
  heightMm: number | null;
  lengthM: number | null;
  baseCost: number;
  markupPct: number;
  retailPrice: number;
  tradePrice: number;
  volumePrice: number;
};
type Catalogue = {
  source: { workbook: string; sha256: string; pricedCatalogueRows: number };
  categories: CatalogueCategory[];
  products: CatalogueProduct[];
};

const CATALOGUE: Catalogue = JSON.parse(
  readFileSync(join(__dirname, '..', 'data', 'catalogue.json'), 'utf8'),
) as Catalogue;
// sortOrder fixes the swatch position so "Shop by Finish" does not reorder as stock moves.
// `description` is the one-line swatch caption in that section — it says what the finish *is*
// (and its coating standard), not a marketing claim, so it stays accurate as the range changes.
const FINISHES = [
  { name: 'Natural Anodised', hex: '#C8CDD2', costPerM2: 25, qualanod: true, qualicoat: false, sortOrder: 1, description: 'Clear anodised, silver-grey. Qualanod-certified.' },
  { name: 'Satin White (RAL 9016)', hex: '#F1F0EA', costPerM2: 38, qualicoat: true, qualanod: false, sortOrder: 2, description: 'Powder-coated off-white. Qualicoat-certified.' },
  { name: 'Charcoal Grey (RAL 7016)', hex: '#383E42', costPerM2: 38, qualicoat: true, qualanod: false, sortOrder: 3, description: 'Powder-coated anthracite. Qualicoat-certified.' },
  { name: 'Graphite Black (RAL 9005)', hex: '#0E0E10', costPerM2: 40, qualicoat: true, qualanod: false, sortOrder: 4, description: 'Powder-coated deep black. Qualicoat-certified.' },
  { name: 'Bronze Anodised', hex: '#4A3B2A', costPerM2: 55, qualanod: true, qualicoat: false, sortOrder: 5, description: 'Dark bronze anodised. Qualanod-certified.' },
];

// Names must match GLAZING_UPGRADE_PER_M2 keys in assumptions.json.
const GLAZING_PACKAGES = [
  { name: 'Standard Single-Glazed (4mm Clear Float)', upgradeRateM2: 0, nrcsApproved: true, description: 'Baseline 4mm clear float.' },
  { name: 'IGU Double-Glazed (4-12Ar-4 Low-E)', upgradeRateM2: 550, nrcsApproved: true, description: 'Double-glazed low-E, argon filled.' },
  { name: '6.38mm Laminated Safety', upgradeRateM2: 0, nrcsApproved: true, description: 'Laminated safety glass.' },
  { name: 'IGU Double-Glazed Laminated (6.38-12Ar-4 Low-E)', upgradeRateM2: 700, nrcsApproved: true, description: 'Laminated + low-E IGU.' },
  // Deliberately not approved — proves the configurator's compliance gate actually blocks it.
  { name: 'Solar-Control Tinted IGU', upgradeRateM2: 1100, nrcsApproved: false, description: 'Pending NRCS verification — not selectable.' },
];

const DELIVERY_ZONES = [
  { province: 'GAUTENG' as Province, radiusKm: 50, baseFee: 450, weightBandKg: 100, fragileSurchargePct: 0.08 },
  { province: 'KWAZULU_NATAL' as Province, radiusKm: 40, baseFee: 550, weightBandKg: 100, fragileSurchargePct: 0.08 },
  { province: 'WESTERN_CAPE' as Province, radiusKm: 50, baseFee: 600, weightBandKg: 100, fragileSurchargePct: 0.08 },
  { province: 'EASTERN_CAPE' as Province, radiusKm: 40, baseFee: 750, weightBandKg: 100, fragileSurchargePct: 0.08 },
  // The remaining provinces are remote from both hubs, so they carry a higher base and the
  // longest lead radius. Delivery must be quotable nationwide, not just where a hub sits.
  { province: 'FREE_STATE' as Province, radiusKm: 60, baseFee: 700, weightBandKg: 100, fragileSurchargePct: 0.08 },
  { province: 'LIMPOPO' as Province, radiusKm: 60, baseFee: 800, weightBandKg: 100, fragileSurchargePct: 0.08 },
  { province: 'MPUMALANGA' as Province, radiusKm: 60, baseFee: 700, weightBandKg: 100, fragileSurchargePct: 0.08 },
  { province: 'NORTH_WEST' as Province, radiusKm: 60, baseFee: 750, weightBandKg: 100, fragileSurchargePct: 0.08 },
  { province: 'NORTHERN_CAPE' as Province, radiusKm: 80, baseFee: 1100, weightBandKg: 100, fragileSurchargePct: 0.08 },
];

const LOCATIONS = [
  { name: 'Gauteng Production Hub', province: 'GAUTENG' as Province, address: 'Alrode, Alberton, Gauteng', isHub: true },
  { name: 'KZN Fabrication Yard', province: 'KWAZULU_NATAL' as Province, address: 'Pinetown, KwaZulu-Natal', isHub: true },
  { name: 'Western Cape Depot', province: 'WESTERN_CAPE' as Province, address: 'Epping, Cape Town', isHub: false },
];

const LEGAL_DOCUMENTS = [
  { slug: 'terms', type: 'TERMS_AND_CONDITIONS' as LegalDocumentType, title: 'Terms & Conditions' },
  { slug: 'privacy', type: 'PRIVACY_POLICY' as LegalDocumentType, title: 'Privacy Policy' },
  { slug: 'cookies', type: 'COOKIE_POLICY' as LegalDocumentType, title: 'Cookie Policy' },
  { slug: 'returns', type: 'RETURNS_REFUNDS' as LegalDocumentType, title: 'Returns & Refunds Policy' },
  { slug: 'paia-manual', type: 'PAIA_MANUAL' as LegalDocumentType, title: 'PAIA Manual' },
  { slug: 'accessibility', type: 'ACCESSIBILITY_STATEMENT' as LegalDocumentType, title: 'Accessibility Statement' },
];

const FAQ_ITEMS = [
  { question: 'How long does a made-to-order window take?', answer: 'Made-to-order units are typically fabricated in 7–10 working days before dispatch. Standard-size stock items usually leave the hub within 48 hours.', category: 'Delivery', sortOrder: 1 },
  { question: 'Do you deliver nationally?', answer: 'Yes. We deliver nationwide from our Gauteng and KZN hubs. Delivery is charged from the zone table for your province, with a fragile-handling surcharge on glass-bearing orders.', category: 'Delivery', sortOrder: 2 },
  { question: 'What payment methods do you accept?', answer: 'Card and instant EFT via PayFast, PayJustNow and LulaPay BNPL at checkout, and 30-day trade account terms for approved business customers.', category: 'Payment', sortOrder: 1 },
  { question: 'Can I return a custom-sized window?', answer: 'Custom and made-to-order units are not returnable — they are manufactured to your specification and cannot be resold. Stock items can be returned within 10 days of delivery in original condition.', category: 'Returns', sortOrder: 1 },
  { question: 'Are your products NRCS-approved?', answer: 'Every glazing package we sell is NRCS-approved under VC 9003. Structural and curtain-wall systems carry AAAMSA performance certificates, and the certificate reference is shown on the product page.', category: 'Technical Specs', sortOrder: 1 },
  { question: 'How do I apply for a trade account?', answer: 'Register as a business from the Business Desk, submit your company registration and VAT number, and our team reviews the application. Approved accounts unlock trade pricing automatically at checkout.', category: 'Ordering', sortOrder: 1 },
];

// The development passwords below are published in this repository, which is public. A seeded
// account is only created when the row is absent, so on a fresh production database these
// defaults would become the live admin and trade credentials on an internet-facing store.
// Production therefore has to supply its own, and the seed refuses to run without them.
function requireSeedPassword(envKey: string, devDefault: string): string {
  const supplied = process.env[envKey];
  if (supplied) return supplied;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `${envKey} must be set when NODE_ENV=production — the development default is published in this repository`,
    );
  }
  return devDefault;
}

// Both production-only checks run before the first write, not at the point each password is
// used. The password check used to sit three hundred lines into `main`, after the catalogue had
// been written, so a deploy missing the secret aborted with a half-seeded database: the
// storefront then rendered products the rest of the seed had not yet reached (no clearance
// lines, no CMS copy), and the failed deploy made it look like the catalogue import was at
// fault. Failing before the first write leaves the database untouched and the error names the
// missing variable.
function assertProductionSeedConfig() {
  if (process.env.NODE_ENV !== 'production') return;
  const missing = ['SEED_ADMIN_PASSWORD', 'SEED_TRADE_PASSWORD'].filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `${missing.join(', ')} must be set when NODE_ENV=production — the development defaults are published in this repository`,
    );
  }
}

async function main() {
  assertProductionSeedConfig();
  console.log(`Seeding catalogue from ${CATALOGUE.source.workbook} (sha256 ${CATALOGUE.source.sha256.slice(0, 16)}…)…`);
  console.log('Seeding catalogue taxonomy…');
  const subCategoryIds = new Map<string, string>();
  for (const c of CATALOGUE.categories) {
    const category = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description, iconKey: c.iconKey, sortOrder: c.sortOrder },
      create: { name: c.name, slug: c.slug, description: c.description, iconKey: c.iconKey, sortOrder: c.sortOrder },
    });
    for (const s of c.subCategories) {
      const sub = await prisma.subCategory.upsert({
        where: { slug: s.slug },
        update: { name: s.name, pricingBasis: s.pricingBasis, categoryId: category.id },
        create: { name: s.name, slug: s.slug, pricingBasis: s.pricingBasis, categoryId: category.id },
      });
      subCategoryIds.set(s.name, sub.id);
    }
  }
  console.log(`  ${CATALOGUE.categories.length} categories, ${subCategoryIds.size} sub-categories`);

  console.log('Seeding finishes and glazing packages…');
  const finishIds = new Map<string, string>();
  for (const f of FINISHES) {
    const finish = await prisma.finish.upsert({ where: { name: f.name }, update: f, create: f });
    finishIds.set(f.name, finish.id);
  }
  const glazingIds = new Map<string, string>();
  for (const g of GLAZING_PACKAGES) {
    const glazing = await prisma.glazingPackage.upsert({ where: { name: g.name }, update: g, create: g });
    glazingIds.set(g.name, glazing.id);
  }
  console.log(`  ${finishIds.size} finishes, ${glazingIds.size} glazing packages`);

  console.log('Seeding locations, delivery zones, compliance docs…');
  for (const l of LOCATIONS) {
    const existing = await prisma.location.findFirst({ where: { name: l.name } });
    if (!existing) await prisma.location.create({ data: l });
  }
  for (const z of DELIVERY_ZONES) {
    const existing = await prisma.deliveryZone.findFirst({ where: { province: z.province } });
    if (!existing) await prisma.deliveryZone.create({ data: z });
  }
  const compliance: { id: string }[] = [];
  for (const standard of ['AAAMSA Performance Certificate', 'NRCS VC 9003 Approval', 'SANS 10400-XA Compliance']) {
    let doc = await prisma.complianceDoc.findFirst({ where: { standard } });
    if (!doc) doc = await prisma.complianceDoc.create({ data: { standard, docType: 'Certificate', issuer: standard.split(' ')[0] } });
    compliance.push({ id: doc.id });
  }

  console.log('Seeding products…');
  const hub = await prisma.location.findFirst({ where: { isHub: true } });
  // The upsert keys on sku, so a duplicate sku does not error — the second row is silently
  // dropped while the reported count still climbs, which is how the old hand-written seed
  // claimed 33 products and stored 32. The import script rejects duplicates, but the seed is
  // also runnable against a hand-edited file, so the check stays.
  const duplicateSkus = CATALOGUE.products.map((p) => p.sku).filter((sku, i, all) => all.indexOf(sku) !== i);
  if (duplicateSkus.length > 0) {
    throw new Error(`Duplicate sku(s) in catalogue.json: ${[...new Set(duplicateSkus)].join(', ')}`);
  }
  // Products whose sub-category is absent from the taxonomy would seed with a dangling reference
  // and 500 the catalogue page rather than fail here.
  const missingSubs = [...new Set(CATALOGUE.products.map((p) => p.subCategory))].filter((s) => !subCategoryIds.has(s));
  if (missingSubs.length > 0) {
    throw new Error(`Sub-categories present in products but not in taxonomy: ${missingSubs.join(', ')}`);
  }

  // A priced product must carry a retail price. Writing baseCost into retailPrice (or leaving it
  // zero) is exactly the "cost shown as price" defect this import exists to remove, so refuse it.
  const unpriced = CATALOGUE.products.filter((p) => !(p.retailPrice > 0));
  if (unpriced.length > 0) {
    throw new Error(`${unpriced.length} product(s) have no retail price, e.g. ${unpriced[0].sku}`);
  }

  // Stock levels are seeded for the manufactured-for-stock lines only. Seeding every SKU would
  // invent inventory for made-to-order and CMI-routed lines that is never physically held.
  const STOCK_QUANTITY = 40;
  let seeded = 0;
  for (const p of CATALOGUE.products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        sku: p.sku,
        subCategoryId: subCategoryIds.get(p.subCategory)!,
        name: p.name,
        configuration: p.configuration,
        standardSize: p.standardSize,
        widthMm: p.widthMm,
        heightMm: p.heightMm,
        lengthM: p.lengthM,
        finishId: p.finish ? (finishIds.get(p.finish) ?? null) : null,
        glazingSpec: p.glazingSpec,
        unitOfSale: p.unitOfSale,
        segments: p.segments,
        fulfilmentType: p.fulfilmentType,
        frameClass: p.frameClass,
        baseCost: p.baseCost,
        markupPct: p.markupPct,
        retailPrice: p.retailPrice,
        tradePrice: p.tradePrice,
        volumePrice: p.volumePrice,
        complianceRefs: { connect: compliance.map((c) => ({ id: c.id })) },
        // No ProductImage row on purpose. The workbook carries no photography, so seeding
        // `/images/products/${sku}.jpg` invented a URL for every one of the 2,147 SKUs and every
        // catalogue tile and product page then requested a file that was never in the repository,
        // turning each listing into a column of broken images. The tiles already collapse cleanly
        // to their placeholder panel when a product has no image, which is the honest state for a
        // line that has no photograph yet; staff attach real images through the CMS as they are
        // shot. Only `create` is affected — `update: {}` leaves any existing image rows alone.
        ...(p.fulfilmentType === 'STOCK'
          ? { stockLevel: { create: { quantity: STOCK_QUANTITY, reserved: 0, reorderAt: 8, locationId: hub?.id ?? null } } }
          : {}),
      },
    });
    seeded += 1;
  }
  console.log(`  ${seeded} products`);

  console.log('Seeding legal documents, FAQ, content, ads, projects…');
  for (const d of LEGAL_DOCUMENTS) {
    // Published as a clearly-marked draft so the storefront shows real structure while making
    // plain that legal sign-off has not happened (docs/23-legal-tax-compliance.md).
    const existing = await prisma.legalDocument.findFirst({ where: { slug: d.slug, version: '0.1-draft' } });
    if (!existing) {
      await prisma.legalDocument.create({
        data: {
          slug: d.slug,
          type: d.type,
          title: d.title,
          version: '0.1-draft',
          publishedAt: new Date(),
          bodyMarkdown: `> DRAFT — awaiting sign-off by the Information Officer and tax advisor. Not a final published policy.\n\n## ${d.title}\n\nThis document is being finalised for the South African regulatory context (ECTA, POPIA, PAIA, CPA, SARS). It will be versioned, and the version accepted at checkout travels with the order.`,
        },
      });
    }
  }

  for (const f of FAQ_ITEMS) {
    const existing = await prisma.faqItem.findFirst({ where: { question: f.question } });
    if (!existing) await prisma.faqItem.create({ data: f });
  }

  const blogSlug = 'understanding-nrcs-vc-9003';
  const existingPost = await prisma.blogPost.findUnique({ where: { slug: blogSlug } });
  if (!existingPost) {
    await prisma.blogPost.create({
      data: {
        slug: blogSlug,
        title: 'Understanding NRCS VC 9003 for Safety Glazing',
        authorName: 'Aluminium Store',
        tags: ['compliance', 'glazing'],
        publishedAt: new Date(),
        body: 'VC 9003 is the compulsory specification that governs safety glazing in South Africa. Every glazing package sold through this platform is approved under it, and the configurator blocks any package that is not — because selling unapproved safety glass is not a merchandising decision, it is a legal one.',
      },
    });
  }

  for (let slot = 1; slot <= 3; slot += 1) {
    const existing = await prisma.advertisement.findFirst({ where: { slot, campaignName: `Slot ${slot} Campaign` } });
    if (!existing) {
      await prisma.advertisement.create({
        data: {
          slot,
          campaignName: `Slot ${slot} Campaign`,
          imageUrl: `/images/ads/slot-${slot}.jpg`,
          linkUrl: slot === 1 ? '/catalogue/windows' : '/catalogue/doors',
          active: true,
        },
      });
    }
  }

  const projects = [
    { title: 'Sandton Office Curtain Wall Retrofit', sector: 'COMMERCIAL' as Segment, description: 'A 1,800m² stick-system curtain wall replacement across six floors, fabricated and installed by a CMI partner with zero tenant downtime.', featured: true },
    { title: 'Umhlanga Residential Estate — 42 Units', sector: 'RESIDENTIAL' as Segment, description: 'Sliding windows and doors supplied to all 42 units in a single phased delivery.', featured: true },
  ];
  for (const p of projects) {
    const existing = await prisma.project.findFirst({ where: { title: p.title } });
    if (!existing) {
      await prisma.project.create({
        data: {
          ...p,
          completedAt: new Date(),
          // Same reasoning as the product images above: `/images/projects/…jpg` names a file that
          // does not exist in the repository, and the case-study grid requests it for every card.
          // The card's placeholder panel is the correct rendering until real project photography
          // is attached.
        },
      });
    }
  }

  for (const cb of [
    { key: 'homepage-hero-slide-1', type: 'HERO_SLIDE' as ContentType, title: 'Aluminium, engineered for the South African climate', body: 'Configure, price, and order windows, doors and architectural aluminium online.', linkUrl: '/catalogue', sortOrder: 0 },
    { key: 'announcement-ticker-main', type: 'ANNOUNCEMENT' as ContentType, title: 'IGU upgrade from R550/m²', linkUrl: '/catalogue/windows', sortOrder: 0 },
  ]) {
    await prisma.contentBlock.upsert({ where: { key: cb.key }, update: {}, create: { ...cb, published: true } });
  }

  console.log('Seeding admin, trade account, coupons and bundles…');
  const adminPassword = requireSeedPassword('SEED_ADMIN_PASSWORD', 'ChangeMe!Admin1');
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@aluminiumstore.co.za';
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Platform Admin',
      role: UserRole.ADMIN,
      passwordHash: await bcrypt.hash(adminPassword, 12),
    },
  });

  const tradeEmail = 'buyer@example-trade.co.za';
  const tradePassword = requireSeedPassword('SEED_TRADE_PASSWORD', 'ChangeMe!Trade1');
  const existingCompany = await prisma.company.findFirst({ where: { name: 'Example Fabricators (Pty) Ltd' } });
  const company = existingCompany ?? (await prisma.company.create({
    data: { name: 'Example Fabricators (Pty) Ltd', registrationNo: '2019/123456/07', vatNumber: '4123456789' },
  }));
  await prisma.tradeAccount.upsert({
    where: { companyId: company.id },
    update: {},
    create: { companyId: company.id, creditLimit: 150000, discountTier: DiscountTier.TRADE, approved: true, approvedAt: new Date() },
  });
  await prisma.user.upsert({
    where: { email: tradeEmail },
    update: {},
    create: {
      email: tradeEmail,
      name: 'Trade Buyer',
      role: UserRole.TRADE,
      passwordHash: await bcrypt.hash(tradePassword, 12),
      companyId: company.id,
      companyRole: CompanyRole.OWNER,
    },
  });

  const couponCode = 'WELCOME10';
  const existingCoupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
  if (!existingCoupon) {
    await prisma.coupon.create({
      data: { code: couponCode, type: CouponType.PERCENTAGE, value: 10, minCartValue: 2000, usageLimit: 500, active: true },
    });
  }

  // Bundle lines are named by the workbook's SKUs. The scaffold's original bundle SKUs collided
  // with real catalogue SKUs that are different products (a roller set had become a window handle),
  // so the intent is restated against the actual hardware the workbook carries.
  const bundleDefs = [
    { name: 'Starter Sliding Door Bundle', description: 'Sliding door + heavy-duty roller set + multi-point lock', discountPct: 0.08, skus: ['ALS-SLD-0001', 'ALS-HDW-0008', 'ALS-HDW-0006'] },
    { name: 'Complete Window Hardware Kit', description: 'Handle, friction hinge, and multi-point lock', discountPct: 0.1, skus: ['ALS-HDW-0001', 'ALS-HDW-0011', 'ALS-HDW-0005'] },
  ];
  for (const b of bundleDefs) {
    const existing = await prisma.bundle.findFirst({ where: { name: b.name } });
    if (existing) continue;
    const bundle = await prisma.bundle.create({
      data: { name: b.name, description: b.description, discountPct: b.discountPct, active: true },
    });
    for (const sku of b.skus) {
      const prod = await prisma.product.findUnique({ where: { sku } });
      if (prod) await prisma.bundleItem.create({ data: { bundleId: bundle.id, productId: prod.id, quantity: 1 } });
    }
  }

  // Clearance lines for the homepage "Clearance Sale" carousel. The markdown is computed from
  // each product's own retail price rather than hardcoded, so the sale price stays firmly below
  // retail — and therefore inside the Product_clearance_below_retail CHECK — however the workbook
  // import changes a given SKU's price. Only STOCK lines are cleared: made-to-order and
  // CMI-routed products are not physical stock being moved.
  console.log('Seeding clearance lines…');
  const CLEARANCE_SKUS: { sku: string; discount: number; days?: number }[] = [
    { sku: 'ALS-SLD-0001', discount: 0.25, days: 30 },
    { sku: 'ALS-CMW-0031', discount: 0.3 },
    { sku: 'ALS-HDW-0008', discount: 0.35, days: 14 },
    { sku: 'ALS-SLW-0001', discount: 0.2 },
  ];
  let cleared = 0;
  for (const c of CLEARANCE_SKUS) {
    const prod = await prisma.product.findUnique({ where: { sku: c.sku } });
    if (!prod || prod.fulfilmentType !== 'STOCK') continue;
    const retail = Number(prod.retailPrice);
    // Rounded to the cent; a discount large enough to round to zero would violate the CHECK, so
    // the floor keeps the seeded price a real positive figure rather than failing the constraint.
    const price = Math.max(1, Math.round(retail * (1 - c.discount) * 100) / 100);
    await prisma.product.update({
      where: { sku: c.sku },
      data: {
        clearancePrice: price,
        clearanceEndsAt: c.days ? new Date(Date.now() + c.days * 24 * 60 * 60 * 1000) : null,
      },
    });
    cleared += 1;
  }
  console.log(`  ${cleared} clearance lines`);

  // ---- Merchandising (docs/38-merchandising-sections.md, spec v1.0) -------------------------
  //
  // Best Sellers, Top Rated, Recently Viewed, Recommended For You and Trending are computed from
  // live data and are deliberately not seeded — fabricated sales, ratings or view history would
  // be manufactured social proof, which the Consumer Protection Act prohibits as misleading
  // marketing (s.41), and would also make the ranking sections dishonest. Only the four curated
  // sections are seeded, and each pick below is a real catalogue SKU chosen for a stated reason.
  console.log('Seeding merchandising sections…');

  // Only SKUs that a curated section actually references, so the seed does not carry dead ids.
  const productBySku = new Map<string, { id: string }>();
  for (const sku of [
    'ALS-SLW-0001', 'ALS-SLD-0001', 'ALS-CMW-0031', 'ALS-HDW-0001', 'ALS-HDW-0005',
    'ALS-HDW-0006', 'ALS-HDW-0008', 'ALS-HDW-0011', 'ALS-SCD-0001',
    'ALS-FGR-0001', 'ALS-SLT-0001', 'ALS-FXN-0001', 'ALS-EXT-0001',
  ]) {
    const p = await prisma.product.findUnique({ where: { sku }, select: { id: true } });
    if (p) productBySku.set(sku, p);
  }

  // Featured / Editor's Picks. One hero plus a supporting column; `note` is the curator's reason.
  const featuredSeed = [
    { sku: 'ALS-SLD-0001', note: 'The standard 2-panel slider is our highest-volume moving line and the one most first-time buyers configure correctly without help.', isHero: true, curator: 'Aluminium Store merchandising' },
    { sku: 'ALS-CMW-0031', note: 'A single-sash casement that suits most coastal and inland wall openings — the safest default when a buyer is unsure of the opening type.', isHero: false, curator: 'Aluminium Store merchandising' },
    { sku: 'ALS-SLW-0001', note: 'The smallest sliding window in the range. Good for a bathroom or utility opening where a full unit would be oversized.', isHero: false, curator: 'Aluminium Store merchandising' },
    { sku: 'ALS-SCD-0001', note: 'Mesh-infill sliding security door — added after repeated enquiries about a burglar-bar alternative that still matches the window frame.', isHero: false, curator: 'Aluminium Store merchandising' },
  ];
  for (const [i, f] of featuredSeed.entries()) {
    const p = productBySku.get(f.sku);
    if (!p) continue;
    const existing = await prisma.featuredProduct.findUnique({ where: { productId: p.id } });
    if (existing) continue;
    if (f.isHero) {
      // Idempotent re-seed: demote any hero left by a previous run before promoting this one.
      await prisma.featuredProduct.updateMany({ where: { isHero: true }, data: { isHero: false } });
    }
    await prisma.featuredProduct.create({
      data: { productId: p.id, note: f.note, curator: f.curator, isHero: f.isHero, sortOrder: i, published: true },
    });
  }

  // Seasonal / Thematic Collections. Items are grouped by sub-category of the SKUs above, so the
  // note on each line is about the theme rather than a repeated product description.
  const collectionsSeed = [
    {
      slug: 'coastal-specification-2026',
      title: 'Coastal Specification 2026',
      description: 'Units specified for salt-laden air along the KwaZulu-Natal and Western Cape coastlines, where corrosion resistance drives the finish choice.',
      season: 'Summer 2026',
      accentHex: '#1F4E5F',
      notes: 'Sea air attacks unprotected aluminium; these lines are specified with a coating standard suited to it.',
      skus: ['ALS-SLW-0001', 'ALS-CMW-0031', 'ALS-SCD-0001', 'ALS-SLD-0001'],
    },
    {
      slug: 'access-hardware-refresh',
      title: 'Access & Hardware Refresh',
      description: 'The handles, locks and rollers that are replaced most often on an existing installation — the parts a maintenance buyer reorders.',
      season: null,
      accentHex: '#5A4632',
      notes: 'Worn ironmongery is the most common reason a working door starts to feel faulty.',
      skus: ['ALS-HDW-0001', 'ALS-HDW-0005', 'ALS-HDW-0006', 'ALS-HDW-0008', 'ALS-HDW-0011'],
    },
    {
      slug: 'weatherproofing-and-finishing',
      title: 'Weatherproofing & Finishing',
      description: 'Sealants, fixings and rainwater profiles for closing up an installation — the consumables that finish a job.',
      season: null,
      accentHex: '#3F4A45',
      notes: 'The last 5% of a job is where most water ingress complaints originate.',
      skus: ['ALS-SLT-0001', 'ALS-FXN-0001', 'ALS-FGR-0001', 'ALS-EXT-0001'],
    },
  ];
  for (const [i, c] of collectionsSeed.entries()) {
    const existing = await prisma.collection.findUnique({ where: { slug: c.slug } });
    if (existing) continue;
    const itemData = c.skus
      .map((sku, idx) => {
        const p = productBySku.get(sku);
        return p ? { productId: p.id, note: c.notes, sortOrder: idx } : null;
      })
      .filter((x): x is { productId: string; note: string; sortOrder: number } => x !== null);
    if (itemData.length === 0) continue;
    await prisma.collection.create({
      data: {
        slug: c.slug,
        title: c.title,
        description: c.description,
        season: c.season,
        accentHex: c.accentHex,
        sortOrder: i,
        published: true,
        items: { create: itemData },
      },
    });
  }

  // "Complete the Project" pairings. Ordered pairs, both directions seeded where both readings
  // are useful, since the note differs by direction.
  const pairingsSeed = [
    { source: 'ALS-SLD-0001', target: 'ALS-HDW-0008', note: 'The roller set the slider is specified with — the standard pairing for this door weight.' },
    { source: 'ALS-SLD-0001', target: 'ALS-HDW-0006', note: 'High-security multi-point lock option for an entrance-facing slider.' },
    { source: 'ALS-SLW-0001', target: 'ALS-HDW-0011', note: 'Friction hinge for the opening sash of this window.' },
    { source: 'ALS-CMW-0031', target: 'ALS-HDW-0011', note: 'Casement friction hinge — required for the side-hung sash.' },
    { source: 'ALS-CMW-0031', target: 'ALS-HDW-0001', note: 'Standard lever handle to match the casement frame.' },
    { source: 'ALS-HDW-0008', target: 'ALS-SLD-0001', note: 'Fits the 2-panel slider in this range.' },
    { source: 'ALS-HDW-0008', target: 'ALS-HDW-0006', note: 'Frequently replaced together when a slider is serviced.' },
    { source: 'ALS-SCD-0001', target: 'ALS-HDW-0006', note: 'Security door lock upgrade.' },
    { source: 'ALS-FGR-0001', target: 'ALS-SLT-0001', note: 'Fascia joints are sealed with a neutral-cure silicone.' },
    { source: 'ALS-EXT-0001', target: 'ALS-FXN-0001', note: 'Self-drilling screws for fixing this profile.' },
  ];
  let pairingCount = 0;
  for (const [i, pair] of pairingsSeed.entries()) {
    const source = productBySku.get(pair.source);
    const target = productBySku.get(pair.target);
    if (!source || !target) continue;
    const existing = await prisma.productPairing.findUnique({
      where: { sourceId_targetId: { sourceId: source.id, targetId: target.id } },
    });
    if (existing) continue;
    await prisma.productPairing.create({
      data: { sourceId: source.id, targetId: target.id, note: pair.note, sortOrder: i },
    });
    pairingCount += 1;
  }

  // Deals of the Day. dealPrice is computed from each product's own retail price rather than
  // hardcoded, so it stays below retail however the workbook import changes a SKU's price. Only
  // STOCK lines: made-to-order and CMI-routed products are not physical stock being cleared.
  //
  // Each line is a hardware/small-item SKU, deliberately distinct from the four clearance lines
  // seeded above — a Daily Deal advertises a price while the clearance price lives on the product
  // record, so putting both on one product would advertise two different prices for it. These
  // three carry no clearance markdown.
  const dealsSeed = [
    { sku: 'ALS-HDW-0006', discount: 0.15, stockLimit: 25, headline: 'High-security multi-point lock' },
    { sku: 'ALS-SLT-0001', discount: 0.2, stockLimit: 60, headline: 'Neutral-cure silicone sealant' },
    { sku: 'ALS-FXN-0001', discount: 0.18, stockLimit: 40, headline: 'Self-drilling screws, box of 500' },
  ];
  const now = Date.now();
  let dealCount = 0;
  for (const d of dealsSeed) {
    const product = await prisma.product.findUnique({
      where: { sku: d.sku },
      select: { id: true, retailPrice: true, clearancePrice: true, fulfilmentType: true },
    });
    if (!product || product.fulfilmentType !== 'STOCK') continue;
    // Refuse to stack a deal on a clearance line: two advertised prices for one product is the
    // discrepancy the CPA's price-display rules exist to prevent.
    if (product.clearancePrice != null) continue;
    const retail = Number(product.retailPrice);
    // Rounded to the cent; a discount large enough to round to zero would violate the CHECK, so
    // the same floor the clearance seed uses keeps the price a real positive figure.
    const dealPrice = Math.max(1, Math.round(retail * (1 - d.discount) * 100) / 100);
    const existing = await prisma.dailyDeal.findFirst({ where: { productId: product.id } });
    if (existing) continue;
    await prisma.dailyDeal.create({
      data: {
        productId: product.id,
        dealPrice,
        stockLimit: d.stockLimit,
        claimed: 0,
        headline: d.headline,
        // A rolling 24-hour window anchored at seed time, so a freshly seeded environment always
        // has at least one live countdown to render.
        startsAt: new Date(now - 60 * 60 * 1000),
        endsAt: new Date(now + 23 * 60 * 60 * 1000),
        published: true,
      },
    });
    dealCount += 1;
  }
  // Counts are the table totals, not the rows this run created. The seed is idempotent, so a
  // second run creates nothing and a "created" count would print `0 pairings` while ten exist —
  // which reads as a failed seed rather than an already-seeded one.
  const [pairingTotal, dealTotal] = await Promise.all([
    prisma.productPairing.count(),
    prisma.dailyDeal.count(),
  ]);
  console.log(`  ${featuredSeed.length} featured picks, ${collectionsSeed.length} collections, ${pairingTotal} pairings (${pairingCount} new), ${dealTotal} daily deals (${dealCount} new)`);

  console.log('Seeding CMI partners…');
  const partners = [
    { name: 'Cape Facade Works', province: 'WESTERN_CAPE' as Province, capabilities: ['Curtain Walling', 'Structural Glazing'], capacityM2PerMonth: 1200 },
    { name: 'Highveld Aluminium Projects', province: 'GAUTENG' as Province, capabilities: ['Shopfront Systems', 'Carports & Canopies'], capacityM2PerMonth: 900 },
    { name: 'Coastal Glazing Contractors', province: 'KWAZULU_NATAL' as Province, capabilities: ['Curtain Walling', 'Pergolas'], capacityM2PerMonth: 750 },
  ];
  for (const partner of partners) {
    const existing = await prisma.cMIPartner.findFirst({ where: { name: partner.name } });
    if (!existing) {
      await prisma.cMIPartner.create({
        data: { ...partner, vettedSince: new Date(), nrcsApproved: true, aaamsaMember: true, active: true },
      });
    }
  }

  console.log('Seed complete.');
  if (process.env.NODE_ENV !== 'production') {
    console.log(`  Admin login: ${adminEmail} / ${adminPassword}`);
    console.log(`  Trade login: ${tradeEmail} / ${tradePassword}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());