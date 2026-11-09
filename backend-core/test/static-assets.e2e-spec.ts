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
  let server: Server;

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    configureApp(app);
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  it('/index.html (GET) - Should serve the API landing page', async () => {
    await request(server)
      .get('/index.html')
      .expect(200)
      .expect('Content-Type', /html/);
  });

  it('/ (GET) - Should serve the API landing page', async () => {
    const res = await request(server)
      .get('/')
      .expect(200)
      .expect('Content-Type', /html/);

    expect(res.text).toContain('<html');
  });

  it('/some/page (GET) - Should fall back to the API landing page', async () => {
    const res = await request(server)
      .get('/some/page')
      .expect(200)
      .expect('Content-Type', /html/);

    expect(res.text).toContain('<html');
  });

  it('/api/nonexistent (GET) - Should answer 404 in the global error format', async () => {
    const res = await request(server)
      .get('/api/nonexistent')
      .expect(404)
      .expect('Content-Type', /json/);

    expect(res.body).toEqual({
      statusCode: 404,
      timestamp: expect.any(String) as string,
      path: '/api/nonexistent',
      message: expect.any(String) as string,
      error: expect.any(String) as string,
    });
  });

  it('/api/v1/categories (GET) - Should reach the API route, not the static fallback', async () => {
    const res = await request(server)
      .get('/api/v1/categories')
      .expect(200)
      .expect('Content-Type', /json/);

    expect(Array.isArray(res.body)).toBe(true);
  });
});
