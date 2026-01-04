import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { Prisma, PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient<Prisma.PrismaClientOptions, 'query' | 'error'>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(databaseUrl: string) {
    const adapter = new PrismaBetterSqlite3({
      url: databaseUrl,
    });

    super({
      adapter,
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
      ],
    });
  }

  async onModuleInit() {
    this.$on('query', (e: Prisma.QueryEvent) => {
      this.logger.debug(`Query: ${e.query}`);
      this.logger.debug(`Params: ${e.params}`);
      this.logger.debug(`Duration: ${e.duration}ms`);
    });

    this.$on('error', (e: Prisma.LogEvent) => {
      this.logger.error(`Prisma Error: ${e.message}`);
    });

    try {
      await this.$connect();
      this.logger.log('Prisma connected with Better-SQLite3 adapter');
    } catch (err) {
      this.logger.error('Failed to connect to SQLite', err);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
