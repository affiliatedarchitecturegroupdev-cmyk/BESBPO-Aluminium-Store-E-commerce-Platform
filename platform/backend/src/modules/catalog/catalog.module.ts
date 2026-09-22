import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { CatalogBrowseService } from './catalog-browse.service';
import { CatalogMerchandisingService } from './catalog-merchandising.service';

@Module({
  controllers: [CatalogController],
  providers: [CatalogService, CatalogBrowseService, CatalogMerchandisingService],
  exports: [CatalogService, CatalogBrowseService, CatalogMerchandisingService],
})
export class CatalogModule {}
