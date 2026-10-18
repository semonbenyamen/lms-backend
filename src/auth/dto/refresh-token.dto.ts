import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    example: 'refresh-token-value',
    description: 'Refresh token used to obtain a new token pair',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}