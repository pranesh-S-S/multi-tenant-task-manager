import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../types/jwt-payload.type';

/**
 * Parameter decorator to extract the current authenticated user from the request.
 * The user object is attached to the request by JwtAuthGuard after JWT validation.
 *
 * @example
 * @Get('profile')
 * getProfile(@CurrentUser() user: JwtPayload) {
 *   return this.usersService.findById(user.sub);
 * }
 *
 * @example
 * // Extract a specific property
 * @Get('tasks')
 * getTasks(@CurrentUser('orgId') orgId: string) {
 *   return this.tasksService.findByOrg(orgId);
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    return data ? user?.[data] : user;
  },
);
