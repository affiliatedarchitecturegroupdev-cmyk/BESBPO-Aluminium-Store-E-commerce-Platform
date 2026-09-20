import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

// Delivery addresses are owned by exactly one user. Every read and write goes through
// `findOwned`, which scopes by userId, so a caller cannot reach another account's address by
// guessing a cuid — the same class of bug as the checkout IDOR this module backs.
@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
    });
  }

  async create(userId: string, dto: CreateAddressDto) {
    const isDefault = dto.isDefault ?? false;

    return this.prisma.$transaction(async (tx) => {
      // The first address a buyer saves becomes their default; otherwise checkout has to guess.
      const existing = await tx.address.count({ where: { userId } });
      const makeDefault = isDefault || existing === 0;

      // Exactly one default per user. Demote the incumbent *before* promoting the new one so
      // there is never a moment with two defaults, and never a moment with none.
      if (makeDefault) {
        await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
      }

      return tx.address.create({
        data: {
          userId,
          line1: dto.line1,
          line2: dto.line2 || null,
          city: dto.city,
          province: dto.province as never,
          postalCode: dto.postalCode,
          isDefault: makeDefault,
        },
      });
    });
  }

  async update(userId: string, id: string, dto: UpdateAddressDto) {
    await this.findOwned(userId, id);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true) {
        await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
      }

      return tx.address.update({
        where: { id },
        data: {
          ...(dto.line1 !== undefined ? { line1: dto.line1 } : {}),
          ...(dto.line2 !== undefined ? { line2: dto.line2 || null } : {}),
          ...(dto.city !== undefined ? { city: dto.city } : {}),
          ...(dto.province !== undefined ? { province: dto.province as never } : {}),
          ...(dto.postalCode !== undefined ? { postalCode: dto.postalCode } : {}),
          ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
        },
      });
    });
  }

  async remove(userId: string, id: string) {
    await this.findOwned(userId, id);

    return this.prisma.$transaction(async (tx) => {
      const removed = await tx.address.delete({ where: { id } });

      // Deleting the default would otherwise leave the account with no default and no way for
      // checkout to preselect an address — promote the oldest survivor.
      if (removed.isDefault) {
        const next = await tx.address.findFirst({
          where: { userId },
          orderBy: { id: 'asc' },
        });
        if (next) {
          await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
        }
      }

      return { id, deleted: true };
    });
  }

  /**
   * The single gate every address read/write passes through. Returning 404 rather than 403 for
   * someone else's address avoids confirming that the id exists at all.
   */
  async findOwned(userId: string, id: string) {
    const address = await this.prisma.address.findFirst({ where: { id, userId } });
    if (!address) throw new NotFoundException(`Address ${id} not found`);
    return address;
  }
}