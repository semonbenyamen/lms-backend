import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendVerificationOtp(
    email: string,
    otp: string,
  ): Promise<void> {
    this.logger.log(
      `[DEV ONLY] Verification OTP for ${email}: ${otp}`,
    );
  }

  async sendPasswordResetOtp(
    email: string,
    otp: string,
  ): Promise<void> {
    this.logger.log(
      `[DEV ONLY] Password reset OTP for ${email}: ${otp}`,
    );
  }
}