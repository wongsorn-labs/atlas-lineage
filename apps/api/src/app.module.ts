import { Module } from '@nestjs/common';
import { PersonsModule } from './persons/persons.module';
import { RelationshipsModule } from './relationships/relationships.module';
import { HealthController } from './health.controller';

@Module({
  imports: [PersonsModule, RelationshipsModule],
  controllers: [HealthController],
})
export class AppModule {}
