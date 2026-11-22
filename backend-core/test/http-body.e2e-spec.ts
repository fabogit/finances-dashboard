import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'http';
import { AppModule } from '../src/app.module.js';
import { createApp } from './create-app.js';

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

    app = await createApp(moduleFixture);

    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  /**
   * The body parser's errors carry the reason phrase of their status as the
   * `error` code, like Nest's built-in exceptions (#98).
   */
  const expectError = (body: unknown, statusCode: number, error: string) => {
    expect(body).toEqual({
      statusCode,
      timestamp: expect.any(String) as string,
      path: CATEGORIES_URL,
      message: expect.any(String) as string,
      error,
    });
  };

  it('Should answer 413 to a JSON body over 100 kb', async () => {
    const res = await request(server)
      .post(CATEGORIES_URL)
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ name: 'x'.repeat(BODY_LIMIT_BYTES) }))
      .expect(413);

    expectError(res.body, 413, 'Payload Too Large');
  });

  it('Should answer 413 to a URL-encoded body over 100 kb', async () => {
    const res = await request(server)
      .post(CATEGORIES_URL)
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send(`name=${'x'.repeat(BODY_LIMIT_BYTES)}`)
      .expect(413);

    expectError(res.body, 413, 'Payload Too Large');
  });

  it('Should answer 415 to a body with an unsupported content encoding', async () => {
    const res = await request(server)
      .post(CATEGORIES_URL)
      .set('Content-Type', 'application/json')
      .set('Content-Encoding', 'foo')
      .send('{"name":"P"}')
      .expect(415);

    expectError(res.body, 415, 'Unsupported Media Type');
  });

  it('Should answer 400 to malformed JSON', async () => {
    const res = await request(server)
      .post(CATEGORIES_URL)
      .set('Content-Type', 'application/json')
      .send('{"name": ')
      .expect(400);

    expectError(res.body, 400, 'Bad Request');
  });

  // Express accepted these keys; the Node adapter rejects them (ADR-0011).
  it.each([
    ['__proto__', '{"name":"P","type":"NEEDS","__proto__":{"isSystem":true}}'],
    [
      'constructor.prototype',
      '{"name":"P","type":"NEEDS","constructor":{"prototype":{"isSystem":true}}}',
    ],
  ])('Should answer 400 to a JSON body with a %s key', async (_key, body) => {
    const res = await request(server)
      .post(CATEGORIES_URL)
      .set('Content-Type', 'application/json')
      .send(body)
      .expect(400);

    expectError(res.body, 400, 'Bad Request');
  });
});
