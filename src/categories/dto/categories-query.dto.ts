import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationQueryDto } from '../../common/pagintion/dto/pagination-query.dto.js';

export class CategoriesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'back',
    description: 'Part of the category name, regardless of letter case',
    maxLength: 100,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
