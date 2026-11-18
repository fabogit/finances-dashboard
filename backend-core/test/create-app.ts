import { TestingModule } from '@nestjs/testing';
import { NestNodeApplication, NodeAdapter } from '@nestjs/platform-node';
import { configureApp } from '../src/app-setup.js';

/**
 * Builds the application of an end-to-end test on the same HTTP adapter as
 * `main.ts` (ADR-0011): without an adapter, `createNestApplication()` builds
 * an Express application. Applies the shared configuration and initialises it.
 */
export async function createApp(
  moduleFixture: TestingModule,
): Promise<NestNodeApplication> {
  const app = moduleFixture.createNestApplication<NestNodeApplication>(
    new NodeAdapter(),
  );
  configureApp(app);
  await app.init();
  return app;
}
