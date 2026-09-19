import { IsString } from 'class-validator';

export class RequestReturnDto {
  @IsString()
  orderItemId: string;

  @IsString()
  reason: string;
}
