import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

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
    origin: process.env.CORS_ORIGIN || '*', // Allow configuration, default to all for now but should be restricted in prod
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
  const httpAdapter = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Finance Dashboard API')
      .setDescription('API for managing and analyzing personal expenses')
      .setVersion('1.0')
      .addTag('Transactions')
      .build(),
  );
  const swaggerPath = 'docs';
  SwaggerModule.setup(swaggerPath, app, document);

  const HOST = process.env.HOST || '0.0.0.0';
  const PORT = process.env.PORT || 3000;
  await app.listen(PORT, HOST);
  logger.log(`✅ Application is running on: ${await app.getUrl()}`);
  logger.log(`✅ Swagger documentation: ${await app.getUrl()}/${swaggerPath}`);
}
void bootstrap();
