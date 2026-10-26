
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

    const message = isHttpException
      ? exception.getResponse()
      : exception instanceof Error
        ? exception.message
        : String(exception);

    // Print error details in the server terminal
    this.logger.error(
      `[HTTP ${statusCode}] ${typeof message === 'string' ? message : JSON.stringify(message)}`,
      exception instanceof Error ? exception.stack : undefined,
    );

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
