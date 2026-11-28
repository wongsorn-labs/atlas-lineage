import { Module } from '@nestjs/common';
import { PersonsModule } from './persons/persons.module';
import { RelationshipsModule } from './relationships/relationships.module';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { TreesModule } from './trees/trees.module';
import { FieldDefinitionsModule } from './field-definitions/field-definitions.module';
import { PeriodsModule } from './periods/periods.module';

@Module({
  imports: [AuthModule, TreesModule, PersonsModule, RelationshipsModule, FieldDefinitionsModule, PeriodsModule],
  controllers: [HealthController],
})
export class AppModule {}
