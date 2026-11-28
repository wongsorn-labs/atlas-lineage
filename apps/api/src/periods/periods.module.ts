import { Module } from '@nestjs/common';
import { PeriodsController } from './periods.controller';
import { PeriodsService } from './periods.service';
import { TreesModule } from '../trees/trees.module';

@Module({
  imports: [TreesModule],
  controllers: [PeriodsController],
  providers: [PeriodsService],
})
export class PeriodsModule {}
