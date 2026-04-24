import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AppConfigService } from './config/config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(AppConfigService);
  const logger = new Logger('Bootstrap');

  // Global prefix for all routes: /api/v1/*
  app.setGlobalPrefix('api/v1');

  // Cookie parser — required for httpOnly refresh token cookies
  app.use(cookieParser());

  // CORS — allow frontend origin with credentials (cookies)
  app.enableCors({
    origin: config.frontendUrl,
    credentials: true, // Required for cookies to be sent cross-origin
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // Strip properties not in DTO
      forbidNonWhitelisted: true, // Throw 400 if unknown properties sent
      transform: true,            // Auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = config.port;
  await app.listen(port);
  logger.log(`🚀 Server running on http://localhost:${port}/api/v1`);
  logger.log(`📋 Environment: ${config.nodeEnv}`);
}

bootstrap();
