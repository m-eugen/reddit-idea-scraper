/**
 * Custom error types and error handling utilities
 */

import { HTTP_STATUS } from './constants.js';

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class InsufficientCreditsError extends AppError {
  constructor(message: string = 'Insufficient API credits') {
    super(message, 'INSUFFICIENT_CREDITS', HTTP_STATUS.BAD_REQUEST);
    this.name = 'InsufficientCreditsError';
  }
}

export class APIOverloadedError extends AppError {
  constructor(message: string = 'API is overloaded') {
    super(message, 'API_OVERLOADED', HTTP_STATUS.OVERLOADED);
    this.name = 'APIOverloadedError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Invalid API key') {
    super(message, 'AUTHENTICATION_ERROR', HTTP_STATUS.UNAUTHORIZED);
    this.name = 'AuthenticationError';
  }
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  if (!error) return false;

  const status = error.status || error.statusCode;
  const shouldRetry = error.headers?.['x-should-retry'] === 'true';

  return (
    status === HTTP_STATUS.OVERLOADED ||
    status === HTTP_STATUS.SERVICE_UNAVAILABLE ||
    status === HTTP_STATUS.BAD_GATEWAY ||
    shouldRetry
  );
}

/**
 * Check if error is due to insufficient credits
 */
export function isInsufficientCreditsError(error: any): boolean {
  return (
    error?.status === HTTP_STATUS.BAD_REQUEST &&
    error?.message?.toLowerCase().includes('credit balance')
  );
}

/**
 * Check if error is a server error
 */
export function isServerError(error: any): boolean {
  const status = error?.status || error?.statusCode;
  return status === HTTP_STATUS.INTERNAL_SERVER_ERROR;
}

/**
 * Format error for logging
 */
export function formatError(error: any): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return String(error);
}
