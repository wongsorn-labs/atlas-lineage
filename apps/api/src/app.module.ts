import { Module } from '@nestjs/common';
import { PersonsModule } from './persons/persons.module';
import { RelationshipsModule } from './relationships/relationships.module';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { TreesModule } from './trees/trees.module';

@Module({
  imports: [AuthModule, TreesModule, PersonsModule, RelationshipsModule],
  controllers: [HealthController],
})
export class AppModule {}
