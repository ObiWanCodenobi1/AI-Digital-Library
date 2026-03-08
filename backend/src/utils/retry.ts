// backend/src/utils/retry.ts

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

/**
 * Exponential backoff retry logic
 * Task 2.3.1 - Validates: Requirements 10 (System Performance)
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
  } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      if (!isRetryableError(error)) {
        throw error;
      }

      if (attempt === maxAttempts) {
        break;
      }

      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await sleep(delay);

      // Exponential backoff with jitter
      delay = Math.min(delay * backoffMultiplier + Math.random() * 1000, maxDelay);
    }
  }

  throw new Error(`Failed after ${maxAttempts} attempts: ${lastError!.message}`);
}

/**
 * Check if error is retryable
 * Task 2.3.2 - Handle timeout and rate limit errors
 */
function isRetryableError(error: any): boolean {
  // Retry on rate limits, timeouts, and temporary failures
  const retryableErrors = [
    'ThrottlingException',
    'TooManyRequestsException',
    'ServiceUnavailable',
    'InternalServerError',
    'RequestTimeout',
    'ModelTimeoutException',
  ];

  return retryableErrors.some(errType => 
    error.name?.includes(errType) || error.message?.includes(errType)
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
