import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { ConfiguratorModule } from './modules/configurator/configurator.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { TradeAccountsModule } from './modules/trade-accounts/trade-accounts.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { CmiRoutingModule } from './modules/cmi-routing/cmi-routing.module';
import { ComplianceDocsModule } from './modules/compliance-docs/compliance-docs.module';
import { DeliveryModule } from './modules/delivery/delivery.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AdminModule } from './modules/admin/admin.module';
import { CmsModule } from './modules/cms/cms.module';
import { BusinessDeskModule } from './modules/business-desk/business-desk.module';
import { LegalTaxModule } from './modules/legal-tax/legal-tax.module';
import { LogisticsModule } from './modules/logistics/logistics.module';
import { CommunicationsModule } from './modules/communications/communications.module';
import { WishlistsModule } from './modules/wishlists/wishlists.module';
import { ProductQuestionsModule } from './modules/product-questions/product-questions.module';
import { HealthModule } from './modules/health/health.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { BlogModule } from './modules/blog/blog.module';
import { FaqModule } from './modules/faq/faq.module';
import { ReturnsModule } from './modules/returns/returns.module';
import { SupportModule } from './modules/support/support.module';
import { AiAgentModule } from './modules/ai-agent/ai-agent.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';
import { NewsletterModule } from './modules/newsletter/newsletter.module';
import { AdvertisementsModule } from './modules/advertisements/advertisements.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
    PrismaModule,
    AuthModule,
    CatalogModule,
    ConfiguratorModule,
    CartModule,
    OrdersModule,
    TradeAccountsModule,
    QuotesModule,
    CmiRoutingModule,
    ComplianceDocsModule,
    DeliveryModule,
    PaymentsModule,
    AdminModule,
    CmsModule,
    BusinessDeskModule,
    LegalTaxModule,
    LogisticsModule,
    CommunicationsModule,
    WishlistsModule,
    ProductQuestionsModule,
    HealthModule,
    ReviewsModule,
    BlogModule,
    FaqModule,
    ReturnsModule,
    SupportModule,
    AiAgentModule,
    PromotionsModule,
    LoyaltyModule,
    NewsletterModule,
    AdvertisementsModule,
    ProjectsModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
