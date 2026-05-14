import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/utils/exeption-filter';
import { ConfigService } from '@nestjs/config';
import { REDIS_CLIENT } from './redis/redis.module';
//import * as cookieParser from 'cookie-parser';
import IORedis from 'ioredis';
import { RedisStore } from 'connect-redis';
import { parseBoolean } from './common/utils/parse-boolean';
//import * as session from 'express-session';
import * as express from 'express';
import cookieParser from 'cookie-parser';
import session from 'express-session';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  app.useGlobalFilters(new GlobalExceptionFilter());

  const config = app.get(ConfigService);

  const redis = app.get<IORedis>(REDIS_CLIENT);

  app.use('/payment/webhook/stripe', express.raw({ type: 'application/json' }));

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.use(cookieParser(config.getOrThrow<string>('COOKIES_SECRET')));

  app.use(
    session({
      secret: config.getOrThrow<string>('SESSION_SECRET'),
      name: config.getOrThrow<string>('SESSION_NAME'),
      resave: false,
      rolling: true,
      saveUninitialized: false,
      cookie: {
        //domain: config.getOrThrow<string>('SESSION_DOMAIN'),
        maxAge: +config.getOrThrow<number>('SESSION_MAX_AGE_30DAYS'),
        httpOnly: parseBoolean(config.getOrThrow<string>('SESSION_HTTP_ONLY')),
        secure: parseBoolean(config.getOrThrow<string>('SESSION_SECURE')),
        sameSite:
          config.getOrThrow<string>('NODE_ENV') === 'development'
            ? 'none'
            : 'lax',
      },
      store: new RedisStore({
        client: redis,
        prefix: config.getOrThrow<string>('SESSION_FOLDER'),
      }),
    }),
  );

  app.enableCors({
    credentials: true,
    origin: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Online Game API')
    .setDescription(
      'Backend REST API for the online game platform.\n\n' +
        '**Authentication:** use `POST /api/v1/auth/login` to receive a session',
    )
    .setVersion('1.0')
    .addCookieAuth('connect.sid', {
      type: 'apiKey',
      in: 'cookie',
    })
    .addTag('Auth', 'Registration, login, logout, session management')
    .addTag('User', 'Profile, address, password management')
    .addTag('Admin', 'User management, bans, roles, platform statistics')
    .addTag('Wallet', 'Balance, transaction history, withdrawal requests')
    .addTag('Payment', 'Deposits via provider, webhook handling')
    .addTag('Roulette', 'Game sessions, bets, spin, provably fair verification')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`Server running on http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
