import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { AppConfigService } from '../../config/config.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';

/**
 * JWT Refresh Token Strategy.
 * Extracts the refresh token from the httpOnly cookie.
 * Falls back to Authorization header for API testing (Postman, etc).
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(configService: AppConfigService) {
    super({
      jwtFromRequest: (req: any) => {
        // 1. Try httpOnly cookie first (production pattern)
        if (req?.cookies?.refresh_token) {
          return req.cookies.refresh_token;
        }
        // 2. Fallback to Authorization header (for API testing)
        const authHeader = req?.headers?.authorization;
        if (authHeader?.startsWith('Bearer ')) {
          return authHeader.replace('Bearer ', '').trim();
        }
        return null;
      },
      ignoreExpiration: false,
      secretOrKey: configService.jwtRefreshSecret,
      passReqToCallback: true,
    });
  }

  /**
   * Called after refresh JWT is validated.
   * Passes the raw token along so the service can verify it against the DB.
   */
  async validate(req: any, payload: JwtPayload) {
    // Extract the raw refresh token (same source as jwtFromRequest)
    const refreshToken =
      req?.cookies?.refresh_token ||
      req?.headers?.authorization?.replace('Bearer ', '').trim();

    return {
      sub: payload.sub,
      orgId: payload.orgId,
      role: payload.role,
      refreshToken,
    };
  }
}
