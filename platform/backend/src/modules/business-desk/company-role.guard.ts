import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CompanyRoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Same class-vs-handler lookup as RolesGuard: reading only the handler would silently skip
    // the check on any controller that declares @RequireCompanyRole at class level.
    const required = this.reflector.getAllAndOverride<string[]>('companyRoles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const { user } = context.switchToHttp().getRequest();
    if (!user?.id) throw new ForbiddenException('Not signed in');
    const record = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!record?.companyRole || !required.includes(record.companyRole)) {
      throw new ForbiddenException('Insufficient company role for this resource');
    }
    return true;
  }
}
