import { Module } from '@nestjs/common';
import { FieldDefinitionsController } from './field-definitions.controller';
import { FieldDefinitionsService } from './field-definitions.service';
import { TreesModule } from '../trees/trees.module';

@Module({
  imports: [TreesModule],
  controllers: [FieldDefinitionsController],
  providers: [FieldDefinitionsService],
  exports: [FieldDefinitionsService],
})
export class FieldDefinitionsModule {}
