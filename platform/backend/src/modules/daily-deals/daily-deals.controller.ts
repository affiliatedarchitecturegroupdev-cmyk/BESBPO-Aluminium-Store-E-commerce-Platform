import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { DailyDealsService } from './daily-deals.service';
import { CreateDailyDealDto } from './dto/create-daily-deal.dto';
import { UpdateDailyDealDto } from './dto/update-daily-deal.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../admin/roles.guard';
import { Roles } from '../admin/roles.decorator';

@Controller('daily-deals')
export class DailyDealsController {
  constructor(private readonly service: DailyDealsService) {}

  // Public — "Deals of the Day" countdown cards on the homepage.
  @Get()
  findActive(@Query('take') take?: string) {
    return this.service.findActive(Number(take) || 4);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  @Get('all')
  findAll() {
    return this.service.findAll();
  }

  // The server-enforced cap. Authenticated because claiming is a buyer commitment against a
  // limited quantity — an anonymous caller must not be able to burn a capped deal's stock.
  @UseGuards(JwtAuthGuard)
  @Post(':id/claim')
  claim(@Param('id') id: string, @Body() body: { quantity?: number }) {
    return this.service.claim(id, Number(body?.quantity) || 1);
  }

  // Returns an abandoned claim so the last unit is not lost to a cancelled checkout. Staff-facing
  // because it is a corrective action on the counter, not something a buyer raises themselves.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  @Post(':id/release')
  release(@Param('id') id: string, @Body() body: { quantity?: number }) {
    return this.service.release(id, Number(body?.quantity) || 1);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  @Post()
  create(@Body() dto: CreateDailyDealDto) {
    return this.service.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDailyDealDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
