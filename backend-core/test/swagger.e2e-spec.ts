import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NodeAdapter } from '@nestjs/platform-node';
import request from 'supertest';
import { Server } from 'http';
import { AppModule } from '../src/app.module.js';
import { configureApp, setupSwagger } from '../src/app-setup.js';

const { version } = JSON.parse(
  readFileSync(join(import.meta.dirname, '../package.json'), 'utf8'),
) as { version: string };

interface OpenApiDocument {
  openapi: string;
  info: { title: string; version: string };
  paths: Record<string, Record<string, { responses: Record<string, unknown> }>>;
}

// Built with NestFactory and set up as in main.ts, on the Node adapter
// (ADR-0011), which serves the Swagger UI assets through useStaticAssets().
describe('Swagger (E2E)', () => {
  let app: INestApplication;
  let server: Server;

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, new NodeAdapter(), {
      logger: false,
    });
    configureApp(app);
    setupSwagger(app);
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  it('/docs (GET) - Should serve the Swagger UI', async () => {
    const res = await request(server)
      .get('/docs')
      .expect(200)
      .expect('Content-Type', /html/);

    expect(res.text).toContain('swagger-ui');
  });

  it('/docs/swagger-ui-bundle.js (GET) - Should serve the UI assets', async () => {
    await request(server)
      .get('/docs/swagger-ui-bundle.js')
      .expect(200)
      .expect('Content-Type', /javascript/);
  });

  it('/docs-json (GET) - Should serve the OpenAPI document of the API', async () => {
    const res = await request(server)
      .get('/docs-json')
      .expect(200)
      .expect('Content-Type', /json/);

    const document = res.body as OpenApiDocument;
    expect(document.openapi).toMatch(/^3\./);
    expect(document.info).toEqual(
      expect.objectContaining({ title: 'Finance Dashboard API', version }),
    );
    // Routes carry the global prefix and the URI version
    expect(
      Object.keys(document.paths['/api/v1/transactions/upload'].post.responses),
    ).toEqual(expect.arrayContaining(['201', '413', '422']));
  });
});
