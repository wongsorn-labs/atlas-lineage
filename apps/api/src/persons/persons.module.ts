import { Module } from '@nestjs/common';
import { PersonsController } from './persons.controller';
import { PersonsService } from './persons.service';
import { TreesModule } from '../trees/trees.module';

@Module({
  imports: [TreesModule],
  controllers: [PersonsController],
  providers: [PersonsService],
})
export class PersonsModule {}
