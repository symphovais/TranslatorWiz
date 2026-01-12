import { fetchWithTimeout } from '../../src/services/network.service';

describe('NetworkService', () => {
  describe('fetchWithTimeout', () => {
    it('should return response on successful fetch', async () => {
      const mockResponse = { ok: true, status: 200 };
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await fetchWithTimeout('https://api.example.com/test');

      expect(result).toBe(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/test', undefined);
    });

    it('should pass options to fetch', async () => {
      const mockResponse = { ok: true, status: 200 };
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      const options = {
        headers: { 'Authorization': 'Bearer token123' },
        method: 'POST'
      };

      const result = await fetchWithTimeout('https://api.example.com/test', options);

      expect(result).toBe(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/test', options);
    });

    it('should timeout after specified duration', async () => {
      jest.useFakeTimers();

      // Mock fetch to never resolve
      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const resultPromise = fetchWithTimeout('https://api.example.com/test', undefined, 5000);

      // Advance time past the timeout
      jest.advanceTimersByTime(5001);

      await expect(resultPromise).rejects.toThrow('Request timeout - please check your network connection');

      jest.useRealTimers();
    });

    it('should use default timeout of 10 seconds', async () => {
      jest.useFakeTimers();

      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise(() => {})
      );

      const resultPromise = fetchWithTimeout('https://api.example.com/test');

      // Default timeout is 10000ms (API_TIMEOUT)
      jest.advanceTimersByTime(10001);

      await expect(resultPromise).rejects.toThrow('Request timeout');

      jest.useRealTimers();
    });

    it('should reject on fetch error', async () => {
      const networkError = new Error('Network error');
      (global.fetch as jest.Mock).mockRejectedValueOnce(networkError);

      await expect(
        fetchWithTimeout('https://api.example.com/test')
      ).rejects.toThrow('Network error');
    });

    it('should resolve before timeout if fetch is fast', async () => {
      const mockResponse = { ok: true, status: 200 };
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      // Even with a short timeout, a fast response should work
      const result = await fetchWithTimeout('https://api.example.com/test', undefined, 100);

      expect(result).toBe(mockResponse);
    });
  });
});
