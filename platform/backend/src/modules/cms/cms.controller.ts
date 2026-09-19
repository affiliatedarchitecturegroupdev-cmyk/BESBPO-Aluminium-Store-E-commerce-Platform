import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CmsService } from './cms.service';
import { UpsertContentBlockDto } from './dto/upsert-content-block.dto';
import { UploadMediaAssetDto } from './dto/upload-media-asset.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../admin/roles.guard';
import { Roles } from '../admin/roles.decorator';

// Content management for the storefront's editable surfaces — homepage hero slides,
// promotional banners, category feature callouts, and SEO metadata. This is what lets
// merchandising staff change what the corporate/storefront homepage shows without a
// code deploy, matching "I want a CMS" from the brief.
@Controller('cms')
export class CmsController {
  constructor(private readonly service: CmsService) {}

  // Public read — the storefront frontend calls this to render published content.
  @Get('content-blocks')
  findPublished(@Query('type') type?: string) {
    return this.service.findPublished(type);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('content-blocks/all')
  findAll() {
    return this.service.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('content-blocks')
  upsert(@Body() dto: UpsertContentBlockDto) {
    return this.service.upsertContentBlock(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('content-blocks/:key/publish')
  publish(@Param('key') key: string) {
    return this.service.setPublished(key, true);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('content-blocks/:key/unpublish')
  unpublish(@Param('key') key: string) {
    return this.service.setPublished(key, false);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete('content-blocks/:key')
  remove(@Param('key') key: string) {
    return this.service.removeContentBlock(key);
  }

  // ---- Media library ----
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('media')
  findMedia(@Query('tag') tag?: string) {
    return this.service.findMedia(tag);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('media')
  registerUpload(@Body() dto: UploadMediaAssetDto) {
    // Actual binary upload goes straight to Supabase Storage from the admin frontend;
    // this endpoint registers the resulting URL/metadata in the media library.
    return this.service.registerMedia(dto);
  }
}
