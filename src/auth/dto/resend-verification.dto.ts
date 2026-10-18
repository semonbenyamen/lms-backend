import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MaxLength } from 'class-validator';

export class ResendVerificationDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email address to resend the verification code to',
  })
  @IsEmail()
  @MaxLength(255)
  email: string;
}