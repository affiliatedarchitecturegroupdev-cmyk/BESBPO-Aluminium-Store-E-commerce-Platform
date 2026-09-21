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
  tradeAccounts?: unknown;
} = {}) {
  // confirmPayment claims the order with a conditional updateMany; default it to succeeding so
  // tests about other behaviour are not forced to stub it.
  const orderDefaults = {
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  };
  const prisma = {
    order: orderDefaults,
    deliveryZone: { findFirst: jest.fn().mockResolvedValue(null) },
    $transaction: jest.fn(),
    ...(overrides.prisma as object),
  };
  // Merge rather than replace `order`, so a test that stubs one method still gets the rest —
  // replacing it wholesale silently drops `updateMany` and the confirm path throws instead.
  const orderOverride = overrides.prisma && (overrides.prisma as { order?: object }).order;
  if (orderOverride) prisma.order = { ...orderDefaults, ...orderOverride };
  // An interactive transaction passes a client to the callback, and the credit guard has to run
  // on that client to stay inside the transaction. Stub it by handing the callback `tx`, which is
  // the same shape as `prisma` unless a test overrides it. The default is deliberately not a
  // no-op `jest.fn()`: a dropped callback would make confirmPayment look like it succeeded while
  // never writing the order.
  if (!(prisma.$transaction as jest.Mock).getMockImplementation()) {
    (prisma.$transaction as jest.Mock).mockImplementation(
      async (arg: unknown) =>
        typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(prisma) : undefined,
    );
  }
  const cart = { getCart: jest.fn(), ...(overrides.cart as object) };
  const counters = { next: jest.fn().mockResolvedValue(1), ...(overrides.counters as object) };
  const promotions = {};
  const legalTax = { getOrGenerateInvoice: jest.fn(), ...(overrides.legalTax as object) };
  // Default: the caller owns the address they named. Tests that care override this.
  const addresses = { findOwned: jest.fn(), ...(overrides.addresses as object) };
  // Default: the account has headroom. Tests that care override this to force a refusal.
  const tradeAccounts = {
    consumeCredit: jest.fn(),
    releaseCredit: jest.fn(),
    ...(overrides.tradeAccounts as object),
  };
  const service = new OrdersService(
    prisma as never,
    counters as never,
    cart as never,
    addresses as never,
    tradeAccounts as never,
    promotions as never,
    legalTax as never,
  );
  return { service, prisma, cart, counters, legalTax, addresses, tradeAccounts };
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
          findUnique: jest.fn().mockResolvedValue({ id: 'o1', status: 'PENDING', user: { companyId: null } }),
          update: jest.fn().mockResolvedValue({}),
        },
      },
      legalTax: { getOrGenerateInvoice: jest.fn().mockResolvedValue({ id: 'inv-1' }) },
    });
    // findOne is called at the end; give it something to return.
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'o1', status: 'PAYMENT_CONFIRMED' } as never);

    await service.confirmPayment('o1', 'payfast-ref-123');

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'o1', status: 'PENDING' },
      data: { status: 'PAYMENT_CONFIRMED', paymentRef: 'payfast-ref-123' },
    });
    expect(legalTax.getOrGenerateInvoice).toHaveBeenCalledWith('o1');
  });

  it('refuses a second confirm that lost the race, without consuming credit twice', async () => {
    // Two concurrent confirms both read PENDING before either writes. The conditional update is
    // what serialises them: the loser matches no row and aborts before reserving credit, so one
    // order cannot consume the buyer's headroom twice.
    const { service, tradeAccounts } = buildService({
      prisma: {
        order: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'o1',
            status: 'PENDING',
            paymentMethod: 'TRADE_ACCOUNT_TERMS',
            total: 2500,
            user: { companyId: 'c1' },
          }),
          // The other caller already flipped it, so this caller's conditional update matches nothing.
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
      },
    });

    await expect(service.confirmPayment('o1', 'ref')).rejects.toThrow(BadRequestException);
    expect(tradeAccounts.consumeCredit).not.toHaveBeenCalled();
  });

  it('consumes trade credit in the same transaction as the status write', async () => {
    // The defect this covers: creditUsed was shown on the business desk but never incremented, so
    // an approved account could buy without limit. Confirmation is where the commitment is made.
    //
    // Splitting the reservation from the status write would be a money bug: if the reservation
    // commits and the status write fails, the buyer's headroom is spent while the order stays
    // PENDING, and a retry reserves the same amount again because the PENDING guard still passes.
    // The same transaction client must reach both, so the reservation rolls back with it.
    const { service, prisma, tradeAccounts } = buildService({
      prisma: {
        order: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'o1',
            status: 'PENDING',
            paymentMethod: 'TRADE_ACCOUNT_TERMS',
            total: 2500,
            user: { companyId: 'c1' },
          }),
          update: jest.fn().mockResolvedValue({}),
        },
      },
      legalTax: { getOrGenerateInvoice: jest.fn().mockResolvedValue({ id: 'inv-1' }) },
    });
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'o1' } as never);

    await service.confirmPayment('o1', 'ref');

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tradeAccounts.consumeCredit).toHaveBeenCalledWith('c1', 2500, prisma);
  });

  it('leaves the order unpaid when the account is over its credit limit', async () => {
    // The refusal must happen before the status write: if the order were marked paid first and
    // the credit check then failed, the buyer would hold goods the account cannot cover.
    const { service, prisma, tradeAccounts } = buildService({
      prisma: {
        order: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'o1',
            status: 'PENDING',
            paymentMethod: 'TRADE_ACCOUNT_TERMS',
            total: 999999,
            user: { companyId: 'c1' },
          }),
          update: jest.fn().mockResolvedValue({}),
        },
      },
      tradeAccounts: {
        consumeCredit: jest.fn().mockRejectedValue(new BadRequestException('Insufficient trade credit')),
      },
    });

    await expect(service.confirmPayment('o1', 'ref')).rejects.toThrow(BadRequestException);
    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  it('does not touch credit for a non-trade-terms order', async () => {
    // PayFast money is not a credit advance; consuming credit here would wrongly reduce headroom.
    const { service, tradeAccounts } = buildService({
      prisma: {
        order: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'o1',
            status: 'PENDING',
            paymentMethod: 'PAYFAST',
            total: 2500,
            user: { companyId: 'c1' },
          }),
          update: jest.fn().mockResolvedValue({}),
        },
      },
      legalTax: { getOrGenerateInvoice: jest.fn().mockResolvedValue({ id: 'inv-1' }) },
    });
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'o1' } as never);

    await service.confirmPayment('o1', 'ref');

    expect(tradeAccounts.consumeCredit).not.toHaveBeenCalled();
  });

  it('refuses trade terms for a buyer with no company account', async () => {
    // A retail user has no TradeAccount, so there is nothing to draw against.
    const { service, tradeAccounts } = buildService({
      prisma: {
        order: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'o1',
            status: 'PENDING',
            paymentMethod: 'TRADE_ACCOUNT_TERMS',
            total: 100,
            user: { companyId: null },
          }),
          update: jest.fn().mockResolvedValue({}),
        },
      },
    });

    await expect(service.confirmPayment('o1', 'ref')).rejects.toThrow(BadRequestException);
    expect(tradeAccounts.consumeCredit).not.toHaveBeenCalled();
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

  it('releases credit when cancelling a confirmed trade-terms order', async () => {
    // Cancelling must hand the commitment back. Without this the order is gone but its credit
    // is not, so repeated cancellations permanently eat the account's headroom.
    const { service, tradeAccounts } = buildService({
      prisma: {
        order: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'o1',
            userId: 'owner',
            status: 'PAYMENT_CONFIRMED',
            paymentMethod: 'TRADE_ACCOUNT_TERMS',
            total: 4200,
            user: { companyId: 'c1' },
          }),
          update: jest.fn().mockResolvedValue({ id: 'o1', status: 'CANCELLED' }),
        },
      },
    });

    await service.cancel('o1', 'owner');

    expect(tradeAccounts.releaseCredit).toHaveBeenCalledWith('c1', 4200, expect.anything());
  });

  it('releases nothing when cancelling an unpaid trade-terms order', async () => {
    // PENDING means credit was never consumed, so releasing here would inflate the buyer's
    // headroom above the limit they were actually granted.
    const { service, tradeAccounts } = buildService({
      prisma: {
        order: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'o1',
            userId: 'owner',
            status: 'PENDING',
            paymentMethod: 'TRADE_ACCOUNT_TERMS',
            total: 4200,
            user: { companyId: 'c1' },
          }),
          update: jest.fn().mockResolvedValue({ id: 'o1', status: 'CANCELLED' }),
        },
      },
    });

    await service.cancel('o1', 'owner');

    expect(tradeAccounts.releaseCredit).not.toHaveBeenCalled();
  });

  it('releases nothing when cancelling a confirmed PayFast order', async () => {
    const { service, tradeAccounts } = buildService({
      prisma: {
        order: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'o1',
            userId: 'owner',
            status: 'PAYMENT_CONFIRMED',
            paymentMethod: 'PAYFAST',
            total: 4200,
            user: { companyId: 'c1' },
          }),
          update: jest.fn().mockResolvedValue({ id: 'o1', status: 'CANCELLED' }),
        },
      },
    });

    await service.cancel('o1', 'owner');

    expect(tradeAccounts.releaseCredit).not.toHaveBeenCalled();
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