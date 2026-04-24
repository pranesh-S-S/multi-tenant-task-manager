import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigService } from '../../config/config.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';

/**
 * JWT Access Token Strategy.
 * Extracts the JWT from the Authorization: Bearer header.
 * Validates the signature and expiry, then returns the payload
 * which gets attached to request.user by Passport.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: AppConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.jwtAccessSecret,
    });
  }

  /**
   * Called after JWT is validated. The returned object is attached to request.user.
   */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    return {
      sub: payload.sub,
      orgId: payload.orgId,
      role: payload.role,
    };
  }
}
