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
import {
  AuthToken,
  AuthTokenType,
} from './entities/auth-token.entity.js';
import { RefreshToken } from './entities/refresh-token.entity.js';
import { TokenService } from './services/token.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,

    @InjectRepository(AuthToken)
    private readonly authTokenRepository: Repository<AuthToken>,

    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async register(registerDto: RegisterDto) {
    const email = registerDto.email.trim().toLowerCase();

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

    const otp = this.tokenService.generateOtp();
    const tokenHash = this.tokenService.hashToken(otp);

    const authToken = this.authTokenRepository.create({
      userId: user.id,
      type: AuthTokenType.EMAIL_VERIFICATION,
      tokenHash,
      expiresAt: this.tokenService.getOtpExpiration(),
    });

    await this.authTokenRepository.save(authToken);

    await this.mailService.sendVerificationOtp(user.email, otp);

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

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const email = verifyEmailDto.email.trim().toLowerCase();

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
    const email = resendVerificationDto.email.trim().toLowerCase();

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

    const otp = this.tokenService.generateOtp();
    const tokenHash = this.tokenService.hashToken(otp);

    const authToken = this.authTokenRepository.create({
      userId: user.id,
      type: AuthTokenType.EMAIL_VERIFICATION,
      tokenHash,
      expiresAt: this.tokenService.getOtpExpiration(),
    });

    await this.authTokenRepository.save(authToken);

    await this.mailService.sendVerificationOtp(user.email, otp);

    return {
      message: 'Verification code sent successfully',
    };
  }

  async login(loginDto: LoginDto) {
    const email = loginDto.email.trim().toLowerCase();

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

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken =
      this.tokenService.generateRefreshToken();

    const refreshTokenHash =
      this.tokenService.hashToken(refreshToken);

    const refreshTokenEntity =
      this.refreshTokenRepository.create({
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt:
          this.tokenService.getRefreshTokenExpiration(),
      });

    await this.refreshTokenRepository.save(
      refreshTokenEntity,
    );

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 900,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    };
  }

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

    const newRefreshToken =
      this.tokenService.generateRefreshToken();

    const newRefreshTokenHash =
      this.tokenService.hashToken(newRefreshToken);

    const newRefreshTokenEntity =
      this.refreshTokenRepository.create({
        userId: user.id,
        tokenHash: newRefreshTokenHash,
        expiresAt:
          this.tokenService.getRefreshTokenExpiration(),
      });

    await this.refreshTokenRepository.save(
      newRefreshTokenEntity,
    );

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
      tokenType: 'Bearer',
      expiresIn: 900,
    };
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
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException(
        'User no longer exists',
      );
    }

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
    const email = forgotPasswordDto.email.trim().toLowerCase();

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

    const otp = this.tokenService.generateOtp();
    const tokenHash = this.tokenService.hashToken(otp);

    const authToken = this.authTokenRepository.create({
      userId: user.id,
      type: AuthTokenType.PASSWORD_RESET,
      tokenHash,
      expiresAt: this.tokenService.getOtpExpiration(),
    });

    await this.authTokenRepository.save(authToken);

    await this.mailService.sendPasswordResetOtp(
      user.email,
      otp,
    );

    return genericResponse;
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const email = resetPasswordDto.email.trim().toLowerCase();

    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new BadRequestException(
        'Invalid or expired password reset code',
      );
    }

    const authToken = await this.authTokenRepository.findOne({
      where: {
        userId: user.id,
        type: AuthTokenType.PASSWORD_RESET,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    if (!authToken) {
      throw new BadRequestException(
        'Invalid or expired password reset code',
      );
    }

    if (authToken.expiresAt.getTime() < Date.now()) {
      await this.authTokenRepository.delete(authToken.id);

      throw new BadRequestException(
        'Invalid or expired password reset code',
      );
    }

    const isValidOtp = this.tokenService.verifyToken(
      resetPasswordDto.otp,
      authToken.tokenHash,
    );

    if (!isValidOtp) {
      throw new BadRequestException(
        'Invalid or expired password reset code',
      );
    }

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
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException(
        'User no longer exists',
      );
    }

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
}