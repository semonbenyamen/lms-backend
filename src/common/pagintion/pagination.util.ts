import { PaginationMetaDto } from './dto/pagination-meta.dto.js';
import { PaginationQueryDto } from './dto/pagination-query.dto.js';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMetaDto;
}

// The limits are validated by PaginationQueryDto before this runs.
export function getPaginationParams({
  page = 1,
  limit = 10,
}: PaginationQueryDto = {}): PaginationParams {
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

export function getPaginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMetaDto {
  const totalPages = Math.ceil(total / limit);

  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
