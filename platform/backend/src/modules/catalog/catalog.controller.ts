import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CatalogBrowseService } from './catalog-browse.service';
import { CatalogMerchandisingService } from './catalog-merchandising.service';
import { CreateProductDto } from './dto/create-catalog.dto';
import { UpdateProductDto } from './dto/update-catalog.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../admin/roles.guard';
import { Roles } from '../admin/roles.decorator';

@Controller('catalog')
export class CatalogController {
  constructor(
    private readonly service: CatalogService,
    private readonly browse: CatalogBrowseService,
    private readonly merchandising: CatalogMerchandisingService,
  ) {}

  // ---- Storefront read model ----

  @Get('categories')
  categories() {
    return this.browse.findCategories();
  }

  @Get('categories/:slug')
  category(@Param('slug') slug: string) {
    return this.browse.findCategoryBySlug(slug);
  }

  @Get('subcategories/:slug')
  subCategory(@Param('slug') slug: string) {
    return this.browse.findSubCategoryBySlug(slug);
  }

  @Get('finishes')
  finishes() {
    return this.browse.findFinishes();
  }

  // ---- Merchandising sections (docs/37-merchandising-sections.md) ----
  // Each sits above the `:id` route below so a literal path is never captured as an id.

  // Best Sellers — ranked leaderboard, OrderItem quantity aggregation.
  @Get('best-sellers')
  bestSellers(@Query('take') take?: string) {
    return this.merchandising.getBestSellers(Number(take) || 8);
  }

  // Top Rated — Review aggregation with a minimum-review threshold.
  @Get('top-rated')
  topRated(@Query('take') take?: string, @Query('minReviews') minReviews?: string) {
    return this.merchandising.getTopRated(Number(take) || 8, Number(minReviews) || 3);
  }

  // Shop by Finish — the swatch set, or one finish's products when a finishId is given.
  @Get('by-finish')
  byFinish(@Query('finishId') finishId?: string, @Query('take') take?: string) {
    return this.merchandising.getByFinish(finishId, Number(take) || 60);
  }

  // Budget Shop — tabbed, approximate price bands.
  @Get('budget-shop')
  budgetShop(@Query('tier') tier?: string, @Query('take') take?: string) {
    return this.merchandising.getBudgetShop(tier, Number(take) || 12);
  }

  @Get('glazing-packages')
  glazingPackages() {
    return this.browse.findGlazingPackages();
  }

  @Get('locations')
  locations() {
    return this.browse.findLocations();
  }

  // Homepage "Clearance Sale" carousel (spec §7.1). Public — a clearance price is
  // customer-facing, so no tier is consulted here.
  @Get('clearance')
  clearance(@Query('take') take?: string) {
    return this.browse.findClearance(Number(take) || 8);
  }

  // Product lookup by SKU — the PDP route key (docs/02-storefront-ux-ia.md).
  @Get('by-sku/:sku')
  bySku(@Param('sku') sku: string) {
    return this.browse.findProductBySku(sku);
  }

  // ---- Listing + CRUD ----
  // `products` sits after the literal routes above so slugs like "categories"/"finishes"
  // are never captured as an :id by the router.

  @Get('products')
  products(@Query() query: Record<string, string>) {
    return this.browse.findProducts(query);
  }

  @Get()
  findAll(@Query() query: Record<string, string>) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  // Catalogue writes are merchandising operations, not buyer actions. Without the guard this
  // endpoint let any anonymous caller create, reprice or delete a product.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.service.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
