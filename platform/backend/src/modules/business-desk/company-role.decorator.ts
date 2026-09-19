import { SetMetadata } from '@nestjs/common';

// Distinct from the admin module's @Roles() decorator (UserRole: RETAIL/TRADE/ADMIN/...) —
// this gates by CompanyRole (OWNER/BUYER/VIEWER) within a single Business Desk account.
export const RequireCompanyRole = (...roles: string[]) => SetMetadata('companyRoles', roles);
