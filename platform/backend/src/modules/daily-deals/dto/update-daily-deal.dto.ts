import { PartialType } from '@nestjs/mapped-types';
import { CreateDailyDealDto } from './create-daily-deal.dto';

export class UpdateDailyDealDto extends PartialType(CreateDailyDealDto) {}
