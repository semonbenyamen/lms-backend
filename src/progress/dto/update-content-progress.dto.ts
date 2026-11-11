import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

// Text and image content can be marked complete; video also tracks position.
export class UpdateContentProgressDto {
  @ApiPropertyOptional({ description: 'Mark content as completed' })
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;

  @ApiPropertyOptional({ description: 'Current video position in seconds', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  lastPositionSeconds?: number;
}
