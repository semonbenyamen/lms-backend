import { ApiProperty } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440010' })
  id: string;

  @ApiProperty({ example: 'Backend Development' })
  name: string;

  @ApiProperty({
    example: '2026-10-11T00:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2026-10-11T00:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  updatedAt: Date;
}
