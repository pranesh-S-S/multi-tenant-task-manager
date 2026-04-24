import { SetMetadata } from '@nestjs/common';

/**
 * Mark a route as publicly accessible (bypasses JwtAuthGuard).
 * Use this on routes like login, register, health checks.
 *
 * By default, ALL routes require JWT authentication because
 * JwtAuthGuard is registered as a global guard. This decorator
 * opts specific routes out of that protection.
 *
 * @example
 * @Public()
 * @Post('login')
 * login() {}
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
