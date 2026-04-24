import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT Refresh Token Guard.
 * Used exclusively on the /auth/refresh and /auth/logout endpoints.
 * Validates the refresh token from the Authorization header.
 */
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
