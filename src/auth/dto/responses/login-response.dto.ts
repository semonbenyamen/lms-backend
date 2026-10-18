import { ApiProperty } from '@nestjs/swagger';

import { TokenResponseDto } from './token-response.dto.js';
import { UserResponseDto } from './user-response.dto.js';

export class LoginResponseDto extends TokenResponseDto {
  @ApiProperty({
    type: () => UserResponseDto,
  })
  user: UserResponseDto;
}