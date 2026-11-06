import { ApiProperty } from '@nestjs/swagger';

// Create endpoints return only the new id, the rest is read with GET.
export class IdResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;
}
