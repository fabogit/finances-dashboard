import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HttpAdapterHost, Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';

export function configureApp(app: INestApplication): void {
  const configService = app.get(ConfigService);

  // Security enhancements
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
    }),
  );

  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN'),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Enable global serialization
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const httpAdapter = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
}

/**
 * Path of the Swagger UI; the OpenAPI document is served at `/docs-json`.
 * Outside the `api` prefix, next to the static landing page.
 */
export const SWAGGER_PATH = 'docs';

/** Serves the Swagger UI and the OpenAPI document of the API. */
export function setupSwagger(app: INestApplication): void {
  // The same relative path from src/ (tests, tsx) and from dist/ (build).
  const { version } = JSON.parse(
    readFileSync(join(import.meta.dirname, '../package.json'), 'utf8'),
  ) as { version: string };

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Finance Dashboard API')
      .setDescription('API for managing and analyzing personal expenses')
      .setVersion(version)
      .addTag('Transactions')
      .build(),
  );
  SwaggerModule.setup(SWAGGER_PATH, app, document);
}
