import { QueryFailedError } from 'typeorm';

// Postgres reports a broken unique constraint or index with code 23505.
// Pass the index name when a table has more than one unique index.
export const isUniqueViolation = (
  error: unknown,
  indexName?: string,
): boolean => {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as {
    code?: string;
    constraint?: string;
  };

  return (
    driverError.code === '23505' &&
    (indexName === undefined || driverError.constraint === indexName)
  );
};
