import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../admin/roles.guard';
import { Roles } from '../admin/roles.decorator';

@Controller('collections')
export class CollectionsController {
  constructor(private readonly service: CollectionsService) {}

  // Public — "Seasonal / Thematic Collections" lookbook cards on the homepage.
  @Get()
  findPublished(@Query('take') take?: string) {
    return this.service.findPublished(Number(take) || 6);
  }

  // Literal route before the :slug route, so "all" is never captured as a slug.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  @Get('all')
  findAll() {
    return this.service.findAll();
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.service.findBySlug(slug);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  @Post()
  create(@Body() dto: CreateCollectionDto) {
    return this.service.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCollectionDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
