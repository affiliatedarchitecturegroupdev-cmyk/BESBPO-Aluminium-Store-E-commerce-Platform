import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Provider-adapter pattern, same shape as the payments module. See
// docs/22-service-providers.md for the shortlist (Twilio/Bird/Infobip for WhatsApp,
// Clickatell/BulkSMS for SMS) — final provider choice is a business decision, not made here.
@Injectable()
export class CommunicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async sendWhatsApp(userId: string | null, phone: string, event: string, templateVars: Record<string, string>) {
    // TODO(phase-2): wire to the chosen WhatsApp Business API provider.
    const status = 'QUEUED';
    await this.logNotification(userId, 'WHATSAPP', event, status);
    return { channel: 'WHATSAPP', phone, event, status, templateVars };
  }

  async sendSms(userId: string | null, phone: string, event: string, body: string) {
    // TODO(phase-2): wire to the chosen SMS gateway (Clickatell/BulkSMS).
    const status = 'QUEUED';
    await this.logNotification(userId, 'SMS', event, status);
    return { channel: 'SMS', phone, event, status, body };
  }

  async sendEmail(userId: string | null, email: string, event: string, templateVars: Record<string, unknown>) {
    // TODO(phase-2): wire to the chosen transactional email provider (Postmark/SendGrid/SES).
    const status = 'QUEUED';
    await this.logNotification(userId, 'EMAIL', event, status);
    return { channel: 'EMAIL', email, event, status, templateVars };
  }

  private logNotification(userId: string | null, channel: string, event: string, status: string) {
    return this.prisma.notificationLog.create({
      data: { userId: userId ?? undefined, channel: channel as never, event, status },
    });
  }

  getLog(userId?: string) {
    return this.prisma.notificationLog.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { sentAt: 'desc' },
      take: 100,
    });
  }
}
