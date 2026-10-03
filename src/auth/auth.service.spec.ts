import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';

import { MailService } from '../mail/mail.service.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';
import {
  AuthToken,
  AuthTokenType,
} from './entities/auth-token.entity.js';
import { RefreshToken } from './entities/refresh-token.entity.js';
import { TokenService } from './services/token.service.js';

describe('AuthService', () => {
  let authService: AuthService;

  const usersServiceMock = {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    markAsVerified: vi.fn(),
    updatePassword: vi.fn(),
  };

  const tokenServiceMock = {
    generateOtp: vi.fn(),
    hashToken: vi.fn(),
    verifyToken: vi.fn(),
    getOtpExpiration: vi.fn(),
    generateRefreshToken: vi.fn(),
    getRefreshTokenExpiration: vi.fn(),
  };

  const mailServiceMock = {
    sendVerificationOtp: vi.fn(),
    sendPasswordResetOtp: vi.fn(),
  };

  const jwtServiceMock = {
    signAsync: vi.fn(),
  };

  const authTokenRepositoryMock = {
    create: vi.fn(),
    save: vi.fn(),
    findOne: vi.fn(),
    delete: vi.fn(),
  };

  const refreshTokenRepositoryMock = {
    create: vi.fn(),
    save: vi.fn(),
    findOne: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          AuthService,
          {
            provide: UsersService,
            useValue: usersServiceMock,
          },
          {
            provide: TokenService,
            useValue: tokenServiceMock,
          },
          {
            provide: MailService,
            useValue: mailServiceMock,
          },
          {
            provide: JwtService,
            useValue: jwtServiceMock,
          },
          {
            provide: getRepositoryToken(AuthToken),
            useValue: authTokenRepositoryMock,
          },
          {
            provide: getRepositoryToken(RefreshToken),
            useValue: refreshTokenRepositoryMock,
          },
        ],
      }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should register a new user and send verification OTP', async () => {
      usersServiceMock.findByEmail.mockResolvedValue(null);

      const passwordHash = await argon2.hash(
        'Password@123',
      );

      const user = {
        id: 'user-1',
        firstName: 'Semon',
        lastName: 'Benyamin',
        email: 'test@example.com',
        passwordHash,
        role: 'student',
        isVerified: false,
        createdAt: new Date(),
      };

      usersServiceMock.create.mockResolvedValue(user);

      tokenServiceMock.generateOtp.mockReturnValue(
        '123456',
      );
      tokenServiceMock.hashToken.mockReturnValue(
        'hashed-otp',
      );
      tokenServiceMock.getOtpExpiration.mockReturnValue(
        new Date(Date.now() + 10 * 60 * 1000),
      );

      authTokenRepositoryMock.create.mockReturnValue({
        id: 'token-1',
      });

      authTokenRepositoryMock.save.mockResolvedValue({
        id: 'token-1',
      });

      const result = await authService.register({
        firstName: 'Semon',
        lastName: 'Benyamin',
        email: 'TEST@example.com',
        password: 'Password@123',
      });

      expect(usersServiceMock.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );

      expect(usersServiceMock.create).toHaveBeenCalled();

      expect(
        mailServiceMock.sendVerificationOtp,
      ).toHaveBeenCalledWith(
        'test@example.com',
        '123456',
      );

      expect(result.email).toBe('test@example.com');
      expect(result.isVerified).toBe(false);
    });
  });

  describe('login', () => {
    it('should login a verified user and return access and refresh tokens', async () => {
      const passwordHash = await argon2.hash(
        'Password@123',
      );

      const user = {
        id: 'user-1',
        firstName: 'Semon',
        lastName: 'Benyamin',
        email: 'test@example.com',
        passwordHash,
        role: 'student',
        isVerified: true,
      };

      usersServiceMock.findByEmail.mockResolvedValue(user);

      jwtServiceMock.signAsync.mockResolvedValue(
        'access-token',
      );

      tokenServiceMock.generateRefreshToken.mockReturnValue(
        'refresh-token',
      );

      tokenServiceMock.hashToken.mockReturnValue(
        'hashed-refresh-token',
      );

      tokenServiceMock.getRefreshTokenExpiration.mockReturnValue(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      );

      refreshTokenRepositoryMock.create.mockReturnValue({
        id: 'refresh-1',
      });

      refreshTokenRepositoryMock.save.mockResolvedValue({
        id: 'refresh-1',
      });

      const result = await authService.login({
        email: 'test@example.com',
        password: 'Password@123',
      });

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user.email).toBe('test@example.com');

      expect(
        refreshTokenRepositoryMock.save,
      ).toHaveBeenCalled();
    });

    it('should reject an invalid password', async () => {
      const passwordHash = await argon2.hash(
        'CorrectPassword@123',
      );

      usersServiceMock.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash,
        role: 'student',
        isVerified: true,
      });

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'WrongPassword@123',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should rotate the refresh token', async () => {
      tokenServiceMock.hashToken
        .mockReturnValueOnce('old-hash')
        .mockReturnValueOnce('new-hash');

      refreshTokenRepositoryMock.findOne.mockResolvedValue({
        id: 'refresh-1',
        userId: 'user-1',
        tokenHash: 'old-hash',
        expiresAt: new Date(
          Date.now() + 60 * 60 * 1000,
        ),
      });

      usersServiceMock.findById.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        role: 'student',
      });

      tokenServiceMock.generateRefreshToken.mockReturnValue(
        'new-refresh-token',
      );

      tokenServiceMock.getRefreshTokenExpiration.mockReturnValue(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      );

      refreshTokenRepositoryMock.create.mockReturnValue({
        id: 'refresh-2',
      });

      refreshTokenRepositoryMock.save.mockResolvedValue({
        id: 'refresh-2',
      });

      jwtServiceMock.signAsync.mockResolvedValue(
        'new-access-token',
      );

      const result = await authService.refresh({
        refreshToken: 'old-refresh-token',
      });

      expect(
        refreshTokenRepositoryMock.delete,
      ).toHaveBeenCalledWith('refresh-1');

      expect(result.accessToken).toBe(
        'new-access-token',
      );

      expect(result.refreshToken).toBe(
        'new-refresh-token',
      );
    });

    it('should reject an invalid refresh token', async () => {
      tokenServiceMock.hashToken.mockReturnValue(
        'invalid-hash',
      );

      refreshTokenRepositoryMock.findOne.mockResolvedValue(
        null,
      );

      await expect(
        authService.refresh({
          refreshToken: 'invalid-token',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('changePassword', () => {
    it('should change password and revoke refresh tokens', async () => {
      const currentPassword = 'CurrentPassword@123';
      const newPassword = 'NewPassword@123';

      const passwordHash = await argon2.hash(
        currentPassword,
      );

      usersServiceMock.findById.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash,
      });

      usersServiceMock.updatePassword.mockResolvedValue(
        undefined,
      );

      refreshTokenRepositoryMock.delete.mockResolvedValue({
        affected: 1,
      });

      const result = await authService.changePassword(
        'user-1',
        {
          currentPassword,
          newPassword,
        },
      );

      expect(
        usersServiceMock.updatePassword,
      ).toHaveBeenCalled();

      expect(
        refreshTokenRepositoryMock.delete,
      ).toHaveBeenCalledWith({
        userId: 'user-1',
      });

      expect(result).toEqual({
        message: 'Password changed successfully',
      });
    });

    it('should reject an incorrect current password', async () => {
      const passwordHash = await argon2.hash(
        'CorrectPassword@123',
      );

      usersServiceMock.findById.mockResolvedValue({
        id: 'user-1',
        passwordHash,
      });

      await expect(
        authService.changePassword('user-1', {
          currentPassword: 'WrongPassword@123',
          newPassword: 'NewPassword@123',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('forgotPassword', () => {
    it('should create a password reset OTP', async () => {
      usersServiceMock.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
      });

      tokenServiceMock.generateOtp.mockReturnValue(
        '654321',
      );

      tokenServiceMock.hashToken.mockReturnValue(
        'reset-hash',
      );

      tokenServiceMock.getOtpExpiration.mockReturnValue(
        new Date(Date.now() + 10 * 60 * 1000),
      );

      authTokenRepositoryMock.create.mockReturnValue({
        id: 'reset-token-1',
      });

      authTokenRepositoryMock.save.mockResolvedValue({
        id: 'reset-token-1',
      });

      await authService.forgotPassword({
        email: 'test@example.com',
      });

      expect(
        mailServiceMock.sendPasswordResetOtp,
      ).toHaveBeenCalledWith(
        'test@example.com',
        '654321',
      );

      expect(
        authTokenRepositoryMock.delete,
      ).toHaveBeenCalledWith({
        userId: 'user-1',
        type: AuthTokenType.PASSWORD_RESET,
      });
    });
  });

  describe('logout', () => {
    it('should revoke the supplied refresh token', async () => {
      tokenServiceMock.hashToken.mockReturnValue(
        'refresh-hash',
      );

      const result = await authService.logout({
        refreshToken: 'refresh-token',
      });

      expect(
        refreshTokenRepositoryMock.delete,
      ).toHaveBeenCalledWith({
        tokenHash: 'refresh-hash',
      });

      expect(result).toEqual({
        message: 'Logged out successfully',
      });
    });
  });

  describe('verifyEmail', () => {
  it('should verify the email and delete the verification token', async () => {
    const user = {
      id: 'user-1',
      email: 'test@example.com',
      isVerified: false,
    };

    usersServiceMock.findByEmail.mockResolvedValue(user);

    authTokenRepositoryMock.findOne.mockResolvedValue({
      id: 'verification-token-1',
      userId: 'user-1',
      type: AuthTokenType.EMAIL_VERIFICATION,
      tokenHash: 'hashed-otp',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      createdAt: new Date(),
    });

    tokenServiceMock.verifyToken.mockReturnValue(true);

    usersServiceMock.markAsVerified.mockResolvedValue(
      undefined,
    );

    const result = await authService.verifyEmail({
      email: 'test@example.com',
      otp: '123456',
    });

    expect(
      tokenServiceMock.verifyToken,
    ).toHaveBeenCalledWith(
      '123456',
      'hashed-otp',
    );

    expect(
      usersServiceMock.markAsVerified,
    ).toHaveBeenCalledWith(user);

    expect(
      authTokenRepositoryMock.delete,
    ).toHaveBeenCalledWith({
      userId: 'user-1',
      type: AuthTokenType.EMAIL_VERIFICATION,
    });

    expect(result).toEqual({
      message: 'Email verified successfully',
    });
  });
});

describe('resetPassword', () => {
  it('should reset password and revoke refresh tokens', async () => {
    usersServiceMock.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
    });

    authTokenRepositoryMock.findOne.mockResolvedValue({
      id: 'reset-token-1',
      userId: 'user-1',
      type: AuthTokenType.PASSWORD_RESET,
      tokenHash: 'reset-hash',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      createdAt: new Date(),
    });

    tokenServiceMock.verifyToken.mockReturnValue(true);

    usersServiceMock.updatePassword.mockResolvedValue(
      undefined,
    );

    const result = await authService.resetPassword({
      email: 'test@example.com',
      otp: '654321',
      newPassword: 'NewPassword@123',
    });

    expect(
      tokenServiceMock.verifyToken,
    ).toHaveBeenCalledWith(
      '654321',
      'reset-hash',
    );

    expect(
      usersServiceMock.updatePassword,
    ).toHaveBeenCalled();

    expect(
      authTokenRepositoryMock.delete,
    ).toHaveBeenCalledWith({
      userId: 'user-1',
      type: AuthTokenType.PASSWORD_RESET,
    });

    expect(
      refreshTokenRepositoryMock.delete,
    ).toHaveBeenCalledWith({
      userId: 'user-1',
    });

    expect(result).toEqual({
      message: 'Password reset successfully',
    });
  });
});

describe('getProfile', () => {
  it('should return the authenticated user profile', async () => {
    const user = {
      id: 'user-1',
      firstName: 'Semon',
      lastName: 'Benyamin',
      email: 'test@example.com',
      role: 'student',
      isVerified: true,
      createdAt: new Date(),
    };

    usersServiceMock.findById.mockResolvedValue(user);

    const result = await authService.getProfile('user-1');

    expect(usersServiceMock.findById).toHaveBeenCalledWith(
      'user-1',
    );

    expect(result.email).toBe('test@example.com');
    expect(result.isVerified).toBe(true);
  });

  it('should reject a user that no longer exists', async () => {
    usersServiceMock.findById.mockResolvedValue(null);

    await expect(
      authService.getProfile('missing-user'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
});