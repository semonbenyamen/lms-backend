import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto {
  @ApiProperty({
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'HTTP status code of the response',
  })
  statusCode: number;

  @ApiProperty({
    example: '2026-10-06T00:00:00.000Z',
    format: 'date-time',
  })
  timestamp: string;
}