import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const mockAuthService = {
  signIn: jest.fn(),
  signOut: jest.fn(),
  refreshSession: jest.fn(),
  getUser: jest.fn(),
  exchangeOAuthSession: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();
    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('login returns user on success', async () => {
    mockAuthService.signIn.mockResolvedValue({
      accessToken: 'at',
      refreshToken: 'rt',
      expiresIn: 3600,
      user: { id: 'uuid-1', email: 'a@b.com' },
    });
    const mockRes = { cookie: jest.fn() } as any;
    const result = await controller.login({ email: 'a@b.com', password: 'pass' }, mockRes);
    expect(result.user.email).toBe('a@b.com');
    expect(mockRes.cookie).toHaveBeenCalledTimes(2);
  });

  it('oauthSession returns user and sets cookies on a valid token pair', async () => {
    mockAuthService.exchangeOAuthSession.mockResolvedValue({
      accessToken: 'at',
      refreshToken: 'rt',
      user: { id: 'uuid-1', email: 'a@b.com' },
    });
    const mockRes = { cookie: jest.fn() } as any;
    const result = await controller.oauthSession({ accessToken: 'at', refreshToken: 'rt' }, mockRes);
    expect(result.user.email).toBe('a@b.com');
    expect(mockRes.cookie).toHaveBeenCalledTimes(2);
  });

  it('oauthSession rejects and sets no cookies on an invalid token', async () => {
    mockAuthService.exchangeOAuthSession.mockRejectedValue(
      new UnauthorizedException('Invalid or expired session'),
    );
    const mockRes = { cookie: jest.fn() } as any;
    await expect(controller.oauthSession({ accessToken: 'bad', refreshToken: 'bad' }, mockRes))
      .rejects.toThrow(UnauthorizedException);
    expect(mockRes.cookie).not.toHaveBeenCalled();
  });
});
