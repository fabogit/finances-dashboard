import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { NestNodeApplication, NodeAdapter } from '@nestjs/platform-node';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { configureApp, setupSwagger, SWAGGER_PATH } from './app-setup.js';

async function bootstrap() {
  // Native Node HTTP adapter instead of Express (ADR-0011).
  const app = await NestFactory.create<NestNodeApplication>(
    AppModule,
    new NodeAdapter(),
  );
  const logger = new Logger('Bootstrap');
  const configService = app.get(ConfigService);

  // Apply all shared configurations (CORS, Pipes, Filters, Interceptors, Prefix, Versioning)
  configureApp(app);
  setupSwagger(app);

  const HOST = configService.get<string>('HOST') || '0.0.0.0';
  const PORT = configService.get<number>('PORT') || 3000;
  await app.listen(PORT, HOST);
  logger.log(`✅ Application is running on: ${await app.getUrl()}`);
  logger.log(`✅ Swagger documentation: ${await app.getUrl()}/${SWAGGER_PATH}`);
}
await bootstrap();
