import {
  Controller, Post, Get, Body, Req, Res, UnauthorizedException, HttpCode,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { OAuthSessionDto } from './dto/oauth-session.dto';

function setCookies(res: Response, accessToken: string, refreshToken: string) {
  const isProduction = process.env.NODE_ENV === 'production';
  const accessName = process.env.COOKIE_ACCESS_TOKEN_NAME ?? 'access_token';
  const refreshName = process.env.COOKIE_REFRESH_TOKEN_NAME ?? 'refresh_token';
  const accessMaxAge = Number(process.env.COOKIE_MAX_AGE_ACCESS ?? 3600) * 1000;
  const refreshMaxAge = Number(process.env.COOKIE_MAX_AGE_REFRESH ?? 604800) * 1000;

  res.cookie(accessName, accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: accessMaxAge,
    path: '/',
  });
  res.cookie(refreshName, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: refreshMaxAge,
    path: '/api/auth/refresh',
  });
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.signIn(body.email, body.password);
    setCookies(res, result.accessToken, result.refreshToken);
    return { user: result.user };
  }

  @Post('oauth/session')
  @HttpCode(200)
  async oauthSession(
    @Body() body: OAuthSessionDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.exchangeOAuthSession(body.accessToken, body.refreshToken);
    setCookies(res, result.accessToken, result.refreshToken);
    return { user: result.user };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshName = process.env.COOKIE_REFRESH_TOKEN_NAME ?? 'refresh_token';
    const refreshToken = req.cookies?.[refreshName];
    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');
    const result = await this.authService.refreshSession(refreshToken);
    setCookies(res, result.accessToken, result.refreshToken);
    return { ok: true };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const accessName = process.env.COOKIE_ACCESS_TOKEN_NAME ?? 'access_token';
    const refreshName = process.env.COOKIE_REFRESH_TOKEN_NAME ?? 'refresh_token';
    const token = req.cookies?.[accessName];
    if (token) await this.authService.signOut(token);
    res.clearCookie(accessName, { path: '/' });
    res.clearCookie(refreshName, { path: '/api/auth/refresh' });
    return { ok: true };
  }

  @Get('me')
  async me(@Req() req: Request) {
    const accessName = process.env.COOKIE_ACCESS_TOKEN_NAME ?? 'access_token';
    const token = req.cookies?.[accessName];
    if (!token) throw new UnauthorizedException();
    const user = await this.authService.getUser(token);
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
