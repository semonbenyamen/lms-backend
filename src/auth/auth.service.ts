import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { MailService } from '../mail/mail.service.js';
import { UsersService } from '../users/users.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { ResendVerificationDto } from './dto/resend-verification.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { AuthToken, } from './entities/auth-token.entity.js';
import { AuthTokenType } from '../common/enums/auth-token-type.enum.js';
import { RefreshToken } from './entities/refresh-token.entity.js';
import { TokenService } from './services/token.service.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import ms, { type StringValue } from 'ms';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,

    @InjectRepository(AuthToken)
    private readonly authTokenRepository: Repository<AuthToken>,

    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async register(registerDto: RegisterDto) {
    const email = this.normalizeEmail(registerDto.email);

    const existingUser = await this.usersService.findByEmail(email);

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await argon2.hash(registerDto.password);

    const user = await this.usersService.create({
      firstName: registerDto.firstName.trim(),
      lastName: registerDto.lastName.trim(),
      email,
      passwordHash,
    });

    const otp = await this.createAuthToken(
      user.id,
      AuthTokenType.EMAIL_VERIFICATION,
    );

    await this.mailService.sendVerificationOtp(user.email, otp);

    return this.toUserView(user);
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const email = this.normalizeEmail(verifyEmailDto.email);

    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const authToken = await this.authTokenRepository.findOne({
      where: {
        userId: user.id,
        type: AuthTokenType.EMAIL_VERIFICATION,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    if (!authToken) {
      throw new BadRequestException(
        'Verification code is invalid or has expired',
      );
    }

    if (authToken.expiresAt.getTime() < Date.now()) {
      await this.authTokenRepository.delete(authToken.id);

      throw new BadRequestException(
        'Verification code is invalid or has expired',
      );
    }

    const isValidOtp = this.tokenService.verifyToken(
      verifyEmailDto.otp,
      authToken.tokenHash,
    );

    if (!isValidOtp) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.usersService.markAsVerified(user);

    await this.authTokenRepository.delete({
      userId: user.id,
      type: AuthTokenType.EMAIL_VERIFICATION,
    });

    return {
      message: 'Email verified successfully',
    };
  }

  async resendVerificationCode(
    resendVerificationDto: ResendVerificationDto,
  ) {
    const email = this.normalizeEmail(resendVerificationDto.email);

    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const latestToken = await this.authTokenRepository.findOne({
      where: {
        userId: user.id,
        type: AuthTokenType.EMAIL_VERIFICATION,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    if (latestToken) {
      const cooldownMs = 60 * 1000;
      const nextAllowedAt =
        latestToken.createdAt.getTime() + cooldownMs;

      if (Date.now() < nextAllowedAt) {
        throw new BadRequestException(
          'Please wait before requesting another verification code',
        );
      }
    }

    await this.authTokenRepository.delete({
      userId: user.id,
      type: AuthTokenType.EMAIL_VERIFICATION,
    });

    const otp = await this.createAuthToken(
      user.id,
      AuthTokenType.EMAIL_VERIFICATION,
    );

    await this.mailService.sendVerificationOtp(user.email, otp);

    return {
      message: 'Verification code sent successfully',
    };
  }

  async login(loginDto: LoginDto) {
    const email = this.normalizeEmail(loginDto.email);

    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await argon2.verify(
      user.passwordHash,
      loginDto.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException(
        'Please verify your email before logging in',
      );
    }

    const tokens = await this.issueTokens(user);

    return {
      ...tokens,
      user: this.toUserView(user),
    }
  };

  async refresh(refreshTokenDto: RefreshTokenDto) {
    const refreshToken = refreshTokenDto.refreshToken;

    const tokenHash =
      this.tokenService.hashToken(refreshToken);

    const storedToken =
      await this.refreshTokenRepository.findOne({
        where: {
          tokenHash,
        },
      });

    if (!storedToken) {
      throw new UnauthorizedException(
        'Invalid refresh token',
      );
    }

    if (storedToken.expiresAt.getTime() < Date.now()) {
      await this.refreshTokenRepository.delete(
        storedToken.id,
      );

      throw new UnauthorizedException(
        'Invalid or expired refresh token',
      );
    }

    const user = await this.usersService.findById(
      storedToken.userId,
    );

    if (!user) {
      await this.refreshTokenRepository.delete(
        storedToken.id,
      );

      throw new UnauthorizedException(
        'Invalid refresh token',
      );
    }

    await this.refreshTokenRepository.delete(
      storedToken.id,
    );

    return this.issueTokens(user);
  }

  async logout(refreshTokenDto: RefreshTokenDto) {
    const tokenHash = this.tokenService.hashToken(
      refreshTokenDto.refreshToken,
    );

    await this.refreshTokenRepository.delete({
      tokenHash,
    });

    return {
      message: 'Logged out successfully',
    };
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ) {
    const user = await this.requireUser(userId);

    const isCurrentPasswordValid = await argon2.verify(
      user.passwordHash,
      changePasswordDto.currentPassword,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException(
        'Current password is incorrect',
      );
    }

    const isSamePassword = await argon2.verify(
      user.passwordHash,
      changePasswordDto.newPassword,
    );

    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    const newPasswordHash = await argon2.hash(
      changePasswordDto.newPassword,
    );

    await this.usersService.updatePassword(
      user.id,
      newPasswordHash,
    );

    await this.refreshTokenRepository.delete({
      userId: user.id,
    });

    return {
      message: 'Password changed successfully',
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const email = this.normalizeEmail(forgotPasswordDto.email);

    const genericResponse = {
      message:
        'If an account with this email exists, a password reset code has been sent',
    };

    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return genericResponse;
    }

    await this.authTokenRepository.delete({
      userId: user.id,
      type: AuthTokenType.PASSWORD_RESET,
    });

    const otp = await this.createAuthToken(
      user.id,
      AuthTokenType.PASSWORD_RESET,
    );

    await this.mailService.sendPasswordResetOtp(
      user.email,
      otp,
    );

    return genericResponse;
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const email = this.normalizeEmail(resetPasswordDto.email);

    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new BadRequestException(
        'Invalid or expired password reset code',
      );
    }

    await this.validateAuthToken(
      user.id,
      AuthTokenType.PASSWORD_RESET,
      resetPasswordDto.otp,
      'Invalid or expired password reset code',
    );

    const passwordHash = await argon2.hash(
      resetPasswordDto.newPassword,
    );

    await this.usersService.updatePassword(
      user.id,
      passwordHash,
    );

    await this.authTokenRepository.delete({
      userId: user.id,
      type: AuthTokenType.PASSWORD_RESET,
    });

    await this.refreshTokenRepository.delete({
      userId: user.id,
    });

    return {
      message: 'Password reset successfully',
    };
  }

  async getProfile(userId: string) {
    const user = await this.requireUser(userId);

    return this.toUserView(user);
  }

  private async createAuthToken(
    userId: string,
    type: AuthTokenType,
  ): Promise<string> {
    const otp = this.tokenService.generateOtp();

    const authToken = this.authTokenRepository.create({
      userId,
      type,
      tokenHash: this.tokenService.hashToken(otp),
      expiresAt: this.tokenService.getOtpExpiration(),
    });

    await this.authTokenRepository.save(authToken);

    return otp;
  }

  private async generateAccessToken(user: {
    id: string;
    email: string;
    role: string;
  }): Promise<string> {
    return this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const refreshToken = this.tokenService.generateRefreshToken();

    const refreshTokenEntity = this.refreshTokenRepository.create({
      userId,
      tokenHash: this.tokenService.hashToken(refreshToken),
      expiresAt: this.tokenService.getRefreshTokenExpiration(),
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);

    return refreshToken;
  }

  private async validateAuthToken(
    userId: string,
    type: AuthTokenType,
    otp: string,
    errorMessage: string,
  ): Promise<AuthToken> {
    const authToken = await this.authTokenRepository.findOne({
      where: {
        userId,
        type,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    if (!authToken) {
      throw new BadRequestException(errorMessage);
    }

    if (authToken.expiresAt.getTime() < Date.now()) {
      await this.authTokenRepository.delete(authToken.id);
      throw new BadRequestException(errorMessage);
    }

    const isValidOtp = this.tokenService.verifyToken(
      otp,
      authToken.tokenHash,
    );

    if (!isValidOtp) {
      throw new BadRequestException(errorMessage);
    }

    return authToken;
  }

  private toUserView(user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
    isVerified: boolean;
    createdAt: Date;
  }) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };
  }

  private getAccessTokenExpiresInSeconds(): number {
    const expiresIn =
      this.configService.getOrThrow<StringValue>('JWT_EXPIRES_IN');

    return Math.floor(ms(expiresIn) / 1000);
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private async requireUser(userId: string) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException(
        'User no longer exists',
      );
    }

    return user;
  }

  private async issueTokens(user: {
    id: string;
    email: string;
    role: string;
  }) {
    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.createRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.getAccessTokenExpiresInSeconds(),
    };
  }
}