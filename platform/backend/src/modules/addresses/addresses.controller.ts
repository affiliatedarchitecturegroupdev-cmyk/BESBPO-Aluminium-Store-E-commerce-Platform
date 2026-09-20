import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

type AuthedRequest = Request & { user: { id: string } };

@UseGuards(JwtAuthGuard)
@Controller('addresses')
export class AddressesController {
  constructor(private readonly service: AddressesService) {}

  @Get()
  list(@Req() req: AuthedRequest) {
    return this.service.list(req.user.id);
  }

  @Post()
  create(@Req() req: AuthedRequest, @Body() dto: CreateAddressDto) {
    return this.service.create(req.user.id, dto);
  }

  @Patch(':id')
  update(@Req() req: AuthedRequest, @Param('id') id: string, @Body() dto: UpdateAddressDto) {
    return this.service.update(req.user.id, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.service.remove(req.user.id, id);
  }
}