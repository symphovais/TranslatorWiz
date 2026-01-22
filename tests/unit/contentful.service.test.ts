import {
  fetchLocales,
  fetchTranslations,
  fetchContentTypes,
  fetchRecords,
  validateContentType,
  fetchAllContentfulItems,
  saveItemToContentful
} from '../../src/services/contentful.service';
import { ContentfulConfig } from '../../src/types';

describe('ContentfulService', () => {
  const validConfig: ContentfulConfig = {
    SPACE_ID: 'space123',
    ENVIRONMENT: 'master',
    CMA_TOKEN: 'token123',
    CONTENT_TYPE: 'translation',
    KEY_FIELD: 'key',
    VALUE_FIELD: 'value',
    NODE_NAME_PATTERN: '^jams_'
  };

  // Helper to create mock responses
  const createMockResponse = (data: unknown, ok = true, status = 200) => ({
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data))
  });

  describe('fetchLocales', () => {
    it('should fetch and return locales successfully', async () => {
      const mockLocales = {
        items: [
          { code: 'en-US', name: 'English (US)' },
          { code: 'de-DE', name: 'German' }
        ]
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse(mockLocales));

      const result = await fetchLocales(validConfig);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ code: 'en-US', name: 'English (US)' });
      expect(result[1]).toEqual({ code: 'de-DE', name: 'German' });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/spaces/space123/environments/master/locales'),
        expect.objectContaining({
          headers: { Authorization: 'Bearer token123' }
        })
      );
    });

    it('should filter out invalid locale items', async () => {
      const mockLocales = {
        items: [
          { code: 'en-US', name: 'English' },
          { code: '', name: 'Invalid' },
          { code: 'fr-FR', name: '' },
          { code: '  ', name: '  ' }
        ]
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse(mockLocales));

      const result = await fetchLocales(validConfig);

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('en-US');
    });

    it('should throw on 401 unauthorized', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse({}, false, 401));

      await expect(fetchLocales(validConfig)).rejects.toThrow('Invalid API credentials');
    });

    it('should throw on 403 forbidden', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse({}, false, 403));

      await expect(fetchLocales(validConfig)).rejects.toThrow('Invalid API credentials');
    });

    it('should throw on 404 not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse({}, false, 404));

      await expect(fetchLocales(validConfig)).rejects.toThrow('Space or environment not found');
    });

    it('should throw on invalid response format', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse({ invalid: 'format' }));

      await expect(fetchLocales(validConfig)).rejects.toThrow('Invalid response format');
    });

    it('should URL encode space ID and environment', async () => {
      const configWithSpecialChars = {
        ...validConfig,
        SPACE_ID: 'space with spaces',
        ENVIRONMENT: 'env/with/slashes'
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse({ items: [] }));

      await fetchLocales(configWithSpecialChars);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('space%20with%20spaces'),
        expect.anything()
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('env%2Fwith%2Fslashes'),
        expect.anything()
      );
    });
  });

  describe('fetchTranslations', () => {
    it('should fetch and return translations successfully', async () => {
      const mockTranslations = {
        items: [
          { fields: { key: 'hello', value: 'Hello World' } },
          { fields: { key: 'bye', value: 'Goodbye' } }
        ]
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse(mockTranslations));

      const result = await fetchTranslations(validConfig, 'en-US');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ key: 'hello', value: 'Hello World' });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('locale=en-US'),
        expect.anything()
      );
    });

    it('should throw on empty locale', async () => {
      await expect(fetchTranslations(validConfig, '')).rejects.toThrow('Invalid locale');
    });

    it('should throw on whitespace-only locale', async () => {
      await expect(fetchTranslations(validConfig, '   ')).rejects.toThrow('Invalid locale');
    });

    it('should filter out translations with empty keys or values', async () => {
      const mockTranslations = {
        items: [
          { fields: { key: 'valid', value: 'Valid Translation' } },
          { fields: { key: '', value: 'Missing key' } },
          { fields: { key: 'missing_value', value: '' } },
          { fields: { key: '  ', value: '  ' } }
        ]
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse(mockTranslations));

      const result = await fetchTranslations(validConfig, 'en-US');

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('valid');
    });

    it('should throw on 401 unauthorized', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse({}, false, 401));

      await expect(fetchTranslations(validConfig, 'en-US')).rejects.toThrow('Invalid API credentials');
    });

    it('should throw on 404 content type not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse({}, false, 404));

      await expect(fetchTranslations(validConfig, 'en-US')).rejects.toThrow('Content type not found');
    });

    it('should URL encode locale parameter', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse({ items: [] }));

      await fetchTranslations(validConfig, 'en-US');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('locale=en-US'),
        expect.anything()
      );
    });
  });

  describe('fetchContentTypes', () => {
    it('should fetch and return content types successfully', async () => {
      const mockContentTypes = {
        items: [
          { sys: { id: 'translation' }, name: 'Translation' },
          { sys: { id: 'page' }, name: 'Page' }
        ]
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse(mockContentTypes));

      const result = await fetchContentTypes(validConfig);

      expect(result).toHaveLength(2);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/content_types'),
        expect.anything()
      );
    });

    it('should throw on 401 unauthorized', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse({}, false, 401));

      await expect(fetchContentTypes(validConfig)).rejects.toThrow('Invalid API credentials');
    });

    it('should throw on 404 not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse({}, false, 404));

      await expect(fetchContentTypes(validConfig)).rejects.toThrow('Space or environment not found');
    });

    it('should throw on invalid response format', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse({ not: 'items' }));

      await expect(fetchContentTypes(validConfig)).rejects.toThrow('Invalid response format');
    });
  });

  describe('fetchRecords', () => {
    it('should fetch and return records successfully', async () => {
      const mockRecords = {
        items: [
          { sys: { id: 'entry1' }, fields: { title: { 'en-US': 'Entry 1' } } },
          { sys: { id: 'entry2' }, fields: { title: { 'en-US': 'Entry 2' } } }
        ]
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse(mockRecords));

      const result = await fetchRecords(validConfig, 'page');

      expect(result).toHaveLength(2);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('content_type=page'),
        expect.anything()
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=100'),
        expect.anything()
      );
    });

    it('should throw on 401 unauthorized', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse({}, false, 401));

      await expect(fetchRecords(validConfig, 'page')).rejects.toThrow('Invalid API credentials');
    });

    it('should throw on 404 content type not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse({}, false, 404));

      await expect(fetchRecords(validConfig, 'page')).rejects.toThrow('Content type not found');
    });
  });

  describe('validateContentType', () => {
    it('should return success when content type and fields are valid', async () => {
      const mockContentType = {
        fields: [
          { id: 'key', name: 'Key', type: 'Symbol' },
          { id: 'value', name: 'Value', type: 'Text' }
        ]
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse(mockContentType));

      const result = await validateContentType(validConfig);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return error when content type not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse({}, false, 404));

      const result = await validateContentType(validConfig);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Content type not found');
    });

    it('should return error when key field is missing', async () => {
      const mockContentType = {
        fields: [
          { id: 'value', name: 'Value', type: 'Text' }
        ]
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse(mockContentType));

      const result = await validateContentType(validConfig);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Key field not found in content type');
    });

    it('should return error when value field is missing', async () => {
      const mockContentType = {
        fields: [
          { id: 'key', name: 'Key', type: 'Symbol' }
        ]
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse(mockContentType));

      const result = await validateContentType(validConfig);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Value field not found in content type');
    });
  });

  describe('fetchAllContentfulItems', () => {
    it('should fetch all items from a single page', async () => {
      const mockResponse = {
        total: 2,
        items: [
          {
            sys: { id: 'entry1' },
            fields: {
              key: { 'en-US': 'hello' },
              value: { 'en-US': 'Hello World' }
            }
          },
          {
            sys: { id: 'entry2' },
            fields: {
              key: { 'en-US': 'bye' },
              value: { 'en-US': 'Goodbye' }
            }
          }
        ]
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await fetchAllContentfulItems(validConfig);

      expect(result['hello']).toEqual({ value: 'Hello World', id: 'entry1' });
      expect(result['bye']).toEqual({ value: 'Goodbye', id: 'entry2' });
    });

    it('should skip archived entries', async () => {
      const mockResponse = {
        total: 2,
        items: [
          {
            sys: { id: 'entry1' },
            fields: {
              key: { 'en-US': 'active' },
              value: { 'en-US': 'Active Entry' }
            }
          },
          {
            sys: { id: 'entry2', archivedVersion: 1 },
            fields: {
              key: { 'en-US': 'archived' },
              value: { 'en-US': 'Archived Entry' }
            }
          }
        ]
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await fetchAllContentfulItems(validConfig);

      expect(result['active']).toBeDefined();
      expect(result['archived']).toBeUndefined();
    });

    it('should handle pagination for large datasets', async () => {
      const firstPage = {
        total: 1500,
        items: Array(1000).fill(null).map((_, i) => ({
          sys: { id: `entry${i}` },
          fields: {
            key: { 'en-US': `key${i}` },
            value: { 'en-US': `value${i}` }
          }
        }))
      };
      const secondPage = {
        items: Array(500).fill(null).map((_, i) => ({
          sys: { id: `entry${1000 + i}` },
          fields: {
            key: { 'en-US': `key${1000 + i}` },
            value: { 'en-US': `value${1000 + i}` }
          }
        }))
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(createMockResponse(firstPage))
        .mockResolvedValueOnce(createMockResponse(secondPage));

      const result = await fetchAllContentfulItems(validConfig);

      expect(Object.keys(result)).toHaveLength(1500);
      expect(result['key0']).toBeDefined();
      expect(result['key1499']).toBeDefined();
    });

    it('should throw on HTTP error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse({}, false, 500));

      await expect(fetchAllContentfulItems(validConfig)).rejects.toThrow('Failed to fetch Contentful items');
    });

    it('should use first available locale when en-US is not present', async () => {
      const mockResponse = {
        total: 1,
        items: [
          {
            sys: { id: 'entry1' },
            fields: {
              key: { 'de-DE': 'german_key' },
              value: { 'de-DE': 'German Value' }
            }
          }
        ]
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await fetchAllContentfulItems(validConfig);

      expect(result['german_key']).toEqual({ value: 'German Value', id: 'entry1' });
    });
  });

  describe('saveItemToContentful', () => {
    it('should create a new entry as draft without publishing', async () => {
      const createResponse = {
        sys: { id: 'new-entry', version: 1 }
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(createMockResponse(createResponse)); // create only

      const result = await saveItemToContentful(validConfig, {
        key: 'new_key',
        value: 'New Value'
      });

      expect(result.success).toBe(true);
      // Should only call create, NOT publish
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Verify create call
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/entries'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Contentful-Content-Type': 'translation'
          })
        })
      );

      // Verify publish endpoint was NOT called
      expect(global.fetch).not.toHaveBeenCalledWith(
        expect.stringContaining('/published'),
        expect.anything()
      );
    });

    it('should update an existing entry as draft without publishing', async () => {
      const getResponse = { sys: { id: 'existing-entry', version: 5 } };
      const updateResponse = { sys: { id: 'existing-entry', version: 6 } };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(createMockResponse(getResponse)) // get current version
        .mockResolvedValueOnce(createMockResponse(updateResponse)); // update only

      const result = await saveItemToContentful(validConfig, {
        key: 'existing_key',
        value: 'Updated Value',
        isUpdate: true,
        entryId: 'existing-entry'
      });

      expect(result.success).toBe(true);
      // Should only call get + update, NOT publish
      expect(global.fetch).toHaveBeenCalledTimes(2);

      // Verify update call has version header
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('/entries/existing-entry'),
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'X-Contentful-Version': '5'
          })
        })
      );

      // Verify publish endpoint was NOT called
      expect(global.fetch).not.toHaveBeenCalledWith(
        expect.stringContaining('/published'),
        expect.anything()
      );
    });

    it('should return error when create fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse({ error: 'Bad Request' }, false, 400));

      const result = await saveItemToContentful(validConfig, {
        key: 'new_key',
        value: 'New Value'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Create failed');
      expect(result.errorDetails?.operation).toBe('create');
    });

    it('should return error when fetching entry for update fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse({}, false, 404));

      const result = await saveItemToContentful(validConfig, {
        key: 'existing_key',
        value: 'Updated Value',
        isUpdate: true,
        entryId: 'non-existent'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Could not fetch entry');
      expect(result.errorDetails?.operation).toBe('fetch');
    });

    it('should return error when update fails', async () => {
      const getResponse = { sys: { id: 'existing-entry', version: 5 } };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(createMockResponse(getResponse)) // get succeeds
        .mockResolvedValueOnce(createMockResponse({}, false, 409)); // update fails (conflict)

      const result = await saveItemToContentful(validConfig, {
        key: 'existing_key',
        value: 'Updated Value',
        isUpdate: true,
        entryId: 'existing-entry'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Update failed');
      expect(result.errorDetails?.operation).toBe('update');
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await saveItemToContentful(validConfig, {
        key: 'new_key',
        value: 'New Value'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(result.errorDetails?.exception).toBe('Error');
    });
  });
});
