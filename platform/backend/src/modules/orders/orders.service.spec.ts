import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

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
  addresses?: unknown;
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
  // Default: the caller owns the address they named. Tests that care override this.
  const addresses = { findOwned: jest.fn(), ...(overrides.addresses as object) };
  const service = new OrdersService(
    prisma as never,
    counters as never,
    cart as never,
    addresses as never,
    promotions as never,
    legalTax as never,
  );
  return { service, prisma, cart, counters, legalTax, addresses };
}

const DTO = { paymentMethod: 'EFT', deliveryProvince: 'GAUTENG' } as never;

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

describe('OrdersService.checkout delivery address', () => {
  const cartWithOneItem = {
    getCart: jest.fn().mockResolvedValue({
      items: [{ cartId: 'c1', productId: 'p1', quantity: 1, unitPrice: '100', product: { fulfilmentType: 'STOCK', glazingSpec: null } }],
      subtotal: 100,
      coupon: null,
    }),
  };

  it('refuses a checkout with neither a province nor a saved address', async () => {
    // Without a province the DeliveryZone lookup finds no zone and the fee silently becomes R0,
    // i.e. free delivery to anyone who simply omits the field.
    const { service } = buildService({ cart: cartWithOneItem });
    await expect(service.checkout('user-1', { paymentMethod: 'EFT' } as never)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('checks that a named delivery address belongs to the caller', async () => {
    // Previously deliveryAddressId was written straight through: any cuid could be attached and
    // another account's address read back off the order. findOwned is the gate.
    const findOwned = jest.fn().mockRejectedValue(new NotFoundException('Address a-other not found'));
    const { service } = buildService({
      cart: cartWithOneItem,
      addresses: { findOwned },
    });

    await expect(
      service.checkout('user-1', { paymentMethod: 'EFT', deliveryAddressId: 'a-other' } as never),
    ).rejects.toThrow(NotFoundException);
    expect(findOwned).toHaveBeenCalledWith('user-1', 'a-other');
  });

  it("prices delivery from the saved address's province, not the client-supplied one", async () => {
    // The address is the authority. A client sending a cheap province alongside an expensive
    // address must not get the cheap zone.
    const findOwned = jest.fn().mockResolvedValue({ id: 'a-1', userId: 'user-1', province: 'WESTERN_CAPE' });
    const findFirst = jest.fn().mockResolvedValue({ baseFee: '250.00', fragileSurchargePct: '0.05' });
    const { service } = buildService({
      cart: cartWithOneItem,
      addresses: { findOwned },
      prisma: {
        deliveryZone: { findFirst },
        $transaction: jest.fn().mockImplementation(async (fn: (tx: unknown) => unknown) =>
          fn({
            cartItem: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
            order: { create: jest.fn().mockResolvedValue({ id: 'o1', deliveryFee: 250 }) },
            coupon: { update: jest.fn() },
          }),
        ),
      },
    });

    await service.checkout('user-1', {
      paymentMethod: 'EFT',
      deliveryAddressId: 'a-1',
      deliveryProvince: 'GAUTENG',
    } as never);

    expect(findFirst).toHaveBeenCalledWith({ where: { province: 'WESTERN_CAPE' } });
  });

  it('stores the verified address id on the order, never the raw client value', async () => {
    const orderCreate = jest.fn().mockResolvedValue({ id: 'o1' });
    const { service } = buildService({
      cart: cartWithOneItem,
      addresses: { findOwned: jest.fn().mockResolvedValue({ id: 'a-1', province: 'GAUTENG' }) },
      prisma: {
        $transaction: jest.fn().mockImplementation(async (fn: (tx: unknown) => unknown) =>
          fn({
            cartItem: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
            order: { create: orderCreate },
            coupon: { update: jest.fn() },
          }),
        ),
      },
    });

    await service.checkout('user-1', { paymentMethod: 'EFT', deliveryAddressId: 'a-1' } as never);

    expect(orderCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ deliveryAddressId: 'a-1' }) }),
    );
  });
});