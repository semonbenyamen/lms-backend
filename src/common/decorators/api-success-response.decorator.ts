import { Type, applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

import { ApiResponseDto } from '../dto/api-response.dto.js';
import { PaginationMetaDto } from '../pagintion/dto/pagination-meta.dto.js';

export function ApiSuccessResponse(
  model: Type<unknown>,
  status: number = 200,
  options?: { isArray?: boolean; isPaginated?: boolean },
) {
  const list = { type: 'array', items: { $ref: getSchemaPath(model) } };

  const getDataSchema = () => {
    if (options?.isPaginated) {
      return {
        type: 'object',
        required: ['items', 'meta'],
        properties: {
          items: list,
          meta: { $ref: getSchemaPath(PaginationMetaDto) },
        },
      };
    }

    return options?.isArray ? list : { $ref: getSchemaPath(model) };
  };

  return applyDecorators(
    ApiExtraModels(ApiResponseDto, PaginationMetaDto, model),
    ApiResponse({
      status,
      schema: {
        allOf: [
          {
            $ref: getSchemaPath(ApiResponseDto),
          },
          {
            properties: {
              statusCode: {
                type: 'number',
                example: status,
              },
              data: getDataSchema(),
            },
          },
        ],
      },
    }),
  );
}
