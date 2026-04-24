import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify which roles can access an endpoint.
 * Used with RolesGuard to enforce role-based access.
 *
 * @example
 * @Roles('ADMIN')
 * @Get('admin-only')
 * adminRoute() {}
 *
 * @example
 * @Roles('ADMIN', 'MEMBER')
 * @Get('any-authenticated')
 * memberRoute() {}
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
