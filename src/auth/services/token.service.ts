import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createHmac,
  randomInt,
  timingSafeEqual,
  randomBytes,
} from 'crypto';

@Injectable()
export class TokenService {
  constructor(private readonly configService: ConfigService) {}

  generateOtp(): string {
    return randomInt(100000, 1000000).toString();
  }

  hashToken(token: string): string {
    const secret = this.configService.getOrThrow<string>('AUTH_TOKEN_SECRET');

    return createHmac('sha256', secret).update(token).digest('hex');
  }

  getOtpExpiration(): Date {
    const expiresAt = new Date();

    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    return expiresAt;
  }

  verifyToken(token: string, storedHash: string): boolean {
  const tokenHash = this.hashToken(token);

  const tokenBuffer = Buffer.from(tokenHash, 'hex');
  const storedHashBuffer = Buffer.from(storedHash, 'hex');

  if (tokenBuffer.length !== storedHashBuffer.length) {
    return false;
  }

  return timingSafeEqual(tokenBuffer, storedHashBuffer);
  }

  generateRefreshToken(): string {
    return randomBytes(64).toString('hex');
  }

  getRefreshTokenExpiration(): Date {
    const expiresAt = new Date();

    expiresAt.setDate(expiresAt.getDate() + 7);

    return expiresAt;
  }
}