import { API_TIMEOUT } from '../constants';
import { FetchOptions } from '../types';

/**
 * Fetch with timeout wrapper
 * Wraps the native fetch API with a configurable timeout
 *
 * @param url - The URL to fetch
 * @param options - Fetch options (headers, method, etc.)
 * @param timeout - Timeout in milliseconds (defaults to API_TIMEOUT)
 * @returns Promise that resolves to the Response or rejects on timeout
 */
export async function fetchWithTimeout(
  url: string,
  options?: FetchOptions,
  timeout: number = API_TIMEOUT
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Request timeout - please check your network connection'));
    }, timeout);

    fetch(url, options)
      .then(response => {
        clearTimeout(timeoutId);
        resolve(response);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}
