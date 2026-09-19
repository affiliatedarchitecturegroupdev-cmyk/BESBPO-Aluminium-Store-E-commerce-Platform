/**
 * Seed script — the minimum coherent dataset the storefront needs to render and transact.
 *
 * Deliberately NOT the full 2,147-SKU catalogue: the Master Product Catalogue workbook remains
 * the canonical source and is imported by the CMS (docs/04-catalogue-cms.md). What this seeds is
 * the structural backbone — the 7 categories, their sub-categories with the real pricing bases,
 * the 5 standard finishes, the NRCS-approved glazing packages, delivery zones, legal document
 * stubs, and a representative product sample — enough that every page has something to show and
 * the configurator can be exercised end-to-end.
 *
 * Sub-category and finish names match `pricing-service/assumptions.json` exactly; a mismatch
 * here is the most likely cause of a 422 from the pricing service.
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

const prisma = new PrismaClient();

type SubCategorySeed = { name: string; slug: string; pricingBasis: PricingBasis };
type CategorySeed = { name: string; slug: string; iconKey: string; description: string; subCategories: SubCategorySeed[] };

const CATEGORIES: CategorySeed[] = [
  {
    name: 'Windows',
    slug: 'windows',
    iconKey: 'window',
    description: 'Sliding, casement, awning, louvre, tilt & turn, and bay/bow units.',
    subCategories: [
      { name: 'Sliding Windows', slug: 'sliding-windows', pricingBasis: 'FRAME_GLAZED' },
      { name: 'Casement Windows', slug: 'casement-windows', pricingBasis: 'FRAME_GLAZED' },
      { name: 'Awning Windows', slug: 'awning-windows', pricingBasis: 'FRAME_GLAZED' },
      { name: 'Hopper Windows', slug: 'hopper-windows', pricingBasis: 'FRAME_GLAZED' },
      { name: 'Louvre Windows', slug: 'louvre-windows', pricingBasis: 'FRAME_GLAZED' },
      { name: 'Fixed / Picture Windows', slug: 'fixed-picture-windows', pricingBasis: 'FRAME_GLAZED' },
      { name: 'Tilt & Turn Windows', slug: 'tilt-turn-windows', pricingBasis: 'FRAME_GLAZED' },
      { name: 'Bay & Bow Window Units', slug: 'bay-bow-window-units', pricingBasis: 'FRAME_GLAZED' },
    ],
  },
  {
    name: 'Doors',
    slug: 'doors',
    iconKey: 'door',
    description: 'Sliding, stacking, hinged, French, pivot and security doors.',
    subCategories: [
      { name: 'Sliding Doors', slug: 'sliding-doors', pricingBasis: 'FRAME_GLAZED' },
      { name: 'Stacking & Folding Doors', slug: 'stacking-folding-doors', pricingBasis: 'FRAME_GLAZED' },
      { name: 'Hinged / Casement Doors', slug: 'hinged-casement-doors', pricingBasis: 'FRAME_GLAZED' },
      { name: 'French Doors', slug: 'french-doors', pricingBasis: 'FRAME_GLAZED' },
      { name: 'Pivot Doors', slug: 'pivot-doors', pricingBasis: 'FRAME_GLAZED' },
      { name: 'Security & Screen Doors', slug: 'security-screen-doors', pricingBasis: 'FRAME_ONLY' },
    ],
  },
  {
    name: 'Facade & Structural Systems',
    slug: 'facade-structural-systems',
    iconKey: 'facade',
    description: 'Curtain walling, shopfront systems and structural glazing — predominantly CMI-routed work.',
    subCategories: [
      { name: 'Curtain Walling', slug: 'curtain-walling', pricingBasis: 'FOOTPRINT_FRAME' },
      { name: 'Shopfront Systems', slug: 'shopfront-systems', pricingBasis: 'FRAME_GLAZED' },
      { name: 'Structural Glazing', slug: 'structural-glazing', pricingBasis: 'FRAME_GLAZED' },
    ],
  },
  {
    name: 'Outdoor Living & Shading',
    slug: 'outdoor-living-shading',
    iconKey: 'outdoor',
    description: 'Pergolas, carports, awnings and privacy screens.',
    subCategories: [
      { name: 'Pergolas', slug: 'pergolas', pricingBasis: 'FOOTPRINT_FRAME' },
      { name: 'Carports & Canopies', slug: 'carports-canopies', pricingBasis: 'FOOTPRINT_FRAME' },
      { name: 'Awnings & Canopy Shading', slug: 'awnings-canopy-shading', pricingBasis: 'LENGTH_RUN' },
      { name: 'Louvres & Privacy Screens', slug: 'louvres-privacy-screens', pricingBasis: 'RATE_CARD' },
    ],
  },
  {
    name: 'Railing & Screening Systems',
    slug: 'railing-screening-systems',
    iconKey: 'railing',
    description: 'Balustrades, handrails and screening systems.',
    subCategories: [
      { name: 'Balcony & Juliet Balustrades', slug: 'balcony-juliet-balustrades', pricingBasis: 'LENGTH_RUN' },
      { name: 'Stair & Ramp Balustrades', slug: 'stair-ramp-balustrades', pricingBasis: 'LENGTH_RUN' },
      { name: 'Handrails & Wall Rails', slug: 'handrails-wall-rails', pricingBasis: 'LENGTH_RUN' },
    ],
  },
  {
    name: 'Roofing Glazing & Garage Doors',
    slug: 'roofing-glazing-garage-doors',
    iconKey: 'roofing',
    description: 'Skylights, roof glazing and garage door systems.',
    subCategories: [
      { name: 'Skylights & Roof Glazing', slug: 'skylights-roof-glazing', pricingBasis: 'FRAME_GLAZED' },
      { name: 'Garage Doors', slug: 'garage-doors', pricingBasis: 'RATE_CARD' },
    ],
  },
  {
    name: 'Raw Material & Hardware',
    slug: 'raw-material-hardware',
    iconKey: 'materials',
    description: 'Extrusion profiles, hardware, glazing, sealants and fixings.',
    subCategories: [
      { name: 'Extrusion Profiles & Raw Stock', slug: 'extrusion-profiles-raw-stock', pricingBasis: 'EXTRUSION_LENGTH' },
      { name: 'Hardware & Ironmongery', slug: 'hardware-ironmongery', pricingBasis: 'RATE_CARD' },
      { name: 'Glazing & Glass', slug: 'glazing-glass', pricingBasis: 'RATE_CARD' },
      { name: 'Sealants, Gaskets & Weatherproofing', slug: 'sealants-gaskets-weatherproofing', pricingBasis: 'RATE_CARD' },
      { name: 'Fixings, Fasteners & Brackets', slug: 'fixings-fasteners-brackets', pricingBasis: 'RATE_CARD' },
    ],
  },
];

const FINISHES = [
  { name: 'Natural Anodised', hex: '#C8CDD2', costPerM2: 25, qualanod: true, qualicoat: false },
  { name: 'Satin White (RAL 9016)', hex: '#F1F0EA', costPerM2: 38, qualicoat: true, qualanod: false },
  { name: 'Charcoal Grey (RAL 7016)', hex: '#383E42', costPerM2: 38, qualicoat: true, qualanod: false },
  { name: 'Graphite Black (RAL 9005)', hex: '#0E0E10', costPerM2: 40, qualicoat: true, qualanod: false },
  { name: 'Bronze Anodised', hex: '#4A3B2A', costPerM2: 55, qualanod: true, qualicoat: false },
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

type ProductSeed = {
  sub: string;
  sku: string;
  name: string;
  configuration: string;
  warrantyMm: number;
  warrantyHeightMm: number;
  baseCost: number;
  unitOfSale: UnitOfSale;
  fulfilmentType: FulfilmentType;
  segments: Segment[];
  glazingSpec?: string;
  lengthM?: number;
  description: string;
};

// Standard sizes are the AAAMSA-tested ones already used in the spec docs. baseCost values for
// the frame-glazed lines match the figures verified against the pricing service.
const PRODUCTS: ProductSeed[] = [
  { sub: 'Sliding Windows', sku: 'ALS-SLW-0001', name: 'Sliding Window — 2-Pane', configuration: '2-Pane Slider', warrantyMm: 1209, warrantyHeightMm: 909, baseCost: 3944.27, unitOfSale: 'EACH', fulfilmentType: 'STOCK', segments: [Segment.RESIDENTIAL, Segment.COMMERCIAL], glazingSpec: 'Standard Single-Glazed (4mm Clear Float)', description: 'Two-pane horizontal slider with smooth nylon rollers and a multi-point lock.' },
  { sub: 'Sliding Windows', sku: 'ALS-SLW-0002', name: 'Sliding Window — 3-Pane', configuration: '3-Pane Slider', warrantyMm: 1809, warrantyHeightMm: 1209, baseCost: 5820.0, unitOfSale: 'EACH', fulfilmentType: 'STOCK', segments: [Segment.RESIDENTIAL], glazingSpec: 'Standard Single-Glazed (4mm Clear Float)', description: 'Three-pane slider for wider openings, with a central fixed pane.' },
  { sub: 'Casement Windows', sku: 'ALS-CMW-0001', name: 'Casement Window — Top-Hung', configuration: 'Top-Hung Casement', warrantyMm: 1209, warrantyHeightMm: 1209, baseCost: 4713.73, unitOfSale: 'EACH', fulfilmentType: 'STOCK', segments: [Segment.RESIDENTIAL, Segment.COMMERCIAL], glazingSpec: 'Standard Single-Glazed (4mm Clear Float)', description: 'Outward-opening top-hung casement with friction stay and egress limit.' },
  { sub: 'Awning Windows', sku: 'ALS-AWN-0001', name: 'Awning Window — Single Panel', configuration: 'Single-Panel Awning', warrantyMm: 909, warrantyHeightMm: 909, baseCost: 3610.0, unitOfSale: 'EACH', fulfilmentType: 'STOCK', segments: [Segment.RESIDENTIAL], glazingSpec: 'Standard Single-Glazed (4mm Clear Float)', description: 'Top-hung awning window that can stay open in light rain.' },
  { sub: 'Fixed / Picture Windows', sku: 'ALS-FIX-0001', name: 'Fixed Picture Window', configuration: 'Fixed Frame', warrantyMm: 1809, warrantyHeightMm: 1209, baseCost: 4200.0, unitOfSale: 'EACH', fulfilmentType: 'STOCK', segments: [Segment.RESIDENTIAL, Segment.COMMERCIAL], glazingSpec: 'Standard Single-Glazed (4mm Clear Float)', description: 'Uninterrupted fixed frame for views and light.' },
  { sub: 'Tilt & Turn Windows', sku: 'ALS-TTW-0001', name: 'Tilt & Turn Window', configuration: 'Tilt & Turn', warrantyMm: 1209, warrantyHeightMm: 1209, baseCost: 9880.0, unitOfSale: 'EACH', fulfilmentType: 'MADE_TO_ORDER', segments: [Segment.COMMERCIAL, Segment.INSTITUTIONAL], glazingSpec: 'IGU Double-Glazed (4-12Ar-4 Low-E)', description: 'Dual-action sash — tilts for ventilation, turns for full opening.' },
  { sub: 'Bay & Bow Window Units', sku: 'ALS-BBW-0001', name: 'Bay Window Unit — 5-Panel Bow', configuration: '5-Panel Bow', warrantyMm: 2409, warrantyHeightMm: 1509, baseCost: 38200.0, unitOfSale: 'EACH', fulfilmentType: 'MADE_TO_ORDER', segments: [Segment.RESIDENTIAL], glazingSpec: 'Standard Single-Glazed (4mm Clear Float)', description: 'Five-panel bow unit that projects out to gain floor area and light.' },
  { sub: 'Sliding Doors', sku: 'ALS-SLD-0001', name: 'Sliding Door — 2-Panel', configuration: '2-Panel Slider', warrantyMm: 1809, warrantyHeightMm: 2090, baseCost: 11621.0, unitOfSale: 'EACH', fulfilmentType: 'MADE_TO_ORDER', segments: [Segment.RESIDENTIAL, Segment.COMMERCIAL], glazingSpec: 'Standard Single-Glazed (4mm Clear Float)', description: 'Full-height sliding door with a flush floor track option.' },
  { sub: 'Stacking & Folding Doors', sku: 'ALS-SFD-0001', name: 'Stacking Folding Door — 4-Panel', configuration: '4-Panel Stacker', warrantyMm: 3009, warrantyHeightMm: 2409, baseCost: 28400.0, unitOfSale: 'EACH', fulfilmentType: 'MADE_TO_ORDER', segments: [Segment.RESIDENTIAL, Segment.COMMERCIAL], glazingSpec: 'IGU Double-Glazed (4-12Ar-4 Low-E)', description: 'Four-panel stacking system that folds clear of the opening.' },
  { sub: 'Hinged / Casement Doors', sku: 'ALS-HGD-0001', name: 'Hinged Door — Single', configuration: 'Single Leaf', warrantyMm: 909, warrantyHeightMm: 2090, baseCost: 6240.0, unitOfSale: 'EACH', fulfilmentType: 'STOCK', segments: [Segment.RESIDENTIAL], glazingSpec: 'Standard Single-Glazed (4mm Clear Float)', description: 'Residential single-leaf entrance or utility door.' },
  { sub: 'French Doors', sku: 'ALS-FRD-0001', name: 'French Door Pair', configuration: 'Double Leaf', warrantyMm: 1809, warrantyHeightMm: 2090, baseCost: 14200.0, unitOfSale: 'EACH', fulfilmentType: 'MADE_TO_ORDER', segments: [Segment.RESIDENTIAL], glazingSpec: '6.38mm Laminated Safety', description: 'Double-leaf French doors opening from the centre.' },
  { sub: 'Pivot Doors', sku: 'ALS-PVD-0001', name: 'Pivot Entrance Door', configuration: 'Single Pivot', warrantyMm: 1509, warrantyHeightMm: 2700, baseCost: 20734.0, unitOfSale: 'EACH', fulfilmentType: 'MADE_TO_ORDER', segments: [Segment.COMMERCIAL, Segment.RESIDENTIAL], glazingSpec: '6.38mm Laminated Safety', description: 'Floor-to-ceiling pivot door for a statement entrance.' },
  { sub: 'Security & Screen Doors', sku: 'ALS-SSD-0001', name: 'Security Screen Door', configuration: 'Single Leaf, Stainless Mesh', warrantyMm: 909, warrantyHeightMm: 2090, baseCost: 5400.0, unitOfSale: 'EACH', fulfilmentType: 'STOCK', segments: [Segment.RESIDENTIAL, Segment.INDUSTRIAL], glazingSpec: 'Stainless Security Mesh', description: 'Retrofits over an existing door; stainless mesh on an aluminium frame.' },
  { sub: 'Curtain Walling', sku: 'ALS-CWL-0001', name: 'Stick-System Curtain Wall', configuration: 'Mullion-Transom, 50mm', warrantyMm: 3000, warrantyHeightMm: 3600, baseCost: 12800.0, unitOfSale: 'PER_M2', fulfilmentType: 'CMI_PARTNER_NETWORK', segments: [Segment.COMMERCIAL], glazingSpec: 'IGU Double-Glazed (4-12Ar-4 Low-E)', description: 'Stick-system curtain wall, project-fabricated and installed by a vetted CMI partner.' },
  { sub: 'Shopfront Systems', sku: 'ALS-SHP-0001', name: 'Shopfront Framing System', configuration: 'Ground-Floor Shopfront', warrantyMm: 2400, warrantyHeightMm: 2700, baseCost: 8600.0, unitOfSale: 'PER_M2', fulfilmentType: 'CMI_PARTNER_NETWORK', segments: [Segment.COMMERCIAL], glazingSpec: '10mm Toughened Glass', description: 'Retail shopfront system with a concealed fixing detail.' },
  { sub: 'Pergolas', sku: 'ALS-PRG-0001', name: 'Adjustable Louvre-Roof Pergola', configuration: 'Aluminium Louvre Roof', warrantyMm: 4000, warrantyHeightMm: 3000, baseCost: 65859.0, unitOfSale: 'EACH', fulfilmentType: 'MADE_TO_ORDER', segments: [Segment.RESIDENTIAL], description: 'Motorised louvre roof that opens and closes with the weather.' },
  { sub: 'Carports & Canopies', sku: 'ALS-CPT-0001', name: 'Cantilever Carport', configuration: 'Double Bay, Cantilever', warrantyMm: 5400, warrantyHeightMm: 3000, baseCost: 42300.0, unitOfSale: 'EACH', fulfilmentType: 'CMI_PARTNER_NETWORK', segments: [Segment.RESIDENTIAL, Segment.COMMERCIAL], description: 'Cantilever carport with no front posts, installed by a CMI partner.' },
  { sub: 'Balcony & Juliet Balustrades', sku: 'ALS-BAL-0001', name: 'Glass-Infill Balustrade', configuration: 'Post & Handrail, Glass Infill', warrantyMm: 1500, warrantyHeightMm: 1100, baseCost: 2850.0, unitOfSale: 'PER_LINEAR_METRE', fulfilmentType: 'MADE_TO_ORDER', segments: [Segment.RESIDENTIAL, Segment.COMMERCIAL], description: 'Frameless-look glass infill balustrade, supplied per running metre.' },
  { sub: 'Skylights & Roof Glazing', sku: 'ALS-SKY-0001', name: 'Ridge Skylight Strip', configuration: 'Continuous Ridge Unit', warrantyMm: 1200, warrantyHeightMm: 900, baseCost: 14300.0, unitOfSale: 'EACH', fulfilmentType: 'MADE_TO_ORDER', segments: [Segment.RESIDENTIAL, Segment.COMMERCIAL], glazingSpec: '10mm Toughened Glass', description: 'Continuous ridge skylight for stairwells and double-volume spaces.' },
  { sub: 'Garage Doors', sku: 'ALS-GDR-0001', name: 'Sectional Garage Door', configuration: '5-Panel Sectional', warrantyMm: 4900, warrantyHeightMm: 2100, baseCost: 18900.0, unitOfSale: 'EACH', fulfilmentType: 'STOCK', segments: [Segment.RESIDENTIAL], description: 'Insulated sectional door with a motor-ready shaft.' },
  { sub: 'Extrusion Profiles & Raw Stock', sku: 'ALS-EXT-0001', name: 'Box Section 40×40mm', configuration: 'Mill Finish, 6m Length', warrantyMm: 0, warrantyHeightMm: 0, baseCost: 218.0, unitOfSale: 'PER_LINEAR_METRE', fulfilmentType: 'STOCK', segments: [Segment.COMMERCIAL, Segment.INDUSTRIAL], lengthM: 6, description: 'General-purpose 40×40 box section, sold by the linear metre.' },
  { sub: 'Extrusion Profiles & Raw Stock', sku: 'ALS-EXT-0002', name: 'Flat Bar 25×3mm', configuration: 'Mill Finish, 6m Length', warrantyMm: 0, warrantyHeightMm: 0, baseCost: 74.0, unitOfSale: 'PER_LINEAR_METRE', fulfilmentType: 'STOCK', segments: [Segment.INDUSTRIAL], lengthM: 6, description: 'Flat bar for brackets and frame reinforcement.' },
  { sub: 'Hardware & Ironmongery', sku: 'ALS-HDW-0001', name: 'Window Handle — Multi-Point', configuration: 'Charcoal Grey, Lockable', warrantyMm: 0, warrantyHeightMm: 0, baseCost: 385.0, unitOfSale: 'EACH', fulfilmentType: 'STOCK', segments: [Segment.RESIDENTIAL, Segment.COMMERCIAL], description: 'Lockable multi-point window handle, matching the standard finish range.' },
  { sub: 'Hardware & Ironmongery', sku: 'ALS-HDW-0002', name: 'Heavy-Duty Sliding Door Roller Set', configuration: 'Stainless, Twin Tandem', warrantyMm: 0, warrantyHeightMm: 0, baseCost: 640.0, unitOfSale: 'PER_SET', fulfilmentType: 'STOCK', segments: [Segment.RESIDENTIAL, Segment.COMMERCIAL], description: 'Twin tandem roller set for doors up to 120kg per leaf.' },
  { sub: 'Hardware & Ironmongery', sku: 'ALS-HDW-0003', name: 'Friction Stay Hinge', configuration: '14-inch, Stainless', warrantyMm: 0, warrantyHeightMm: 0, baseCost: 210.0, unitOfSale: 'EACH', fulfilmentType: 'STOCK', segments: [Segment.RESIDENTIAL], description: 'Stainless friction stay for casement and awning vents.' },
  { sub: 'Hardware & Ironmongery', sku: 'ALS-HDW-0004', name: 'Multi-Point Lock', configuration: '3-Point, Handle Included', warrantyMm: 0, warrantyHeightMm: 0, baseCost: 1290.0, unitOfSale: 'EACH', fulfilmentType: 'STOCK', segments: [Segment.RESIDENTIAL, Segment.COMMERCIAL], description: 'Three-point locking for entrance and sliding doors.' },
  { sub: 'Glazing & Glass', sku: 'ALS-GLS-0001', name: 'Float Glass — Clear 6mm', configuration: 'Cut to Size', warrantyMm: 0, warrantyHeightMm: 0, baseCost: 295.0, unitOfSale: 'PER_M2', fulfilmentType: 'STOCK', segments: [Segment.COMMERCIAL, Segment.RESIDENTIAL], glazingSpec: 'Float Glass — Clear 6mm', description: 'Clear float glass, cut to size.' },
  { sub: 'Glazing & Glass', sku: 'ALS-GLS-0002', name: 'Toughened Safety Glass 10mm', configuration: 'Cut to Size', warrantyMm: 0, warrantyHeightMm: 0, baseCost: 780.0, unitOfSale: 'PER_M2', fulfilmentType: 'STOCK', segments: [Segment.COMMERCIAL], glazingSpec: 'Toughened Safety Glass — Clear 10mm', description: 'Toughened safety glass for shopfronts and balustrades.' },
  { sub: 'Glazing & Glass', sku: 'ALS-GLS-0003', name: 'IGU Double-Glazed 4-12Ar-4 Low-E', configuration: 'Cut to Size', warrantyMm: 0, warrantyHeightMm: 0, baseCost: 950.0, unitOfSale: 'PER_M2', fulfilmentType: 'STOCK', segments: [Segment.RESIDENTIAL, Segment.COMMERCIAL], glazingSpec: 'Insulated Glass Unit (IGU) — Double-Glazed 4-12Ar-4 Low-E', description: 'Argon-filled low-E insulating glass unit.' },
  { sub: 'Sealants, Gaskets & Weatherproofing', sku: 'ALS-SEL-0001', name: 'Silicone Sealant — Neutral Cure', configuration: '310ml Cartridge', warrantyMm: 0, warrantyHeightMm: 0, baseCost: 118.0, unitOfSale: 'EACH', fulfilmentType: 'STOCK', segments: [Segment.COMMERCIAL, Segment.INDUSTRIAL], description: 'Neutral-cure silicone for aluminium and glass interfaces.' },
  { sub: 'Sealants, Gaskets & Weatherproofing', sku: 'ALS-SEL-0002', name: 'Glazing Gasket — EPDM', configuration: 'Per Metre', warrantyMm: 0, warrantyHeightMm: 0, baseCost: 22.0, unitOfSale: 'PER_LINEAR_METRE', fulfilmentType: 'STOCK', segments: [Segment.COMMERCIAL, Segment.RESIDENTIAL], description: 'EPDM glazing gasket, sold by the metre.' },
  { sub: 'Fixings, Fasteners & Brackets', sku: 'ALS-FIX-0001', name: 'Self-Drilling Screw — 8×25mm', configuration: 'Box of 500', warrantyMm: 0, warrantyHeightMm: 0, baseCost: 385.0, unitOfSale: 'PER_PACK', fulfilmentType: 'STOCK', segments: [Segment.INDUSTRIAL, Segment.COMMERCIAL], description: 'Zinc-plated self-drilling screws for aluminium assembly.' },
  { sub: 'Fixings, Fasteners & Brackets', sku: 'ALS-FIX-0002', name: 'Balustrade Bracket', configuration: 'Floor-Mount, Stainless', warrantyMm: 0, warrantyHeightMm: 0, baseCost: 240.0, unitOfSale: 'EACH', fulfilmentType: 'STOCK', segments: [Segment.COMMERCIAL, Segment.RESIDENTIAL], description: 'Floor-mount stainless bracket for post-and-handrail balustrades.' },
];

async function main() {
  console.log('Seeding catalogue taxonomy…');
  const subCategoryIds = new Map<string, string>();
  for (const [ci, c] of CATEGORIES.entries()) {
    const category = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description, iconKey: c.iconKey, sortOrder: ci },
      create: { name: c.name, slug: c.slug, description: c.description, iconKey: c.iconKey, sortOrder: ci },
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
  console.log(`  ${CATEGORIES.length} categories, ${subCategoryIds.size} sub-categories`);

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
  for (const p of PRODUCTS) {
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        sku: p.sku,
        subCategoryId: subCategoryIds.get(p.sub)!,
        name: p.name,
        configuration: p.configuration,
        standardSize: p.warrantyMm ? `${p.warrantyMm}×${p.warrantyHeightMm}mm` : null,
        widthMm: p.warrantyMm || null,
        heightMm: p.warrantyHeightMm || null,
        lengthM: p.lengthM ?? null,
        finishId: finishIds.get('Natural Anodised') ?? null,
        glazingSpec: p.glazingSpec ?? null,
        unitOfSale: p.unitOfSale,
        segments: p.segments,
        fulfilmentType: p.fulfilmentType,
        baseCost: p.baseCost,
        complianceRefs: { connect: compliance.map((c) => ({ id: c.id })) },
        images: {
          create: [{ url: `/images/products/${p.sku}.jpg`, altText: p.name, sortOrder: 0 }],
        },
        ...(p.fulfilmentType === 'STOCK'
          ? { stockLevel: { create: { quantity: 40, reserved: 0, reorderAt: 8, locationId: hub?.id ?? null } } }
          : {}),
      },
    });
    void product;
  }
  console.log(`  ${PRODUCTS.length} products`);

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
          images: { create: [{ url: `/images/projects/${p.title.replace(/\W+/g, '-').toLowerCase()}.jpg`, caption: p.title, sortOrder: 0 }] },
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
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe!Admin1';
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
  const tradePassword = process.env.SEED_TRADE_PASSWORD ?? 'ChangeMe!Trade1';
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

  const bundleDefs = [
    { name: 'Starter Sliding Door Bundle', description: 'Door + heavy-duty roller set + multi-point lock', discountPct: 0.08, skus: ['ALS-SLD-0001', 'ALS-HDW-0002', 'ALS-HDW-0004'] },
    { name: 'Complete Window Hardware Kit', description: 'Handle, friction stay, and multi-point lock', discountPct: 0.1, skus: ['ALS-HDW-0001', 'ALS-HDW-0003', 'ALS-HDW-0004'] },
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
  console.log(`  Admin login: ${adminEmail} / ${adminPassword}`);
  console.log(`  Trade login: ${tradeEmail} / ${tradePassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());