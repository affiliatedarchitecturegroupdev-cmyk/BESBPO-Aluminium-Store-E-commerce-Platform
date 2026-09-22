import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { FeaturedProductsService } from './featured-products.service';
import { CreateFeaturedProductDto } from './dto/create-featured-product.dto';
import { UpdateFeaturedProductDto } from './dto/update-featured-product.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../admin/roles.guard';
import { Roles } from '../admin/roles.decorator';

@Controller('featured-products')
export class FeaturedProductsController {
  constructor(private readonly service: FeaturedProductsService) {}

  // Public — "Featured / Editor's Picks" on the homepage.
  @Get()
  findPublished(@Query('take') take?: string) {
    return this.service.findPublished(Number(take) || 6);
  }

  // Curation is a merchandising operation: an anonymous caller must not be able to put a
  // product in the editor's picks, which is why every write route below is guarded.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  @Get('all')
  findAll() {
    return this.service.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  @Post()
  create(@Body() dto: CreateFeaturedProductDto) {
    return this.service.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFeaturedProductDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
