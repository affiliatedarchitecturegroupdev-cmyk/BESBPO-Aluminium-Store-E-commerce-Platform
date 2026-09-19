import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/prisma-exception.filter';

// Config that has no safe default is checked before the app starts. JWT_SECRET is the sharp
// one: JwtModule is registered with process.env.JWT_SECRET at import time, so a missing value
// would otherwise produce token-signing behaviour that only shows up at first login attempt.
function assertRequiredEnv() {
  const missing: string[] = [];
  if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
  if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
  if (missing.length > 0) {
    throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`);
  }
  if (process.env.NODE_ENV === 'production' && (process.env.JWT_SECRET ?? '').length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }
}

async function bootstrap() {
  assertRequiredEnv();
  const app = await NestFactory.create(AppModule);

  // CORS is restricted to the storefront origin. `enableCors()` with no arguments allows every
  // origin, which on a store that accepts credentials is not acceptable — the browser will
  // happily send cookies to any site that asks.
  //
  // Render supplies service hosts without a scheme ("storefront.onrender.com"). Browsers send
  // a full origin in the Origin header, so a bare host here would never match and every
  // cross-origin call would be blocked.
  const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
    .map((o) => (/^https?:\/\//.test(o) ? o : `https://${o}`));
  app.enableCors({ origin: allowedOrigins, credentials: true });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }));
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.setGlobalPrefix('api/v1');
  await app.listen(process.env.PORT ?? 4000, '0.0.0.0');
}
bootstrap();
