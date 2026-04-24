/**
 * JWT payload type.
 * Using a CLASS (not interface) because NestJS emitDecoratorMetadata
 * requires runtime type information for decorated parameters.
 */
export class JwtPayload {
  sub: string;        // userId
  orgId: string;      // organizationId
  role: 'ADMIN' | 'MEMBER';
  iat?: number;
  exp?: number;
}
