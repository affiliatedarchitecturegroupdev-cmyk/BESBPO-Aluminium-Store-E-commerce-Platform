import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ProductPairingsService } from './product-pairings.service';
import { CreateProductPairingDto } from './dto/create-product-pairing.dto';
import { UpdateProductPairingDto } from './dto/update-product-pairing.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../admin/roles.guard';
import { Roles } from '../admin/roles.decorator';

@Controller('product-pairings')
export class ProductPairingsController {
  constructor(private readonly service: ProductPairingsService) {}

  // Literal route before the :sku route, so "all" is never read as a SKU.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  @Get('all')
  findAll() {
    return this.service.findAll();
  }

  // Public — "Complete the Project" strip on the product detail page, keyed by the SKU the PDP
  // route already carries.
  @Get('by-sku/:sku')
  forSku(@Param('sku') sku: string, @Query('take') take?: string) {
    return this.service.findForSku(sku, Number(take) || 6);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  @Post()
  create(@Body() dto: CreateProductPairingDto) {
    return this.service.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductPairingDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
