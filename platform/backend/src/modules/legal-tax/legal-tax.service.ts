import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CounterService } from '../../prisma/counter.service';
import { AcceptLegalDocumentDto } from './dto/accept-legal-document.dto';
import { CreateDsarRequestDto } from './dto/create-dsar-request.dto';

// SARS Tax Invoice requires the literal title "Tax Invoice", both parties' VAT numbers where
// applicable, full addresses, an explicit VAT breakdown, and a unique sequential invoice number.
// Current standard VAT rate confirmed at 15% (2026 Budget, 25 Feb 2026, did not revive the
// 2025 proposed 15.5%/16% hikes — both were reversed). Re-verify before relying on this
// constant if the Budget changes it in a future year.
const VAT_RATE = 0.15;
const MERCHANT_VAT_NUMBER = process.env.ALUMINIUM_STORE_VAT_NUMBER ?? 'REPLACE_WITH_REAL_VAT_NUMBER';

@Injectable()
export class LegalTaxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly counters: CounterService,
  ) {}

  async getPublishedBySlug(slug: string) {
    const doc = await this.prisma.legalDocument.findFirst({
      where: { slug, publishedAt: { not: null } },
      orderBy: { publishedAt: 'desc' },
    });
    if (!doc) throw new NotFoundException(`No published legal document for slug "${slug}"`);
    return doc;
  }

  async recordAcceptance(userId: string, dto: AcceptLegalDocumentDto) {
    const doc = await this.prisma.legalDocument.findUnique({ where: { id: dto.legalDocumentId } });
    if (!doc) throw new NotFoundException('Legal document not found');
    return this.prisma.legalDocumentAcceptance.create({
      data: { userId, legalDocumentId: doc.id, version: doc.version },
    });
  }

  submitDsarRequest(userId: string, dto: CreateDsarRequestDto) {
    // A DELETION request is never silently auto-approved — SARS tax-record retention
    // requirements can legitimately override a "right to be forgotten" request, so every
    // DSAR lands in RECEIVED for manual review, never auto-COMPLETED.
    return this.prisma.dsarRequest.create({
      data: { userId, type: dto.type as never, status: 'RECEIVED', notes: dto.notes },
    });
  }

  getPendingDsarRequests() {
    return this.prisma.dsarRequest.findMany({
      where: { status: { in: ['RECEIVED', 'IN_PROGRESS'] } },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { requestedAt: 'asc' },
    });
  }

  async getOrGenerateInvoice(orderId: string) {
    const existing = await this.prisma.invoice.findUnique({ where: { orderId } });
    if (existing) return existing;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: { include: { company: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status === 'PENDING') {
      throw new ConflictException('Cannot issue a Tax Invoice before payment is confirmed');
    }

    const invoiceNumber = await this.nextInvoiceNumber();
    return this.prisma.invoice.create({
      data: {
        invoiceNumber,
        orderId: order.id,
        merchantVatNumber: MERCHANT_VAT_NUMBER,
        customerVatNumber: order.user.company?.vatNumber ?? null,
        subtotal: order.subtotal,
        vatAmount: order.vatAmount,
        total: order.total,
      },
    });
  }

  private async nextInvoiceNumber(): Promise<string> {
    // Sequential and never reused, per SARS requirement. The atomic counter is the single
    // allocation point — see CounterService for why counting Invoice rows cannot give this
    // guarantee under concurrency.
    const year = new Date().getFullYear();
    const sequence = await this.counters.next(`invoice:${year}`);
    return `ALS-INV-${year}-${String(sequence).padStart(6, '0')}`;
  }

  static calculateVat(exVatAmount: number): number {
    return Math.round(exVatAmount * VAT_RATE * 100) / 100;
  }
}
