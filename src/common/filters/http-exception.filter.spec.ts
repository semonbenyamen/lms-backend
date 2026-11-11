import {
  ArgumentsHost,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpExceptionFilter } from './http-exception.filter.js';

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;
  let logError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    logError = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    logError.mockRestore();
  });

  it('should return the status and message of an HTTP error without logging it', () => {
    filter.catch(new NotFoundException('Course not found'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 404,
        message: expect.objectContaining({ message: 'Course not found' }),
      }),
    );
    expect(logError).not.toHaveBeenCalled();
  });

  it('should not log a validation error', () => {
    filter.catch(new BadRequestException(['title should not be empty']), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(logError).not.toHaveBeenCalled();
  });

  it('should hide the message of an unexpected error and log it', () => {
    const error = new Error('Failed to get the file details from Cloudinary');

    filter.catch(error, host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Internal server error',
      }),
    );
    expect(logError).toHaveBeenCalledWith(error.message, error.stack);
  });
});
