import { PartialType } from '@nestjs/mapped-types';
import { CreateQuoteDto } from './create-quotes.dto';

export class UpdateQuoteDto extends PartialType(CreateQuoteDto) {}
