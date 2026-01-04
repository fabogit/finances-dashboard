import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  const httpAdapter = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  const swaggerPath = 'doc';
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Finance Dashboard API')
      .setDescription('API for managing and analyzing personal expenses')
      .setVersion('1.0')
      .addTag('transactions')
      .build(),
  );
  SwaggerModule.setup(swaggerPath, app, document);

  const PORT = process.env.PORT || 3000;
  await app.listen(PORT);
  logger.log(`✅ Swagger documentation: ${await app.getUrl()}/${swaggerPath}`);
  logger.log(`✅ Application is running on: ${await app.getUrl()}`);
}
void bootstrap();
