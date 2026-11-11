import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

type ApiErrors = Partial<Record<HttpStatus, string>>;

export function ApiErrorResponses(errors: ApiErrors) {
  return applyDecorators(
    ...Object.entries(errors).map(([status, description]) =>
      ApiResponse({ status: Number(status), description }),
    ),
  );
}

// Every endpoint behind JwtAuthGuard can return the same 401.
export function ApiAuthErrorResponses(errors: ApiErrors = {}) {
  return ApiErrorResponses({
    [HttpStatus.UNAUTHORIZED]: 'Authentication required',
    ...errors,
  });
}
