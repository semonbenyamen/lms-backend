import { ApiProperty } from '@nestjs/swagger';

export class ContentProgressResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'The content item this progress belongs to',
  })
  contentItemId: string;

  @ApiProperty({
    example: false,
    description: 'Whether the student completed the content',
  })
  isCompleted: boolean;

  @ApiProperty({
    example: 120,
    description: 'The furthest video position reached, in seconds',
  })
  lastPositionSeconds: number;

  @ApiProperty({
    example: null,
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'The time the content was completed',
  })
  completedAt: Date | null;
}
