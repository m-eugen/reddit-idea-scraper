/**
 * Retry logic with exponential backoff
 */

import { isRetryableError } from './errors.js';
import { createLogger } from './logger.js';

const logger = createLogger('Retry');

export interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  onRetry?: (attempt: number, delay: number, maxRetries: number) => void;
}

/**
 * Execute function with exponential backoff retry
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { maxRetries, initialDelay, onRetry } = options;
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      if (!isRetryableError(error) || attempt === maxRetries) {
        throw error;
      }

      const delay = initialDelay * Math.pow(2, attempt);
      const delaySeconds = delay / 1000;

      if (onRetry) {
        onRetry(attempt + 2, delaySeconds, maxRetries + 1);
      } else {
        logger.progress(
          `API overloaded. Waiting ${delaySeconds}s before attempt ${attempt + 2}/${maxRetries + 1}...`
        );
      }

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
