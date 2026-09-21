import { BadRequestException } from '@nestjs/common';

import { CartService } from './cart.service';

// Unit tests for clearance pricing at the cart boundary. What matters here is which number
// becomes the frozen unitPrice: the clearance markdown, the tier price, or the pricing service.
//
// The expiry rule is asserted in both directions because it is the one that costs money if it is
// wrong: an expired markdown that still charges the clearance price sells stock below list after
// the sale ended, and a live one that is ignored charges list for stock the storefront is
// advertising as reduced. The homepage query and this guard both filter on the date, and these
// tests pin the guard so the two cannot drift apart silently.

function product(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    sku: 'ALS-SLW-0001',
    name: 'Sliding Window',
    active: true,
    fulfilmentType: 'STOCK',
    widthMm: 609,
    heightMm: 609,
    finishId: null,
    retailPrice: 1000,
    tradePrice: 900,
    volumePrice: 800,
    clearancePrice: null,
    clearanceEndsAt: null,
    subCategory: { pricingBasis: 'RATE_CARD', category: {} },
    ...overrides,
  };
}

function buildService(p: Record<string, unknown>, tier = 'RETAIL') {
  const prisma = {
    cart: { findUnique: jest.fn().mockResolvedValue({ id: 'c1', userId: 'u1' }) },
    cartItem: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve(data)),
    },
    product: { findUnique: jest.fn().mockResolvedValue(p) },
    user: {
      findUnique: jest.fn().mockResolvedValue({
        company: { tradeAccount: { approved: true, discountTier: tier } },
      }),
    },
  };
  const configurator = { computePrice: jest.fn() };
  const promotions = { validateCoupon: jest.fn() };
  const service = new CartService(prisma as never, configurator as never, promotions as never);
  return { service, prisma, configurator };
}

describe('CartService clearance pricing', () => {
  it('charges the clearance price when a markdown is live', async () => {
    const { service, prisma } = buildService(
      product({ clearancePrice: 750, clearanceEndsAt: new Date(Date.now() + 86_400_000) }),
    );

    await service.addItem('u1', { productId: 'p1', quantity: 1 });

    expect(prisma.cartItem.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ unitPrice: 750 }) }),
    );
  });

  it('charges the clearance price when no end date is set', async () => {
    const { service, prisma } = buildService(product({ clearancePrice: 750 }));

    await service.addItem('u1', { productId: 'p1', quantity: 1 });

    expect(prisma.cartItem.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ unitPrice: 750 }) }),
    );
  });

  it('ignores an expired markdown and charges the tier price instead', async () => {
    const { service, prisma } = buildService(
      product({ clearancePrice: 750, clearanceEndsAt: new Date(Date.now() - 86_400_000) }),
    );

    await service.addItem('u1', { productId: 'p1', quantity: 1 });

    expect(prisma.cartItem.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ unitPrice: 1000 }) }),
    );
  });

  it('charges the clearance price to a trade buyer rather than the trade tier price', async () => {
    const { service, prisma } = buildService(
      product({ clearancePrice: 750, tradePrice: 500 }),
      'TRADE',
    );

    await service.addItem('u1', { productId: 'p1', quantity: 1 });

    // Clearance does not stack: 750 is the advertised price, not 500 off an already-reduced line.
    expect(prisma.cartItem.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ unitPrice: 750 }) }),
    );
  });

  it('does not apply clearance to a custom-sized configuration', async () => {
    const { service, prisma, configurator } = buildService(
      product({ clearancePrice: 750, subCategory: { pricingBasis: 'FRAME_GLAZED', category: {} } }),
    );
    configurator.computePrice.mockResolvedValue({ retail: 1200, trade: 1100, volume: 1000 });

    await service.addItem('u1', { productId: 'p1', widthMm: 900, heightMm: 900, quantity: 1 });

    // A made-to-order size is not the stocked item being cleared, so the engine prices it.
    expect(prisma.cartItem.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ unitPrice: 1200 }) }),
    );
  });

  it('still refuses a product with no usable price', async () => {
    const { service } = buildService(product({ retailPrice: 0, clearancePrice: null }));

    await expect(service.addItem('u1', { productId: 'p1', quantity: 1 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
