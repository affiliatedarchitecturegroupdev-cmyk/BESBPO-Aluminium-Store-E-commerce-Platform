import { IsEmail, IsIn, IsString } from 'class-validator';

export class InviteTeamMemberDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsIn(['OWNER', 'BUYER', 'VIEWER'])
  role: string;
}
