import { QueryFailedError } from 'typeorm';

// Postgres reports a broken unique constraint or index with code 23505.
export const isUniqueViolation = (error: unknown): boolean =>
  error instanceof QueryFailedError &&
  (error.driverError as { code?: string }).code === '23505';
