import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CmiRoutingService } from './cmi-routing.service';
import { RouteOrderDto } from './dto/route-order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../admin/roles.guard';
import { Roles } from '../admin/roles.decorator';

@Controller('cmi-routing')
export class CmiRoutingController {
  constructor(private readonly service: CmiRoutingService) {}

  // Returns a ranked shortlist of partners — a human confirms, this never auto-assigns.
  @Post('suggest')
  suggest(@Body() dto: RouteOrderDto) {
    return this.service.suggestPartners(dto);
  }

  // Public directory for the /cmi-partners trust page. Deliberately excludes capacity,
  // order counts and contact details — that is commercial information for staff routing,
  // not storefront content (docs/06-cmi-partner-routing.md).
  @Get('partners')
  partners() {
    return this.service.listPublicPartners();
  }

  // Confirming a partner assigns real work to a third party and commits spend. The doc is
  // explicit that a human approves routing, so this is staff-only rather than public.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  @Post(':orderId/confirm/:partnerId')
  confirm(@Param('orderId') orderId: string, @Param('partnerId') partnerId: string) {
    return this.service.confirmRouting(orderId, partnerId);
  }
}
