import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { CatalogBrowseService } from './catalog-browse.service';

@Module({
  controllers: [CatalogController],
  providers: [CatalogService, CatalogBrowseService],
  exports: [CatalogService, CatalogBrowseService],
})
export class CatalogModule {}
