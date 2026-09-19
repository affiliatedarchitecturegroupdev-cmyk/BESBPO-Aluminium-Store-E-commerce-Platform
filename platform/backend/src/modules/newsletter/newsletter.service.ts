import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscribeDto } from './dto/subscribe.dto';

@Injectable()
export class NewsletterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async subscribe(dto: SubscribeDto) {
    const subscriber = await this.prisma.newsletterSubscriber.upsert({
      where: { email: dto.email },
      update: { active: true, unsubscribedAt: null },
      create: { email: dto.email, source: dto.source },
    });
    // The unsubscribe link is signed and carries the subscriber's own address. A bare
    // `?email=` link would let anyone who knows a colleague's address remove them from every
    // mailing list (POPIA s11 — consent must be withdrawn by the data subject, not a third party).
    return { ...subscriber, unsubscribeToken: this.signUnsubscribeToken(subscriber.email) };
  }

  unsubscribe(token: string) {
    let email: string;
    try {
      // Scoped audience: a token minted for password reset or any other purpose must not be
      // replayable against this endpoint, so the audience is checked and not merely signed.
      const payload = this.jwt.verify<{ email: string; aud: string }>(token, {
        audience: 'newsletter-unsubscribe',
      });
      email = payload.email;
    } catch {
      throw new BadRequestException('Invalid or expired unsubscribe link');
    }
    return this.prisma.newsletterSubscriber.update({
      where: { email },
      data: { active: false, unsubscribedAt: new Date() },
    });
  }

  private signUnsubscribeToken(email: string): string {
    // Long-lived: an unsubscribe link in a years-old email must still work.
    return this.jwt.sign({ email }, { audience: 'newsletter-unsubscribe', expiresIn: '5y' });
  }

  // Abandoned-cart tracking lives here rather than in the cart module — it's a marketing
  // recovery concern reading cart state, not cart business logic itself.
  async logAbandonedCart(cartId: string, userId: string | null) {
    return this.prisma.abandonedCartLog.upsert({
      where: { cartId },
      update: { lastActivityAt: new Date() },
      create: { cartId, userId, lastActivityAt: new Date() },
    });
  }
}
