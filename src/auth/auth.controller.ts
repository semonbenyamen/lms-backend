import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';

import { UserRole } from '../users/entities/user.entity.js';
import { AuthService } from './auth.service.js';
import { Roles } from './decorators/roles.decorator.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { ResendVerificationDto } from './dto/resend-verification.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    role: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('verify-email')
  verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Post('resend-verification')
  resendVerification(
    @Body() resendVerificationDto: ResendVerificationDto,
  ) {
    return this.authService.resendVerificationCode(
      resendVerificationDto,
    );
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getProfile(@Req() request: AuthenticatedRequest) {
    return this.authService.getProfile(request.user.sub);
  }

  @Get('admin-test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  adminTest() {
    return {
      message: 'Welcome Admin',
    };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ) {
    return this.authService.forgotPassword(
      forgotPasswordDto,
    );
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(
   @Body() resetPasswordDto: ResetPasswordDto,
  ) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(
     @Body() refreshTokenDto: RefreshTokenDto,
  ) {
    return this.authService.refresh(refreshTokenDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(
    @Body() refreshTokenDto: RefreshTokenDto,
  ) {
    return this.authService.logout(refreshTokenDto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  changePassword(
    @Req() request: AuthenticatedRequest,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      request.user.sub,
      changePasswordDto,
    );
  }
}