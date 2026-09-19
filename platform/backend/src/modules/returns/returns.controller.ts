import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { RequestReturnDto } from './dto/request-return.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../admin/roles.guard';
import { Roles } from '../admin/roles.decorator';

@Controller('returns')
export class ReturnsController {
  constructor(private readonly service: ReturnsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  request(@Body() dto: RequestReturnDto) {
    return this.service.requestReturn(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('pending')
  pending() {
    return this.service.getPending();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.service.approve(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/reject')
  reject(@Param('id') id: string) {
    return this.service.reject(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/refund')
  refund(@Param('id') id: string) {
    return this.service.markRefunded(id);
  }
}
