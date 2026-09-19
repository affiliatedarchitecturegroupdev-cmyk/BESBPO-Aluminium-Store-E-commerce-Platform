import { readFileSync } from 'fs';
import { join } from 'path';

import { PROVINCES } from '../src/common/provinces';

// Seed-data integrity checks. These read prisma/seed.ts as text rather than importing it, because
// importing would run the seed against a real database. They exist because of two real defects in
// the Phase 1 seed:
//
//   1. Two unrelated products both used sku ALS-FIX-0001. The seed upserts on sku with an empty
//      update, so the second was silently dropped and the run logged "33 products" while the
//      database held 32. Nothing failed — the data was just quietly wrong.
//   2. Delivery zones referenced FREE_STATE and NORTHERN_CAPE while the migration-created enum
//      had only seven values, so seeding died outright on a freshly deployed database.

const seedPath = join(__dirname, '..', 'prisma', 'seed.ts');
const seed = readFileSync(seedPath, 'utf8');

function productSkus(): string[] {
  // Product rows are the ones carrying both a `sub:` and a `sku:` key.
  return [...seed.matchAll(/sub: '[^']+',\s*sku: '([^']+)'/g)].map((m) => m[1]);
}

// Every `sku:` literal in the seed belongs to PRODUCTS, so this count is the ground truth the
// extraction above must match. If the row formatting ever changes enough that `productSkus`
// skips a product, the duplicate and format checks below would silently pass on a partial set —
// this count is what stops that.
function allSkuLiterals(): string[] {
  return [...seed.matchAll(/sku: '([^']+)'/g)].map((m) => m[1]);
}

function deliveryZoneProvinces(): string[] {
  return [...seed.matchAll(/province: '([A-Z_]+)'/g)].map((m) => m[1]);
}

describe('seed data integrity', () => {
  it('declares product rows with SKUs', () => {
    expect(productSkus().length).toBeGreaterThan(0);
  });

  it('extracts every SKU in the seed, so the checks below are not running on a subset', () => {
    expect(productSkus().sort()).toEqual(allSkuLiterals().sort());
  });

  it('seeds the full declared catalogue size', () => {
    // The seed logged "33 products" while the database held 32. Pinning the count means a row
    // being dropped by an extraction change, or a product being deleted, shows up here.
    expect(productSkus()).toHaveLength(33);
  });

  it('has no duplicate product SKUs', () => {
    // The exact defect: duplicate SKUs are accepted by the upsert and one product vanishes.
    const skus = productSkus();
    const duplicates = skus.filter((sku, i) => skus.indexOf(sku) !== i);
    expect([...new Set(duplicates)]).toEqual([]);
  });

  it('uses the ALS-<PREFIX>-<NNNN> SKU format consistently', () => {
    for (const sku of productSkus()) {
      expect(sku).toMatch(/^ALS-[A-Z]{3}-\d{4}$/);
    }
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

  it('guards against duplicate SKUs at runtime as well as in this test', () => {
    // The seed should fail loudly if a duplicate is ever reintroduced, rather than silently
    // dropping a product. This asserts the guard is present.
    expect(seed).toMatch(/Duplicate sku\(s\) in PRODUCTS/);
  });
});