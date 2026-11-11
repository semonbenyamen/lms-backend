import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    const isHttpException = exception instanceof HttpException;

    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // An unexpected error's own message may describe internals, so the
    // client gets a generic one and the details go to the log.
    const message = isHttpException
      ? exception.getResponse()
      : 'Internal server error';

    // 4xx errors are expected client mistakes, so only server errors are logged.
    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        exception instanceof Error ? exception.message : String(exception),
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const isDevelopment = process.env.NODE_ENV !== 'production';

    response.status(statusCode).json({
      success: false,
      statusCode,
      message,
      ...(isDevelopment && {
        error:
          exception instanceof Error
            ? {
                name: exception.name,
                stack: exception.stack,
              }
            : {
                name: 'UnknownError',
              },
      }),
    });
  }
}
