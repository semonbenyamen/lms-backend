import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHmac } from 'node:crypto';

import { AuthTokenType } from '../common/enums/auth-token-type.enum.js';
import { MailService } from '../mail/mail.service.js';
import { UsersService } from '../users/users.service.js';
import { AuthToken } from './entities/auth-token.entity.js';
import { RefreshToken } from './entities/refresh-token.entity.js';
import { AuthUserService } from './services/auth-user.service.js';
import { StudentAuthService } from './student-auth.service.js';

describe('StudentAuthService', () => {
  let studentAuthService: StudentAuthService;

  const usersServiceMock = {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
  };

  const authUserServiceMock = {
    markAsVerified: vi.fn(),
    updatePassword: vi.fn(),
  };

  const mailServiceMock = {
    sendVerificationOtp: vi.fn(),
    sendPasswordResetOtp: vi.fn(),
  };

  const jwtServiceMock = {
    signAsync: vi.fn(),
  };

  const testTokenSecret = 'unit-test-auth-token-secret';
  const hashToken = (token: string): string =>
    createHmac('sha256', testTokenSecret).update(token).digest('hex');

  const configServiceMock = {
    getOrThrow: vi.fn((key: string) => {
      if (key === 'AUTH_TOKEN_SECRET') return testTokenSecret;
      if (key === 'JWT_EXPIRES_IN') return '15m';
      throw new Error(`Unexpected config key: ${key}`);
    }),
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentAuthService,
        { provide: UsersService, useValue: usersServiceMock },
        { provide: AuthUserService, useValue: authUserServiceMock },
        { provide: MailService, useValue: mailServiceMock },
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
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

    studentAuthService = module.get<StudentAuthService>(StudentAuthService);
  });

  describe('registerStudent', () => {
    it('should register a new user and send verification OTP', async () => {
      usersServiceMock.findByEmail.mockResolvedValue(null);

      const passwordHash = await bcrypt.hash('Password@123', 12);
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

      authTokenRepositoryMock.create.mockReturnValue({ id: 'token-1' });
      authTokenRepositoryMock.save.mockResolvedValue({ id: 'token-1' });

      const result = await studentAuthService.registerStudent({
        firstName: 'Semon',
        lastName: 'Benyamin',
        email: 'TEST@example.com',
        password: 'Password@123',
        confirmPassword: 'Password@123',
      });

      expect(usersServiceMock.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(usersServiceMock.create).toHaveBeenCalled();
      expect(mailServiceMock.sendVerificationOtp).toHaveBeenCalledOnce();
      const [sentEmail, sentOtp] = mailServiceMock.sendVerificationOtp.mock
        .calls[0] as unknown as [string, string];
      expect(sentEmail).toBe('test@example.com');
      expect(sentOtp).toMatch(/^\d{6}$/);
      expect(authTokenRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: AuthTokenType.EMAIL_VERIFICATION,
          tokenHash: hashToken(sentOtp),
          expiresAt: expect.any(Date),
        }),
      );
      expect(result.email).toBe('test@example.com');
      expect(result.isVerified).toBe(false);
    });
  });

  describe('login', () => {
    it('should login a verified user and return access and refresh tokens', async () => {
      const passwordHash = await bcrypt.hash('Password@123', 12);
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
      jwtServiceMock.signAsync.mockResolvedValue('access-token');
      refreshTokenRepositoryMock.create.mockReturnValue({ id: 'refresh-1' });
      refreshTokenRepositoryMock.save.mockResolvedValue({ id: 'refresh-1' });

      const result = await studentAuthService.login({
        email: 'test@example.com',
        password: 'Password@123',
      });

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toMatch(/^[a-f0-9]{128}$/);
      expect(refreshTokenRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          tokenHash: hashToken(result.refreshToken),
          expiresAt: expect.any(Date),
        }),
      );
      expect(result.user.email).toBe('test@example.com');
      expect(refreshTokenRepositoryMock.save).toHaveBeenCalled();
    });

    it('should reject an invalid password', async () => {
      const passwordHash = await bcrypt.hash('CorrectPassword@123', 12);
      usersServiceMock.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash,
        role: 'student',
        isVerified: true,
      });

      await expect(
        studentAuthService.login({
          email: 'test@example.com',
          password: 'WrongPassword@123',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('refreshSessionTokens', () => {
    it('should rotate the refresh token', async () => {
      refreshTokenRepositoryMock.findOne.mockResolvedValue({
        id: 'refresh-1',
        userId: 'user-1',
        tokenHash: hashToken('old-refresh-token'),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      usersServiceMock.findById.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        role: 'student',
      });
      refreshTokenRepositoryMock.create.mockReturnValue({ id: 'refresh-2' });
      refreshTokenRepositoryMock.save.mockResolvedValue({ id: 'refresh-2' });
      jwtServiceMock.signAsync.mockResolvedValue('new-access-token');

      const result = await studentAuthService.refreshSessionTokens({
        refreshToken: 'old-refresh-token',
      });

      expect(refreshTokenRepositoryMock.delete).toHaveBeenCalledWith(
        'refresh-1',
      );
      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toMatch(/^[a-f0-9]{128}$/);
      expect(result.refreshToken).not.toBe('old-refresh-token');
    });

    it('should reject an invalid refresh token', async () => {
      refreshTokenRepositoryMock.findOne.mockResolvedValue(null);

      await expect(
        studentAuthService.refreshSessionTokens({
          refreshToken: 'invalid-token',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('changeAuthenticatedUserPassword', () => {
    it('should change password and revoke refresh tokens', async () => {
      const currentPassword = 'CurrentPassword@123';
      const newPassword = 'NewPassword@123';
      const passwordHash = await bcrypt.hash(currentPassword, 12);
      usersServiceMock.findById.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash,
      });
      authUserServiceMock.updatePassword.mockResolvedValue(undefined);
      refreshTokenRepositoryMock.delete.mockResolvedValue({ affected: 1 });

      const result =
        await studentAuthService.changeAuthenticatedUserPassword('user-1', {
          currentPassword,
          newPassword,
        });

      expect(authUserServiceMock.updatePassword).toHaveBeenCalled();
      expect(refreshTokenRepositoryMock.delete).toHaveBeenCalledWith({
        userId: 'user-1',
      });
      expect(result).toEqual({ message: 'Password changed successfully' });
    });

    it('should reject an incorrect current password', async () => {
      const passwordHash = await bcrypt.hash('CorrectPassword@123', 12);
      usersServiceMock.findById.mockResolvedValue({
        id: 'user-1',
        passwordHash,
      });

      await expect(
        studentAuthService.changeAuthenticatedUserPassword('user-1', {
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
      authTokenRepositoryMock.create.mockReturnValue({ id: 'reset-token-1' });
      authTokenRepositoryMock.save.mockResolvedValue({ id: 'reset-token-1' });

      await studentAuthService.forgotPassword({ email: 'test@example.com' });

      expect(mailServiceMock.sendPasswordResetOtp).toHaveBeenCalledOnce();
      const [sentEmail, sentOtp] = mailServiceMock.sendPasswordResetOtp.mock
        .calls[0] as unknown as [string, string];
      expect(sentEmail).toBe('test@example.com');
      expect(sentOtp).toMatch(/^\d{6}$/);
      expect(authTokenRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: AuthTokenType.PASSWORD_RESET,
          tokenHash: hashToken(sentOtp),
          expiresAt: expect.any(Date),
        }),
      );
      expect(authTokenRepositoryMock.delete).toHaveBeenCalledWith({
        userId: 'user-1',
        type: AuthTokenType.PASSWORD_RESET,
      });
    });
  });

  describe('logout', () => {
    it('should revoke the supplied refresh token', async () => {
      const result = await studentAuthService.logout({
        refreshToken: 'refresh-token',
      });
      expect(refreshTokenRepositoryMock.delete).toHaveBeenCalledWith({
        tokenHash: hashToken('refresh-token'),
      });
      expect(result).toEqual({ message: 'Logged out successfully' });
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
        tokenHash: hashToken('123456'),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        createdAt: new Date(),
      });
      authUserServiceMock.markAsVerified.mockResolvedValue(undefined);

      const result = await studentAuthService.verifyEmail({
        email: 'test@example.com',
        otp: '123456',
      });

      expect(authUserServiceMock.markAsVerified).toHaveBeenCalledWith(user.id);
      expect(authTokenRepositoryMock.delete).toHaveBeenCalledWith({
        userId: 'user-1',
        type: AuthTokenType.EMAIL_VERIFICATION,
      });
      expect(result).toEqual({ message: 'Email verified successfully' });
    });

    it('should reject an invalid verification OTP', async () => {
      usersServiceMock.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        isVerified: false,
      });
      authTokenRepositoryMock.findOne.mockResolvedValue({
        id: 'verification-token-1',
        userId: 'user-1',
        type: AuthTokenType.EMAIL_VERIFICATION,
        tokenHash: hashToken('123456'),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        createdAt: new Date(),
      });

      await expect(
        studentAuthService.verifyEmail({
          email: 'test@example.com',
          otp: '999999',
        }),
      ).rejects.toThrow('Invalid verification code');
      expect(authUserServiceMock.markAsVerified).not.toHaveBeenCalled();
      expect(authTokenRepositoryMock.delete).not.toHaveBeenCalled();
    });
  });

  describe('resendVerificationCode', () => {
    it('should reject resend during cooldown', async () => {
      usersServiceMock.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        isVerified: false,
      });
      authTokenRepositoryMock.findOne.mockResolvedValue({
        id: 'verification-token-1',
        userId: 'user-1',
        type: AuthTokenType.EMAIL_VERIFICATION,
        createdAt: new Date(),
      });

      await expect(
        studentAuthService.resendVerificationCode({
          email: 'test@example.com',
        }),
      ).rejects.toThrow(
        'Please wait before requesting another verification code',
      );
      expect(mailServiceMock.sendVerificationOtp).not.toHaveBeenCalled();
      expect(authTokenRepositoryMock.delete).not.toHaveBeenCalled();
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
        tokenHash: hashToken('654321'),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        createdAt: new Date(),
      });
      authUserServiceMock.updatePassword.mockResolvedValue(undefined);

      const result = await studentAuthService.resetPassword({
        email: 'test@example.com',
        otp: '654321',
        newPassword: 'NewPassword@123',
      });

      expect(authUserServiceMock.updatePassword).toHaveBeenCalled();
      expect(authTokenRepositoryMock.delete).toHaveBeenCalledWith({
        userId: 'user-1',
        type: AuthTokenType.PASSWORD_RESET,
      });
      expect(refreshTokenRepositoryMock.delete).toHaveBeenCalledWith({
        userId: 'user-1',
      });
      expect(result).toEqual({ message: 'Password reset successfully' });
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

      const result = await studentAuthService.getProfile('user-1');
      expect(usersServiceMock.findById).toHaveBeenCalledWith('user-1');
      expect(result.email).toBe('test@example.com');
      expect(result.isVerified).toBe(true);
    });

    it('should reject a user that no longer exists', async () => {
      usersServiceMock.findById.mockResolvedValue(null);
      await expect(
        studentAuthService.getProfile('missing-user'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
