import { ApiProperty } from '@nestjs/swagger';

import { UserRole } from '../../../common/enums/user-role.enum.js';

export class UserResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    example: 'John',
  })
  firstName: string;

  @ApiProperty({
    example: 'Doe',
  })
  lastName: string;

  @ApiProperty({
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    enum: UserRole,
    enumName: 'UserRole',
  })
  role: UserRole;

  @ApiProperty({
    example: true,
  })
  isVerified: boolean;

  @ApiProperty({
    example: '2026-10-06T00:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  createdAt: Date;
}