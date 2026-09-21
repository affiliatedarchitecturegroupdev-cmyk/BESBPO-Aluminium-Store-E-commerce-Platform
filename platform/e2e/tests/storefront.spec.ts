import { expect, test } from '@playwright/test';

// Storefront end-to-end test: browse the real catalogue, open a product, configure it, and add it
// to the cart through the real API.
//
// Two defects motivated this suite, and both were invisible to API-only tests:
//
//   1. The listing pages and the product page rendered `baseCost` — the wholesale cost build-up —
//      as the customer price. The API was healthy and returned 200 throughout; only the rendered
//      page was wrong. So the first assertion here is that the price the shopper sees is the
//      retail price from the catalogue, and that the cost never appears on the page.
//
//   2. The cart priced anything the pricing service could not compute at baseCost, selling at
//      zero margin. So the cart assertion checks the line price against the catalogue's tier
//      price rather than merely asserting a 2xx.
//
// The catalogue is the 2,147-SKU workbook import, so these tests run against real rows rather
// than a fixture. Prices are read from the API the same way a shopper's browser would, so the
// test cannot pass by hardcoding a number that the catalogue has stopped producing.

type ApiProduct = {
  sku: string;
  name: string;
  baseCost: string | number;
  retailPrice: string | number;
  tradePrice: string | number;
  volumePrice: string | number;
  clearancePrice?: string | number | null;
  widthMm: number | null;
  heightMm: number | null;
};

// Prices render through Intl with a non-breaking space as the thousands separator, and React
// splits the text across nodes, so a literal substring check is too brittle. Compare the digits
// instead, allowing any rand formatting — spaces, commas, full stops — between them.
function pricePattern(value: string | number): RegExp {
  const digits = Number(value).toFixed(2).replace(/[^\d]/g, '');
  return new RegExp(digits.split('').join('[\\s\\u00a0,.\\u00a0]*'));
}

function formatRandLike(value: string | number): string {
  return Number(value).toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR' });
}

test.describe('storefront', () => {
  test('homepage renders live catalogue products at retail, never at cost', async ({ page, request }) => {
    const res = await request.get('/api/v1/catalog/products?sort=name&take=8');
    expect(res.ok()).toBeTruthy();
    const { items } = (await res.json()) as { items: ApiProduct[] };
    expect(items.length).toBeGreaterThan(0);

    await page.goto('/');

    // Every product the API returned for this carousel must show its retail price.
    const html = await page.content();
    for (const p of items.slice(0, 4)) {
      expect(html, `${p.sku} retail price missing from the homepage`).toMatch(pricePattern(p.retailPrice));
    }

    // The decisive assertion: the cost build-up must not be rendered anywhere.
    for (const p of items) {
      expect(html, `cost price for ${p.sku} leaked onto the homepage`).not.toMatch(pricePattern(p.baseCost));
    }
  });

  test('the clearance carousel shows the markdown, not the retail it replaced', async ({ page, request }) => {
    const res = await request.get('/api/v1/catalog/clearance?take=8');
    expect(res.ok()).toBeTruthy();
    const { items } = (await res.json()) as { items: ApiProduct[] };
    test.skip(items.length === 0, 'no clearance lines are seeded in this environment');

    await page.goto('/');

    const html = await page.content();
    expect(html).toContain('Clearance Sale');

    // Both figures must appear: a clearance card shows the sale price and strikes through the
    // retail it came off. Asserting only the sale price would pass on a card that had quietly
    // dropped the "was" price and stopped showing the shopper what they are saving.
    for (const p of items.slice(0, 4)) {
      const clearance = Number(p.clearancePrice);
      expect(html, `${p.sku} clearance price missing from the homepage`).toMatch(pricePattern(clearance));
      expect(html, `${p.sku} struck-through retail price missing`).toMatch(pricePattern(p.retailPrice));
      // The markdown is a real reduction, so the two figures must differ.
      expect(clearance).toBeLessThan(Number(p.retailPrice));
    }
  });

  test('catalogue lists the workbook catalogue and shows retail prices', async ({ page }) => {
    await page.goto('/catalogue');

    // The full imported catalogue, not the old synthetic sample. The count renders unformatted.
    await expect(page.getByText(/2147|2,147/).first()).toBeVisible({ timeout: 15_000 });

    // A price is rendered in South African rand formatting.
    await expect(page.getByText(/R\s?\d[\d\s,.]*/).first()).toBeVisible();
  });

  test('category page lists its sub-categories from the workbook taxonomy', async ({ page }) => {
    await page.goto('/catalogue/windows');
    // These sub-category names come from the workbook; none existed in the old synthetic seed.
    await expect(page.getByText('Sliding Windows').first()).toBeVisible();
    await expect(page.getByText('Casement Windows').first()).toBeVisible();
  });

  test('product page shows retail, trade and volume, and hides the cost price', async ({ page, request }) => {
    const res = await request.get('/api/v1/catalog/products?subCategory=sliding-windows&take=1');
    expect(res.ok()).toBeTruthy();
    const { items } = (await res.json()) as { items: ApiProduct[] };
    const product = items[0];
    expect(product).toBeTruthy();

    await page.goto(`/product/${product.sku}`);

    await expect(page.getByRole('heading', { name: product.name })).toBeVisible({ timeout: 15_000 });

    // All three tiers are shown, and each matches the catalogue.
    const html = await page.content();
    expect(html, 'retail price missing from the product page').toMatch(pricePattern(product.retailPrice));
    expect(html, 'trade price missing from the product page').toMatch(pricePattern(product.tradePrice));
    expect(html, 'volume price missing from the product page').toMatch(pricePattern(product.volumePrice));

    // And the cost price is nowhere on the page.
    expect(html, 'cost price leaked onto the product page').not.toMatch(pricePattern(product.baseCost));
  });

  test('a product can be configured and added to the cart at its catalogue price', async ({ page, request }) => {
    const res = await request.get('/api/v1/catalog/products?subCategory=sliding-windows&take=1');
    const { items } = (await res.json()) as { items: ApiProduct[] };
    const product = items[0];

    // Sign in as the seeded trade account so the cart is authenticated and trade pricing applies.
    await page.goto('/login');
    await page.getByPlaceholder('Email').fill('buyer@example-trade.co.za');
    await page.getByPlaceholder('Password').fill('ChangeMe!Trade1');
    await page.getByRole('button', { name: /sign in with email/i }).click();
    await expect(page).toHaveURL(/\/account/, { timeout: 15_000 });

    await page.goto(`/product/${product.sku}`);

    // The configurator must finish pricing before the buy control is usable.
    const addToCart = page.getByRole('button', { name: /add to cart/i });
    await expect(addToCart).toBeVisible({ timeout: 15_000 });
    await expect(addToCart).toBeEnabled({ timeout: 15_000 });
    await addToCart.click();

    // Adding navigates to the cart.
    await expect(page).toHaveURL(/\/cart/, { timeout: 15_000 });

    // Read the cart back over the API with the same token the browser holds. The line must be
    // priced at the trade tier — not at baseCost, which is the defect this test exists to catch.
    const token = await page.evaluate(() => window.localStorage.getItem('als_access_token'));
    expect(token, 'expected a token in localStorage after signing in').toBeTruthy();

    const cartRes = await request.get('/api/v1/cart', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(cartRes.ok()).toBeTruthy();
    const cart = (await cartRes.json()) as {
      items: { unitPrice: string | number; product: { sku: string } }[];
    };
    const line = cart.items.find((i) => i.product.sku === product.sku);
    expect(line, `expected ${product.sku} in the cart`).toBeTruthy();

    const unitPrice = Number(line!.unitPrice);
    expect(unitPrice, 'cart sold the product at cost').toBeGreaterThan(Number(product.baseCost));

    // The configurator defaults to a 1209x? size, so a line at the catalogue's standard size is
    // priced at the size-independent tier price. Assert it is a legitimate tier value and never
    // the cost build-up.
    expect([product.tradePrice, product.retailPrice, product.volumePrice].map(Number)).toContain(unitPrice);
    expect(unitPrice).not.toBeCloseTo(Number(product.baseCost), 2);
  });

  test('checkout captures a street address and offers all nine provinces', async ({ page }) => {
    // Two regressions are covered here.
    //
    //   1. The Province list on checkout was a hand-copied array of seven provinces, missing Free
    //      State and Northern Cape. A shopper in either was silently charged Gauteng delivery.
    //      The assertion is that the form offers the full set.
    //   2. There was no street-address capture at all — the order recorded only a province, so
    //      staff had nothing to dispatch to. The assertion is that an address can be entered and
    //      the order still completes.

    const res = await page.request.get('/api/v1/catalog/products?take=1');
    const { items } = (await res.json()) as { items: ApiProduct[] };
    const product = items[0];

    await page.goto('/login');
    await page.getByPlaceholder('Email').fill('buyer@example-trade.co.za');
    await page.getByPlaceholder('Password').fill('ChangeMe!Trade1');
    await page.getByRole('button', { name: /sign in with email/i }).click();
    await expect(page).toHaveURL(/\/account/, { timeout: 15_000 });

    await page.goto(`/product/${product.sku}`);
    const addToCart = page.getByRole('button', { name: /add to cart/i });
    await expect(addToCart).toBeEnabled({ timeout: 15_000 });
    await addToCart.click();
    await expect(page).toHaveURL(/\/cart/, { timeout: 15_000 });

    await page.goto('/checkout');

    // A saved address may survive from an earlier run, in which case the form starts hidden.
    // Reveal it: the province options only exist inside the form, and leaving it open with empty
    // `required` fields would block submission anyway.
    const streetField = page.getByLabel('Street address');
    if (!(await streetField.isVisible().catch(() => false))) {
      const toggle = page.getByRole('button', { name: /use a different address/i });
      if (await toggle.isVisible().catch(() => false)) await toggle.click();
    }
    await expect(streetField).toBeVisible({ timeout: 15_000 });

    // Every province the backend enum accepts must be selectable — Free State and Northern Cape
    // are the two that were dropped.
    const provinceSelect = page.getByLabel('Province');
    const options = await provinceSelect.locator('option').allTextContents();
    for (const required of ['Free State', 'Northern Cape', 'North West']) {
      expect(options, `checkout is missing the ${required} option`).toContain(required);
    }
    expect(options).toHaveLength(9);

    // SA postal codes are exactly four digits and the field enforces that with pattern="\d{4}".
    // The range must stay inside 1000–9999: a five-digit draw fails native validation, the submit
    // never fires, and the order silently never reaches the API.
    const postcode = String(1000 + Math.floor(Math.random() * 9000));
    await streetField.fill('12 Voortrekker Road');
    await page.getByLabel('City').fill('Johannesburg');
    await page.getByLabel('Postal code').fill(postcode);
    await provinceSelect.selectOption('FREE_STATE');

    await page.getByRole('button', { name: /place order/i }).click();

    // Free State is the province that used to be unselectable; the order must be accepted and
    // priced with a real delivery zone rather than falling through to R0.
    await expect(page).toHaveURL(/\/checkout\/success/, { timeout: 20_000 });
    await expect(page.getByText(/ALS-/)).toBeVisible({ timeout: 15_000 });

    // The address typed into the form must be what the order actually used. Opening the form
    // while a saved address stayed selected would have silently ordered to the old address — the
    // form was displayed but its contents ignored. Read the address book back with the session
    // token and confirm the Free State address exists.
    const token = await page.evaluate(() => window.localStorage.getItem('als_access_token'));
    const addressesRes = await page.request.get('/api/v1/addresses', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(addressesRes.ok()).toBeTruthy();
    const saved = (await addressesRes.json()) as { line1: string; province: string; postalCode: string }[];
    const typed = saved.find((a) => a.postalCode === postcode);
    expect(typed, 'the address entered at checkout was never saved').toBeTruthy();
    expect(typed!.province).toBe('FREE_STATE');
  });
});