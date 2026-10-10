import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly senderEmail: string;

  constructor(private readonly configService: ConfigService) {
    this.senderEmail = this.configService.getOrThrow<string>('MAIL_USER');

    const appPassword =
      this.configService.getOrThrow<string>('MAIL_APP_PASSWORD');

    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: this.senderEmail,
        pass: appPassword,
      },
    });
  }

  async sendVerificationOtp(email: string, otp: string): Promise<void> {
    await this.sendOtpEmail(
      email,
      'Verify Your Email - LMS',
      `Your email verification code is: ${otp}`,
      otp,
    );
  }

  async sendPasswordResetOtp(email: string, otp: string): Promise<void> {
    await this.sendOtpEmail(
      email,
      'Reset Your Password - LMS',
      `Your password reset code is: ${otp}`,
      otp,
    );
  }

  private async sendOtpEmail(
    email: string,
    subject: string,
    message: string,
    otp: string,
  ): Promise<void> {
    await this.transporter.sendMail({
      from: {
        name: 'LMS Support',
        address: this.senderEmail,
      },
      to: email,
      subject,
      text: message,
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>${subject}</h2>
          <p>Please use the following verification code:</p>
          <h1 style="letter-spacing: 6px;">${otp}</h1>
          <p>If you did not request this code, please ignore this email.</p>
        </div>
      `,
    });

    this.logger.log(`OTP email submitted to SMTP for ${email}`);
  }
}
