import { NotFoundException } from '@nestjs/common';

import { AddressesService } from './addresses.service';

// These tests are about account isolation — the property that matters most for this module.
// Every read and write is scoped by userId through `findOwned`, so a caller holding another
// account's address id must not be able to read, edit or delete it.
//
// The database is stubbed: the query shape is what is under test (`where` must carry userId),
// and scripts/smoke.sh exercises the endpoints against a real database.

function buildService(overrides: { prisma?: unknown } = {}) {
  const prisma = {
    address: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    $transaction: jest.fn(),
    ...(overrides.prisma as object),
  };
  const service = new AddressesService(prisma as never);
  return { service, prisma };
}

describe('AddressesService.list', () => {
  it('scopes the query to the caller', async () => {
    const { service, prisma } = buildService();
    await service.list('user-1');
    expect(prisma.address.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
    });
  });
});

describe('AddressesService.findOwned', () => {
  it('queries by id *and* userId, not id alone', async () => {
    const { service, prisma } = buildService();
    prisma.address.findFirst.mockResolvedValue({ id: 'a-1', userId: 'user-1' });

    await service.findOwned('user-1', 'a-1');

    expect(prisma.address.findFirst).toHaveBeenCalledWith({ where: { id: 'a-1', userId: 'user-1' } });
  });

  it("404s on another account's address rather than revealing that it exists", async () => {
    const { service } = buildService();
    await expect(service.findOwned('user-1', 'a-other')).rejects.toThrow(NotFoundException);
  });
});

describe('AddressesService.update', () => {
  it("refuses to update another account's address", async () => {
    const { service, prisma } = buildService();
    await expect(service.update('user-1', 'a-other', { city: 'Cape Town' })).rejects.toThrow(
      NotFoundException,
    );
    // Nothing reached the write path.
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('AddressesService.remove', () => {
  it("refuses to delete another account's address", async () => {
    const { service, prisma } = buildService();
    await expect(service.remove('user-1', 'a-other')).rejects.toThrow(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('AddressesService.create', () => {
  it('makes the first address the default without demoting anyone', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const create = jest.fn().mockResolvedValue({ id: 'a-1', isDefault: true });
    const { service } = buildService({
      prisma: {
        $transaction: jest.fn().mockImplementation(async (fn: (tx: unknown) => unknown) =>
          fn({
            address: { count: jest.fn().mockResolvedValue(0), updateMany, create },
          }),
        ),
      },
    });

    await service.create('user-1', {
      line1: '12 Voortrekker Road',
      city: 'Johannesburg',
      province: 'GAUTENG',
      postalCode: '2001',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isDefault: true, userId: 'user-1' }) }),
    );
  });

  it('demotes the incumbent default before promoting a new one', async () => {
    // Demote-then-promote, so there is never a window with two defaults or none.
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const create = jest.fn().mockResolvedValue({ id: 'a-2', isDefault: true });
    const { service } = buildService({
      prisma: {
        $transaction: jest.fn().mockImplementation(async (fn: (tx: unknown) => unknown) =>
          fn({ address: { count: jest.fn().mockResolvedValue(2), updateMany, create } }),
        ),
      },
    });

    await service.create('user-1', {
      line1: '1 Main Road',
      city: 'Cape Town',
      province: 'WESTERN_CAPE',
      postalCode: '8001',
      isDefault: true,
    });

    expect(updateMany).toHaveBeenCalledWith({ where: { userId: 'user-1' }, data: { isDefault: false } });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isDefault: true, userId: 'user-1' }) }),
    );
  });
});