import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateTicketDto {
  @IsString()
  subject: string;

  @IsIn(['EMAIL', 'CHAT', 'WHATSAPP'])
  channel: string;

  @IsOptional() @IsString()
  chatSessionId?: string;

  @IsOptional() @IsIn(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
  priority?: string;
}
