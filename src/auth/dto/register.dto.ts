import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
  IsStrongPassword,
} from 'class-validator';
import { Match } from '../../common/validators/match.decorator.js';

export class RegisterDto {
  @ApiProperty({
    example: 'John',
    description: 'User first name',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'User last name',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'User email address',
  })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({
    example: 'StrongPassword123!',
    description: 'User password',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @IsStrongPassword()
  password: string;

  @ApiProperty({
    example: 'StrongPassword123',
    description: 'Must match the password field',
  })
  @IsString()
  @Match('password', {
    message: 'Passwords do not match',
  })
  confirmPassword: string;
}