import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  imports: [],
  exports: [PrismaService],
  providers: [
    {
      provide: PrismaService,
      useFactory: (configService: ConfigService) => {
        const url = configService.get<string>('DATABASE_URL');
        if (!url) throw new Error('DATABASE_URL missing');

        return new PrismaService(url);
      },
      inject: [ConfigService],
    },
  ],
})
export class PrismaModule {}
