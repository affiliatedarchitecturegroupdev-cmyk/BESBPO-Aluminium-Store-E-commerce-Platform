import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Standard JWT guard — decorate protected routes with @UseGuards(JwtAuthGuard).
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
