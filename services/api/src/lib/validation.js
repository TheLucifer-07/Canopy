import { ERROR_CODES } from '@canopy/config';
import { ApiError } from './errors.js';

export function parseWithSchema(schema, value) {
  const result = schema.safeParse(value);
  if (result.success) return result.data;

  throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'Request validation failed.', {
    statusCode: 422,
    details: { issues: result.error.issues }
  });
}
