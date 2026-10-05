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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { AuthService } from './auth.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { ResendVerificationDto } from './dto/resend-verification.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import type { AuthenticatedRequest } from './types/authenticated-request.type.js';
import { ApiSuccessResponse } from '../common/decorators/api-success-response.decorator.js';
import { LoginResponseDto } from './dto/responses/login-response.dto.js';
import { MessageResponseDto } from './dto/responses/message-response.dto.js';
import { TokenResponseDto } from './dto/responses/token-response.dto.js';
import { UserResponseDto } from './dto/responses/user-response.dto.js';
import { AUTH_THROTTLE } from './constants/auth-throttle.constants.js';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Limit account creation attempts to reduce automated abuse.
  @Throttle(AUTH_THROTTLE.REGISTER)
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiSuccessResponse(UserResponseDto, HttpStatus.CREATED)
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // Limit OTP verification attempts to reduce code guessing.
  @Throttle(AUTH_THROTTLE.VERIFY_EMAIL)
  @Post('verify-email')
  @ApiOperation({ summary: 'Verify user email using OTP' })
  @ApiSuccessResponse(MessageResponseDto, HttpStatus.CREATED)
  verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  // Limit repeated verification emails to prevent OTP spam.
  @Throttle(AUTH_THROTTLE.RESEND_VERIFICATION)
  @Post('resend-verification')
  @ApiOperation({ summary: 'Resend email verification OTP' })
  @ApiSuccessResponse(MessageResponseDto, HttpStatus.CREATED)
  resendVerification(
    @Body() resendVerificationDto: ResendVerificationDto,
  ) {
    return this.authService.resendVerificationCode(
      resendVerificationDto,
    );
  }

  // Limit login attempts to reduce brute-force attacks.
  @Throttle(AUTH_THROTTLE.LOGIN)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiSuccessResponse(LoginResponseDto, HttpStatus.OK)
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  @ApiSuccessResponse(UserResponseDto, HttpStatus.OK)
  getProfile(@Req() request: AuthenticatedRequest) {
    return this.authService.getProfile(request.user.sub);
  }

  // Limit password reset requests to prevent email abuse.
  @Throttle(AUTH_THROTTLE.FORGOT_PASSWORD)
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset OTP' })
  @ApiSuccessResponse(MessageResponseDto, HttpStatus.OK)
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  // Limit password reset attempts to reduce OTP guessing.
  @Throttle(AUTH_THROTTLE.RESET_PASSWORD)
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using OTP' })
  @ApiSuccessResponse(MessageResponseDto, HttpStatus.OK)
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access and refresh tokens' })
  @ApiSuccessResponse(TokenResponseDto, HttpStatus.OK)
  refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refresh(refreshTokenDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  @ApiSuccessResponse(MessageResponseDto, HttpStatus.OK)
  logout(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.logout(refreshTokenDto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change the authenticated user password' })
  @ApiSuccessResponse(MessageResponseDto, HttpStatus.OK)
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