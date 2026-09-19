import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Allocates monotonic, never-reused sequence values for numbered documents.
 *
 * Why not `count() + 1`: counting rows in the table you are about to insert into is a
 * read-then-write with a gap in the middle. Two concurrent requests both read N, both
 * compute N+1, and the second insert violates the @unique constraint on the document
 * number — or, if no constraint existed, silently reuses a number. For a SARS Tax Invoice
 * a repeated number is a tax-integrity defect, not a cosmetic one.
 *
 * A single-row `UPDATE ... value = value + 1` is atomic in Postgres: the row is locked for
 * the duration of the update, so concurrent callers are serialised by the database rather
 * than by application-level locking. The upsert handles first use of a key.
 */
@Injectable()
export class CounterService {
  constructor(private readonly prisma: PrismaService) {}

  async next(key: string): Promise<number> {
    const counter = await this.prisma.counter.upsert({
      where: { key },
      create: { key, value: 1 },
      update: { value: { increment: 1 } },
      select: { value: true },
    });
    return counter.value;
  }
}