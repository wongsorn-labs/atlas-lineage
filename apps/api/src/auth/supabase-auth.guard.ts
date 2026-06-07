import {
  CanActivate, ExecutionContext, Injectable, UnauthorizedException,
} from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import type { Request } from 'express';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: { id: string; email: string } }>();
    const cookieName = process.env.COOKIE_ACCESS_TOKEN_NAME ?? 'access_token';
    const token: string | undefined = req.cookies?.[cookieName];
    if (!token) throw new UnauthorizedException('Missing access token');

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) throw new UnauthorizedException('Invalid or expired token');

    req.user = { id: data.user.id, email: data.user.email! };
    return true;
  }
}
