import { BadRequestException } from '@nestjs/common';
import { PaginationQueryDto } from './dto/pagination-query.dto.js';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

export function getPaginationParams(
  paginationQuery?: PaginationQueryDto,
): PaginationParams {
  const rawPage = paginationQuery?.page;
  const rawLimit = paginationQuery?.limit;

  if (rawPage !== undefined && rawPage < 1) {
    throw new BadRequestException('Page must be greater than or equal to 1');
  }
  if (rawLimit !== undefined && rawLimit < 1) {
    throw new BadRequestException('Limit must be greater than or equal to 1');
  }

  const page = Math.max(1, rawPage ?? 1);
  const limit = Math.min(100, Math.max(1, rawLimit ?? 10));
  const skip = (page - 1) * limit;
  const take = limit;

  return { page, limit, skip, take };
}

export function getPaginationMeta(
  total: number,
  page: number,
  limit: number,
) {
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