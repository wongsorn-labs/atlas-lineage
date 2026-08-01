import { Module } from '@nestjs/common';
import { TreesController } from './trees.controller';
import { PersonLinksController } from './person-links.controller';
import { TreesService } from './trees.service';
import { TreeMemberGuard } from './tree-member.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [TreesController, PersonLinksController],
  providers: [TreesService, TreeMemberGuard],
  exports: [TreesService, TreeMemberGuard],
})
export class TreesModule {}
