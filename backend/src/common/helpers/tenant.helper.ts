import { JwtPayload } from '../types/jwt-payload.type';

/**
 * Creates a tenant-scoped filter object for Prisma queries.
 * Automatically excludes soft-deleted records unless explicitly included.
 *
 * @param user - JWT payload containing orgId
 * @param includeDeleted - If true, includes soft-deleted records
 * @returns Prisma where clause with organizationId and optional isDeleted filter
 */
export function withTenantScope(
  user: JwtPayload,
  includeDeleted = false,
) {
  return {
    organizationId: user.orgId,
    ...(includeDeleted ? {} : { isDeleted: false }),
  };
}
