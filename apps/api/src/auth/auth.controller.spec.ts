import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const mockAuthService = {
  signIn: jest.fn(),
  signOut: jest.fn(),
  refreshSession: jest.fn(),
  getUser: jest.fn(),
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
});
