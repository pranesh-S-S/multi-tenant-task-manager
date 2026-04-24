import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

/**
 * Typed configuration service.
 * Wraps NestJS ConfigService with strongly-typed getters
 * to avoid magic strings scattered throughout the codebase.
 */
@Injectable()
export class AppConfigService {
  constructor(private configService: NestConfigService) {}

  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV', 'development');
  }

  get port(): number {
    return this.configService.get<number>('PORT', 3001);
  }

  get databaseUrl(): string {
    return this.configService.getOrThrow<string>('DATABASE_URL');
  }

  get jwtAccessSecret(): string {
    return this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
  }

  get jwtRefreshSecret(): string {
    return this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
  }

  get jwtAccessExpiration(): string {
    return this.configService.get<string>('JWT_ACCESS_EXPIRATION', '15m');
  }

  get jwtRefreshExpiration(): string {
    return this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d');
  }

  get throttleTtl(): number {
    return this.configService.get<number>('THROTTLE_TTL', 60000);
  }

  get throttleLimit(): number {
    return this.configService.get<number>('THROTTLE_LIMIT', 10);
  }

  get frontendUrl(): string {
    return this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get cookieDomain(): string | undefined {
    return this.configService.get<string>('COOKIE_DOMAIN') || undefined;
  }
}
