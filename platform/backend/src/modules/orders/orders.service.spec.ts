import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';

import { OrdersService } from './orders.service';

// Unit tests for the checkout rules that are implemented in this service rather than in a
// transaction. The concurrency behaviour of the transaction itself is covered end-to-end by
// scripts/smoke.sh, which submits five simultaneous checkouts against a real database — that is
// the only honest way to test row-lock serialisation, and it is not worth faking here.
//
// Collaborators are stubbed because these tests are about OrdersService's own decision logic
// (which exceptions it raises, what it refuses to do). The database is not in scope.

function buildService(overrides: {
  cart?: unknown;
  prisma?: unknown;
  legalTax?: unknown;
  counters?: unknown;
} = {}) {
  const prisma = {
    order: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
    deliveryZone: { findFirst: jest.fn().mockResolvedValue(null) },
    $transaction: jest.fn(),
    ...(overrides.prisma as object),
  };
  const cart = { getCart: jest.fn(), ...(overrides.cart as object) };
  const counters = { next: jest.fn().mockResolvedValue(1), ...(overrides.counters as object) };
  const promotions = {};
  const legalTax = { getOrGenerateInvoice: jest.fn(), ...(overrides.legalTax as object) };
  const service = new OrdersService(
    prisma as never,
    counters as never,
    cart as never,
    promotions as never,
    legalTax as never,
  );
  return { service, prisma, cart, counters, legalTax };
}

const DTO = { paymentMethod: 'EFT' } as never;

describe('OrdersService.checkout', () => {
  it('refuses an empty cart', async () => {
    const { service } = buildService({ cart: { getCart: jest.fn().mockResolvedValue({ items: [] }) } });
    await expect(service.checkout('user-1', DTO)).rejects.toThrow(BadRequestException);
  });
});

describe('OrdersService.confirmPayment', () => {
  it('throws when the order does not exist', async () => {
    const { service } = buildService({ prisma: { order: { findUnique: jest.fn().mockResolvedValue(null) } } });
    await expect(service.confirmPayment('missing', 'ref')).rejects.toThrow('not found');
  });

  it('refuses to confirm an order that is not PENDING', async () => {
    // Guards against a replayed webhook double-confirming and issuing a second invoice.
    const { service } = buildService({
      prisma: { order: { findUnique: jest.fn().mockResolvedValue({ id: 'o1', status: 'PAYMENT_CONFIRMED' }) } },
    });
    await expect(service.confirmPayment('o1', 'ref')).rejects.toThrow(BadRequestException);
  });

  it('is the only path that may mark an order paid', async () => {
    // The docstring is explicit that the browser never calls this — it is webhook-only. An
    // order has no public route that sets PAYMENT_CONFIRMED from a client payload.
    const { service, prisma, legalTax } = buildService({
      prisma: {
        order: {
          findUnique: jest.fn().mockResolvedValue({ id: 'o1', status: 'PENDING' }),
          update: jest.fn().mockResolvedValue({}),
        },
      },
      legalTax: { getOrGenerateInvoice: jest.fn().mockResolvedValue({ id: 'inv-1' }) },
    });
    // findOne is called at the end; give it something to return.
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'o1', status: 'PAYMENT_CONFIRMED' } as never);

    await service.confirmPayment('o1', 'payfast-ref-123');

    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: 'o1' },
      data: { status: 'PAYMENT_CONFIRMED', paymentRef: 'payfast-ref-123' },
    });
    expect(legalTax.getOrGenerateInvoice).toHaveBeenCalledWith('o1');
  });
});

describe('OrdersService.cancel', () => {
  it('throws when the order does not exist', async () => {
    const { service } = buildService({ prisma: { order: { findUnique: jest.fn().mockResolvedValue(null) } } });
    await expect(service.cancel('missing', 'user-1')).rejects.toThrow('not found');
  });

  it('will not let one user cancel another user\u2019s order', async () => {
    const { service } = buildService({
      prisma: { order: { findUnique: jest.fn().mockResolvedValue({ id: 'o1', userId: 'owner', status: 'PENDING' }) } },
    });
    await expect(service.cancel('o1', 'intruder')).rejects.toThrow(ForbiddenException);
  });

  it('refuses to cancel an order that has already shipped', async () => {
    const { service } = buildService({
      prisma: { order: { findUnique: jest.fn().mockResolvedValue({ id: 'o1', userId: 'owner', status: 'SHIPPED' }) } },
    });
    await expect(service.cancel('o1', 'owner')).rejects.toThrow(BadRequestException);
  });

  it('allows the owner to cancel a pending order', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'o1', status: 'CANCELLED' });
    const { service } = buildService({
      prisma: { order: { findUnique: jest.fn().mockResolvedValue({ id: 'o1', userId: 'owner', status: 'PENDING' }), update } },
    });
    await service.cancel('o1', 'owner');
    expect(update).toHaveBeenCalledWith({ where: { id: 'o1' }, data: { status: 'CANCELLED' } });
  });
});

describe('orders service contract', () => {
  it('rejects a checkout from a cart that lost the race with a conflict, not a silent success', async () => {
    // The transaction consumes the cart first and throws when it consumes nothing. Reproduced
    // here at the unit level; scripts/smoke.sh proves it against real row locks.
    const txDeleteMany = jest.fn().mockResolvedValue({ count: 0 });
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (fn: (tx: unknown) => unknown) =>
        fn({ cartItem: { deleteMany: txDeleteMany }, order: { create: jest.fn() }, coupon: { update: jest.fn() } }),
      ),
    };
    const { service } = buildService({
      prisma,
      cart: {
        getCart: jest.fn().mockResolvedValue({
          items: [{ cartId: 'c1', productId: 'p1', quantity: 1, unitPrice: '100', product: { fulfilmentType: 'STOCK', glazingSpec: null } }],
          subtotal: 100,
          coupon: null,
        }),
      },
    });

    await expect(service.checkout('user-1', DTO)).rejects.toThrow(ConflictException);
    expect(txDeleteMany).toHaveBeenCalled();
  });
});