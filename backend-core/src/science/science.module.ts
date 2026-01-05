import { Module } from '@nestjs/common';
import { ScienceService } from './science.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [ScienceService],
  exports: [ScienceService],
})
export class ScienceModule {}
