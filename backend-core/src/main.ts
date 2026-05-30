import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { configureApp } from './app-setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  const configService = app.get(ConfigService);

  // Apply all shared configurations (CORS, Pipes, Filters, Interceptors, Prefix, Versioning)
  configureApp(app);

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

  const HOST = configService.get<string>('HOST') || '0.0.0.0';
  const PORT = configService.get<number>('PORT') || 3000;
  await app.listen(PORT, HOST);
  logger.log(`✅ Application is running on: ${await app.getUrl()}`);
  logger.log(`✅ Swagger documentation: ${await app.getUrl()}/${swaggerPath}`);
}
void bootstrap();
