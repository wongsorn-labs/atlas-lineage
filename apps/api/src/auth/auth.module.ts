import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SupabaseAuthGuard } from './supabase-auth.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, SupabaseAuthGuard],
  exports: [SupabaseAuthGuard, AuthService],
})
export class AuthModule {}
