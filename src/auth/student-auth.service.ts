import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac, randomInt, randomBytes, timingSafeEqual } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import ms, { type StringValue } from 'ms';
import { Repository } from 'typeorm';

import { AuthTokenType } from '../common/enums/auth-token-type.enum.js';
import { UserRole } from '../common/enums/user-role.enum.js';
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
import { AuthToken } from './entities/auth-token.entity.js';
import { RefreshToken } from './entities/refresh-token.entity.js';
import { AuthUserService } from './services/auth-user.service.js';

@Injectable()
export class StudentAuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authUserService: AuthUserService,

    @InjectRepository(AuthToken)
    private readonly authTokenRepository: Repository<AuthToken>,

    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async registerStudent(registerDto: RegisterDto) {
    const email = this.normalizeEmail(registerDto.email);
    const existingUser = await this.usersService.findByEmail(email);

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 12);
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
    const user = await this.requireUnverifiedUser(verifyEmailDto.email);

    await this.validateAuthToken(
      user.id,
      AuthTokenType.EMAIL_VERIFICATION,
      verifyEmailDto.otp,
      'Verification code is invalid or has expired',
      'Invalid verification code',
    );

    await this.authUserService.markAsVerified(user.id);
    await this.authTokenRepository.delete({
      userId: user.id,
      type: AuthTokenType.EMAIL_VERIFICATION,
    });

    return { message: 'Email verified successfully' };
  }

  async resendVerificationCode(resendVerificationDto: ResendVerificationDto) {
    const user = await this.requireUnverifiedUser(resendVerificationDto.email);
    await this.ensureVerificationCooldown(user.id);

    await this.authTokenRepository.delete({
      userId: user.id,
      type: AuthTokenType.EMAIL_VERIFICATION,
    });

    const otp = await this.createAuthToken(
      user.id,
      AuthTokenType.EMAIL_VERIFICATION,
    );
    await this.mailService.sendVerificationOtp(user.email, otp);

    return { message: 'Verification code sent successfully' };
  }

  async login(loginDto: LoginDto) {
    const email = this.normalizeEmail(loginDto.email);
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
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
    return { ...tokens, user: this.toUserView(user) };
  }

  async refreshSessionTokens(refreshTokenDto: RefreshTokenDto) {
    const storedToken = await this.findValidRefreshToken(
      refreshTokenDto.refreshToken,
    );
    const user = await this.requireRefreshTokenUser(storedToken);

    await this.refreshTokenRepository.delete(storedToken.id);
    return this.issueTokens(user);
  }

  async logout(refreshTokenDto: RefreshTokenDto) {
    const tokenHash = this.hashToken(refreshTokenDto.refreshToken);
    await this.refreshTokenRepository.delete({ tokenHash });
    return { message: 'Logged out successfully' };
  }

  async changeAuthenticatedUserPassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ) {
    const user = await this.requireUser(userId);
    await this.validatePasswordChange(user.passwordHash, changePasswordDto);

    const newPasswordHash = await bcrypt.hash(
      changePasswordDto.newPassword,
      12,
    );
    await this.authUserService.updatePassword(user.id, newPasswordHash);
    await this.refreshTokenRepository.delete({ userId: user.id });

    return { message: 'Password changed successfully' };
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
    await this.mailService.sendPasswordResetOtp(user.email, otp);

    return genericResponse;
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const email = this.normalizeEmail(resetPasswordDto.email);
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new BadRequestException('Invalid or expired password reset code');
    }

    await this.validateAuthToken(
      user.id,
      AuthTokenType.PASSWORD_RESET,
      resetPasswordDto.otp,
      'Invalid or expired password reset code',
    );

    const passwordHash = await bcrypt.hash(resetPasswordDto.newPassword, 12);
    await this.authUserService.updatePassword(user.id, passwordHash);
    await this.authTokenRepository.delete({
      userId: user.id,
      type: AuthTokenType.PASSWORD_RESET,
    });
    await this.refreshTokenRepository.delete({ userId: user.id });

    return { message: 'Password reset successfully' };
  }

  async getProfile(userId: string) {
    const user = await this.requireUser(userId);
    return this.toUserView(user);
  }


  private generateOtp(): string {
    return randomInt(100000, 1000000).toString();
  }

  private hashToken(token: string): string {
    const secret = this.configService.getOrThrow<string>('AUTH_TOKEN_SECRET');
    return createHmac('sha256', secret).update(token).digest('hex');
  }

  private getOtpExpiration(): Date {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);
    return expiresAt;
  }

  private verifyToken(token: string, storedHash: string): boolean {
    const tokenHash = this.hashToken(token);
    const tokenBuffer = Buffer.from(tokenHash, 'hex');
    const storedHashBuffer = Buffer.from(storedHash, 'hex');

    if (tokenBuffer.length !== storedHashBuffer.length) {
      return false;
    }

    return timingSafeEqual(tokenBuffer, storedHashBuffer);
  }

  private generateRefreshToken(): string {
    return randomBytes(64).toString('hex');
  }

  private getRefreshTokenExpiration(): Date {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    return expiresAt;
  }

  private async createAuthToken(
    userId: string,
    type: AuthTokenType,
  ): Promise<string> {
    const otp = this.generateOtp();
    const authToken = this.authTokenRepository.create({
      userId,
      type,
      tokenHash: this.hashToken(otp),
      expiresAt: this.getOtpExpiration(),
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
    const refreshToken = this.generateRefreshToken();
    const refreshTokenEntity = this.refreshTokenRepository.create({
      userId,
      tokenHash: this.hashToken(refreshToken),
      expiresAt: this.getRefreshTokenExpiration(),
    });
    await this.refreshTokenRepository.save(refreshTokenEntity);
    return refreshToken;
  }

  private async validateAuthToken(
    userId: string,
    type: AuthTokenType,
    otp: string,
    errorMessage: string,
    invalidOtpMessage = errorMessage,
  ): Promise<AuthToken> {
    const authToken = await this.authTokenRepository.findOne({
      where: { userId, type },
      order: { createdAt: 'DESC' },
    });

    if (!authToken) {
      throw new BadRequestException(errorMessage);
    }

    if (authToken.expiresAt.getTime() < Date.now()) {
      await this.authTokenRepository.delete(authToken.id);
      throw new BadRequestException(errorMessage);
    }

    const isValidOtp = this.verifyToken(otp, authToken.tokenHash);
    if (!isValidOtp) {
      throw new BadRequestException(invalidOtpMessage);
    }

    return authToken;
  }

  private async requireUnverifiedUser(email: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.isVerified) {
      throw new BadRequestException('Email is already verified');
    }
    return user;
  }

  private async ensureVerificationCooldown(userId: string): Promise<void> {
    const latestToken = await this.authTokenRepository.findOne({
      where: { userId, type: AuthTokenType.EMAIL_VERIFICATION },
      order: { createdAt: 'DESC' },
    });

    if (!latestToken) {
      return;
    }

    const cooldownMs = 60 * 1000;
    const nextAllowedAt = latestToken.createdAt.getTime() + cooldownMs;
    if (Date.now() < nextAllowedAt) {
      throw new BadRequestException(
        'Please wait before requesting another verification code',
      );
    }
  }

  private async findValidRefreshToken(
    refreshToken: string,
  ): Promise<RefreshToken> {
    const tokenHash = this.hashToken(refreshToken);
    const storedToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (storedToken.expiresAt.getTime() < Date.now()) {
      await this.refreshTokenRepository.delete(storedToken.id);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    return storedToken;
  }

  private async requireRefreshTokenUser(storedToken: RefreshToken) {
    const user = await this.usersService.findById(storedToken.userId);
    if (!user) {
      await this.refreshTokenRepository.delete(storedToken.id);
      throw new UnauthorizedException('Invalid refresh token');
    }
    return user;
  }

  private async validatePasswordChange(
    passwordHash: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    await this.validateCurrentPassword(
      passwordHash,
      changePasswordDto.currentPassword,
    );
    await this.ensureDifferentPassword(
      passwordHash,
      changePasswordDto.newPassword,
    );
  }

  private async validateCurrentPassword(
    passwordHash: string,
    currentPassword: string,
  ): Promise<void> {
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      passwordHash,
    );
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }
  }

  private async ensureDifferentPassword(
    passwordHash: string,
    newPassword: string,
  ): Promise<void> {
    const isSamePassword = await bcrypt.compare(newPassword, passwordHash);
    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }
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
      throw new UnauthorizedException('User no longer exists');
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
