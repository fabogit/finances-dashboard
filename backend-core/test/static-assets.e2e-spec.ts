import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import { Server } from 'http';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app-setup.js';

// The headers helmet sets with the options of configureApp, on every response.
const expectSecurityHeaders = (res: request.Response) => {
  const csp = res.headers['content-security-policy'];
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
  expect(csp).toContain("style-src 'self' 'unsafe-inline' https:");
  expect(csp).toContain("img-src 'self' data: https:");
  expect(res.headers).toMatchObject({
    'cross-origin-opener-policy': 'same-origin',
    'cross-origin-resource-policy': 'same-origin',
    'referrer-policy': 'no-referrer',
    'strict-transport-security': 'max-age=31536000; includeSubDomains',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'SAMEORIGIN',
  });
  expect(res.headers).not.toHaveProperty('x-powered-by');
};

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

  it('Should send the security headers on an API response', async () => {
    const res = await request(server).get('/api/v1/categories').expect(200);

    expectSecurityHeaders(res);
  });

  it('Should send the security headers on a static file and the fallback', async () => {
    expectSecurityHeaders(await request(server).get('/').expect(200));
    expectSecurityHeaders(await request(server).get('/some/page').expect(200));
  });

  it('Should answer a CORS preflight on an API route', async () => {
    const res = await request(server)
      .options('/api/v1/categories')
      .set('Origin', 'http://localhost:4200')
      .set('Access-Control-Request-Method', 'POST')
      .expect(204);

    expect(res.headers['access-control-allow-origin']).toBeDefined();
    expect(res.headers['access-control-allow-methods']).toBe(
      'GET,HEAD,PUT,PATCH,POST,DELETE',
    );
  });
});
