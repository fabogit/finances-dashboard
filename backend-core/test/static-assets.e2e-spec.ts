import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import { Server } from 'http';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app-setup';

// Built with NestFactory, as in main.ts: a TestingModule instantiates
// ServeStaticModule before the HTTP adapter exists, so it would serve nothing.
describe('Static assets (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/index.html (GET) - Should serve the API landing page', async () => {
    const server = app.getHttpServer() as Server;

    await request(server)
      .get('/index.html')
      .expect(200)
      .expect('Content-Type', /html/);
  });
});
