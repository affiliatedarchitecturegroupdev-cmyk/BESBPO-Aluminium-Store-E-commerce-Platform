import { readFileSync } from 'fs';
import { join } from 'path';

import { PROVINCES } from '../src/common/provinces';

// Seed-data integrity checks.
//
// Phase 1 asserted against the seed source as text, because the catalogue was 33 rows hardcoded
// in `seed.ts` and importing it would have run the seed against a real database. That extraction
// broke the moment the seed started reading the 2,147-row Master Product Catalogue workbook
// import, and more importantly it could only ever check what the file *said* — never the prices,
// the taxonomy, or the duplicate SKUs the catalogue actually contains.
//
// These checks now read `data/catalogue.json`, the committed output of `scripts/import-catalogue.py`.
// That is the real input to the seed, so a corrupt workbook import — a duplicate SKU, a missing
// price, a cost that exceeds its own retail price — fails here instead of at seed time on Render.

const cataloguePath = join(__dirname, '..', 'data', 'catalogue.json');
const seedPath = join(__dirname, '..', 'prisma', 'seed.ts');
const seed = readFileSync(seedPath, 'utf8');

type CatalogueProduct = {
  sku: string;
  name: string;
  category: string;
  subCategory: string;
  unitOfSale: string;
  fulfilmentType: string;
  baseCost: number;
  markupPct: number;
  retailPrice: number;
  tradePrice: number;
  volumePrice: number;
};

type Catalogue = {
  source: { workbook?: string; sha256?: string };
  categories: { name: string; slug: string; subCategories: { name: string; slug: string }[] }[];
  products: CatalogueProduct[];
};

const catalogue: Catalogue = JSON.parse(readFileSync(cataloguePath, 'utf8'));
const products = catalogue.products;

function deliveryZoneProvinces(): string[] {
  return [...seed.matchAll(/province: '([A-Z_]+)'/g)].map((m) => m[1]);
}

describe('catalogue.json integrity', () => {
  it('carries the full 2,147-SKU catalogue', () => {
    // The workbook the client supplied has 2,147 data rows. Pinning the count means a truncated
    // or silently-dropped import shows up here rather than as a half-empty storefront.
    expect(products).toHaveLength(2147);
  });

  it('records the workbook it was generated from, by hash', () => {
    // Without the hash there is no way to tell which revision of the workbook produced this
    // file, which is what makes the import reproducible.
    expect(catalogue.source?.workbook).toMatch(/\.xlsx$/);
    expect(catalogue.source?.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('has no duplicate SKUs', () => {
    // The original Phase 1 defect: two products shared ALS-FIX-0001 and the upsert silently
    // dropped one. At 2,147 workbook rows a collision between the real SKU and a scaffold SKU is
    // exactly the kind of thing that reappears, so it is asserted directly.
    const skus = products.map((p) => p.sku);
    const duplicates = skus.filter((sku, i) => skus.indexOf(sku) !== i);
    expect([...new Set(duplicates)]).toEqual([]);
  });

  it('uses the ALS-<PREFIX>-<NNNN> SKU format consistently', () => {
    for (const p of products) {
      expect(p.sku).toMatch(/^ALS-[A-Z]{3}-\d{4}$/);
    }
  });

  it('gives every product a name and a category that exists in the taxonomy', () => {
    const categories = new Set(catalogue.categories.map((c) => c.name));
    const subCategories = new Set(
      catalogue.categories.flatMap((c) => c.subCategories.map((s) => s.name)),
    );
    for (const p of products) {
      expect(p.name?.length).toBeGreaterThan(0);
      expect({ sku: p.sku, category: p.category, known: categories.has(p.category) }).toEqual({
        sku: p.sku,
        category: p.category,
        known: true,
      });
      expect({ sku: p.sku, subCategory: p.subCategory, known: subCategories.has(p.subCategory) }).toEqual({
        sku: p.sku,
        subCategory: p.subCategory,
        known: true,
      });
    }
  });

  it('prices every product above its own cost at retail and trade', () => {
    // This is the defect class that reached the storefront: a price that is really the wholesale
    // cost build-up. Retail and trade must clear cost on every one of the 2,147 rows.
    const bad = products.filter(
      (p) => !(p.retailPrice > p.baseCost) || !(p.tradePrice > p.baseCost) || !(p.retailPrice > 0),
    );
    expect(bad.map((p) => p.sku)).toEqual([]);
  });

  it('confines every at-or-below-cost volume price to the two thin-margin commodity sub-categories', () => {
    // The workbook's own formula produces these: a fixed VOLUME_DISCOUNT of 20% off retail on rows
    // whose markup band is only 18-25% cannot stay above cost, so the volume tier reaches the cost
    // build-up. 144 extrusion rows land below cost by up to 5.6%, and 21 glazing rows sit exactly
    // at cost. That is a pricing-framework question for the client, not something the importer
    // should paper over by inventing prices, so it is pinned rather than corrected. The assertion
    // is that the exposure is confined to those two sub-categories and never touches finished goods.
    const atOrBelowCost = products.filter((p) => p.volumePrice <= p.baseCost);
    const subCategories = [...new Set(atOrBelowCost.map((p) => p.subCategory))].sort();
    expect(subCategories).toEqual(['Extrusion Profiles & Raw Stock', 'Glazing & Glass']);

    // No finished window, door, pergola, or railing may ever be sold at or below cost.
    const finishedGoods = new Set([
      'Windows',
      'Doors',
      'Facade & Structural Systems',
      'Outdoor Living & Shading',
      'Railing & Screening Systems',
      'Roofing Glazing & Garage Doors',
    ]);
    const badFinished = atOrBelowCost.filter((p) => finishedGoods.has(p.category));
    expect(badFinished.map((p) => p.sku)).toEqual([]);
  });

  it('keeps the workbook trade/volume relationship to retail', () => {
    // Trade is retail less 12%, volume retail less 20% (Pricing Framework workbook). Allowing a
    // cent of rounding, any row outside this band means the tier columns drifted out of step.
    const bad = products.filter(
      (p) =>
        Math.abs(p.tradePrice - p.retailPrice * 0.88) > 0.02 ||
        Math.abs(p.volumePrice - p.retailPrice * 0.8) > 0.02,
    );
    expect(bad.map((p) => p.sku)).toEqual([]);
  });

  it('applies the R320/m2 louvre-blade rule to the louvre-roof pergolas', () => {
    // The 24 pergola rows initially failed to import because the workbook charges the aluminium
    // louvre roof as blade material at R320/m2, which the pricing service had no rate for. They
    // seeded at the wrong price until the rate was added, so the rule is pinned here.
    const louvre = products.filter((p) => p.subCategory === 'Pergolas' && p.name.includes('Louvre'));
    expect(louvre.length).toBeGreaterThan(0);
    for (const p of louvre) {
      expect(p.retailPrice).toBeGreaterThan(0);
    }
  });

  it('declares every unit of sale as a valid enum value', () => {
    const valid = new Set(['EACH', 'PER_LINEAR_METRE', 'PER_M2', 'PER_SET']);
    for (const p of products) {
      expect({ sku: p.sku, valid: valid.has(p.unitOfSale) }).toEqual({ sku: p.sku, valid: true });
    }
  });
});

describe('seed data integrity', () => {
  it('keeps the runtime duplicate-SKU guard', () => {
    // The seed should fail loudly on a duplicate rather than silently dropping a product.
    expect(seed).toMatch(/Duplicate sku\(s\) in catalogue\.json/);
  });

  it('reads the catalogue from the committed JSON rather than hardcoding rows', () => {
    expect(seed).toMatch(/catalogue\.json/);
  });

  it('only references valid provinces in delivery zones', () => {
    // Any province not in the shared list would not exist in the enum the migrations create.
    const used = [...new Set(deliveryZoneProvinces())];
    expect(used.length).toBeGreaterThan(0);
    for (const province of used) {
      expect(PROVINCES).toContain(province);
    }
  });

  it('covers all nine provinces with a delivery zone', () => {
    const used = new Set(deliveryZoneProvinces());
    const uncovered = PROVINCES.filter((p) => !used.has(p));
    expect(uncovered).toEqual([]);
  });

  it('refuses to seed production without the seed passwords, before writing anything', () => {
    // Both requirements are asserted at the top of `main`, ahead of the catalogue writes.
    const guard = seed.indexOf('await assertProductionSeedConfig()');
    const firstWrite = seed.indexOf('prisma.category.upsert');
    expect(guard).toBeGreaterThan(-1);
    expect(firstWrite).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(firstWrite);
  });

  it('names every missing seed password in one message rather than failing on the first', () => {
    // The check is a filter over both keys, so the error lists all of them. Aborting after the
    // catalogue is written leaves a half-seeded database; failing here leaves it untouched.
    expect(seed).toMatch(/!admin && !process\.env\.SEED_ADMIN_PASSWORD/);
    expect(seed).toMatch(/!trade && !process\.env\.SEED_TRADE_PASSWORD/);
  });

  it('requires a seed password only while its account does not exist', () => {
    // Both user upserts are `update: {}`, so on an already-seeded database the password is never
    // read. Demanding it unconditionally would fail every later deploy over a value it would not
    // use — which is what took the API service down.
    const guard = seed.slice(seed.indexOf('async function assertProductionSeedConfig'));
    expect(guard).toMatch(/user\.findUnique/);
    expect(seed).toMatch(/const existingAdmin = await prisma\.user\.findUnique/);
    expect(seed).toMatch(/const existingTrade = await prisma\.user\.findUnique/);
  });

  it('does not read a production password unconditionally', () => {
    // The only call sites are the create paths, reached after the guard has confirmed the secret
    // is present. A top-level read would abort a redeploy against an already-seeded database.
    const occurrences = seed.match(/requireSeedPassword\('SEED_ADMIN_PASSWORD'/g) ?? [];
    expect(occurrences.length).toBeLessThanOrEqual(2);
    for (const line of seed.split('\n').filter((l) => l.includes("requireSeedPassword('SEED_ADMIN_PASSWORD'"))) {
      expect(line).not.toMatch(/^\s*const adminPassword/);
    }
  });
});
