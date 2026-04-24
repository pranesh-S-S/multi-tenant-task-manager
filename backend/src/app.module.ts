import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { TasksModule } from './tasks/tasks.module';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    // Global modules
    AppConfigModule,
    PrismaModule,

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000,  // 60 seconds
        limit: 10,   // 10 requests per window (auth routes)
      },
    ]),

    // Feature modules
    AuthModule,
    UsersModule,
    OrganizationsModule,
    TasksModule,
    ActivityLogsModule,
  ],
  providers: [
    // Global guards — applied to ALL routes in order:
    // 1. JwtAuthGuard: validates JWT (skipped if @Public())
    // 2. RolesGuard: checks role (skipped if no @Roles())
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
