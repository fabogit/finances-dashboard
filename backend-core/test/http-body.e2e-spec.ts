import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'http';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app-setup.js';

const CATEGORIES_URL = '/api/v1/categories';

/** The JSON body parser's default limit, the same on Express and Node. */
const BODY_LIMIT_BYTES = 100 * 1024;

// Pins how a JSON body is parsed across HTTP adapters (#88).
describe('HTTP body parsing (E2E)', () => {
  let app: INestApplication;
  let server: Server;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  const expectError = (body: unknown, statusCode: number) => {
    expect(body).toEqual({
      statusCode,
      timestamp: expect.any(String) as string,
      path: CATEGORIES_URL,
      message: expect.any(String) as string,
      error: expect.any(String) as string,
    });
  };

  it('Should answer 413 to a JSON body over 100 kb', async () => {
    const res = await request(server)
      .post(CATEGORIES_URL)
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ name: 'x'.repeat(BODY_LIMIT_BYTES) }))
      .expect(413);

    expectError(res.body, 413);
  });

  it('Should answer 400 to malformed JSON', async () => {
    const res = await request(server)
      .post(CATEGORIES_URL)
      .set('Content-Type', 'application/json')
      .send('{"name": ')
      .expect(400);

    expectError(res.body, 400);
  });
});
