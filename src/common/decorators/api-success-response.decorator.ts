import { Type, applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

import { ApiResponseDto } from '../dto/api-response.dto.js';

export function ApiSuccessResponse(
  model: Type<unknown>,
  status: number = 200,
  options?: { isArray?: boolean },
) {
  const isArray = options?.isArray ?? false;

  return applyDecorators(
    ApiExtraModels(ApiResponseDto, model),
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
              data: isArray
                ? {
                    type: 'array',
                    items: {
                      $ref: getSchemaPath(model),
                    },
                  }
                : {
                    $ref: getSchemaPath(model),
                  },
            },
          },
        ],
      },
    }),
  );
}
