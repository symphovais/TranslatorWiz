import { ContentfulConfig } from '../types/config.types';
import {
  Locale,
  Translation,
  ContentfulLocaleItem,
  ContentfulTranslationItem,
  ContentfulField,
  ContentfulSaveItem,
  ContentfulSaveResult
} from '../types/contentful.types';
import { API_TIMEOUT } from '../constants';
import { fetchWithTimeout } from './network.service';

/**
 * Fetch available locales from Contentful
 * @param config - Contentful configuration
 * @returns Array of locale objects with code and name
 */
export async function fetchLocales(config: ContentfulConfig): Promise<Locale[]> {
  const spaceId = encodeURIComponent(config.SPACE_ID);
  const environment = encodeURIComponent(config.ENVIRONMENT);
  const url = `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/locales`;
  const options = {
    headers: {
      'Authorization': `Bearer ${config.CMA_TOKEN}`
    }
  };

  try {
    const response = await fetchWithTimeout(url, options, API_TIMEOUT);

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Invalid API credentials');
      }
      if (response.status === 404) {
        throw new Error('Space or environment not found');
      }
      throw new Error('Failed to fetch locales');
    }

    const data = await response.json();

    if (!data.items || !Array.isArray(data.items)) {
      throw new Error('Invalid response format');
    }

    return data.items
      .map((item: ContentfulLocaleItem) => ({
        code: (item && typeof item.code === 'string') ? item.code : '',
        name: (item && typeof item.name === 'string') ? item.name : ''
      }))
      .filter((item: Locale) => item.code.trim() !== '' && item.name.trim() !== '');
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load locales: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Fetch translations for a specific locale from Contentful
 * @param config - Contentful configuration
 * @param locale - Locale code to fetch translations for
 * @returns Array of translation key-value pairs
 */
export async function fetchTranslations(config: ContentfulConfig, locale: string): Promise<Translation[]> {
  // Validate and sanitize locale input
  if (!locale || typeof locale !== 'string' || locale.trim() === '') {
    throw new Error('Invalid locale');
  }

  const spaceId = encodeURIComponent(config.SPACE_ID);
  const environment = encodeURIComponent(config.ENVIRONMENT);
  const contentType = encodeURIComponent(config.CONTENT_TYPE);
  const localeParam = encodeURIComponent(locale.trim());

  const url = `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/entries?content_type=${contentType}&locale=${localeParam}`;
  const options = {
    headers: {
      'Authorization': `Bearer ${config.CMA_TOKEN}`
    }
  };

  try {
    const response = await fetchWithTimeout(url, options, API_TIMEOUT);

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Invalid API credentials');
      }
      if (response.status === 404) {
        throw new Error('Content type not found');
      }
      throw new Error('Failed to fetch translations');
    }

    const data = await response.json();

    if (!data.items || !Array.isArray(data.items)) {
      throw new Error('Invalid response format');
    }

    return data.items
      .map((item: ContentfulTranslationItem) => {
        const fields = (item && typeof item.fields === 'object') ? item.fields : {};
        return {
          key: (typeof fields[config.KEY_FIELD] === 'string') ? fields[config.KEY_FIELD] : '',
          value: (typeof fields[config.VALUE_FIELD] === 'string') ? fields[config.VALUE_FIELD] : ''
        };
      })
      .filter((t: Translation) => t.key.trim() !== '' && t.value.trim() !== '');
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load translations: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Fetch all content types from Contentful
 * @param config - Contentful configuration
 * @returns Array of content type objects
 */
export async function fetchContentTypes(config: ContentfulConfig): Promise<unknown[]> {
  const spaceId = encodeURIComponent(config.SPACE_ID);
  const environment = encodeURIComponent(config.ENVIRONMENT);
  const url = `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/content_types`;
  const options = {
    headers: {
      'Authorization': `Bearer ${config.CMA_TOKEN}`
    }
  };

  try {
    const response = await fetchWithTimeout(url, options, API_TIMEOUT);

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Invalid API credentials');
      }
      if (response.status === 404) {
        throw new Error('Space or environment not found');
      }
      throw new Error('Failed to fetch content types');
    }

    const data = await response.json();

    if (!data.items || !Array.isArray(data.items)) {
      throw new Error('Invalid response format');
    }

    return data.items;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load content types: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Fetch records/entries for a specific content type
 * @param config - Contentful configuration
 * @param contentType - Content type ID to fetch records for
 * @returns Array of record objects
 */
export async function fetchRecords(config: ContentfulConfig, contentType: string): Promise<unknown[]> {
  const spaceId = encodeURIComponent(config.SPACE_ID);
  const environment = encodeURIComponent(config.ENVIRONMENT);
  const contentTypeParam = encodeURIComponent(contentType);

  const url = `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/entries?content_type=${contentTypeParam}&limit=100`;
  const options = {
    headers: {
      'Authorization': `Bearer ${config.CMA_TOKEN}`
    }
  };

  try {
    const response = await fetchWithTimeout(url, options, API_TIMEOUT);

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Invalid API credentials');
      }
      if (response.status === 404) {
        throw new Error('Content type not found');
      }
      throw new Error('Failed to fetch records');
    }

    const data = await response.json();

    if (!data.items || !Array.isArray(data.items)) {
      throw new Error('Invalid response format');
    }

    return data.items;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load records: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Validate content type and its required fields
 * @param config - Contentful configuration
 * @returns Object with validation result
 */
export async function validateContentType(config: ContentfulConfig): Promise<{ success: boolean; error?: string }> {
  const spaceId = encodeURIComponent(config.SPACE_ID);
  const environment = encodeURIComponent(config.ENVIRONMENT);
  const contentType = encodeURIComponent(config.CONTENT_TYPE);
  const url = `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/content_types/${contentType}`;
  const options = {
    headers: {
      'Authorization': `Bearer ${config.CMA_TOKEN}`
    }
  };

  try {
    const response = await fetchWithTimeout(url, options, API_TIMEOUT);

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: 'Content type not found' };
      }
      return { success: false, error: 'Content type check failed' };
    }

    const data = await response.json();

    // Verify required fields exist
    const fields = Array.isArray(data.fields) ? data.fields : [];
    const fieldNames = fields.map((f: ContentfulField) => (f && typeof f.id === 'string') ? f.id : '');

    if (!fieldNames.includes(config.KEY_FIELD)) {
      return { success: false, error: 'Key field not found in content type' };
    }
    if (!fieldNames.includes(config.VALUE_FIELD)) {
      return { success: false, error: 'Value field not found in content type' };
    }

    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Content type check failed';
    return { success: false, error: errorMsg };
  }
}

/**
 * Fetch all Contentful items with pagination support
 * @param config - Contentful configuration
 * @returns Object mapping keys to values and entry IDs
 */
export async function fetchAllContentfulItems(config: ContentfulConfig): Promise<Record<string, { value: string; id: string }>> {
  const spaceId = encodeURIComponent(config.SPACE_ID);
  const environment = encodeURIComponent(config.ENVIRONMENT);
  const contentType = encodeURIComponent(config.CONTENT_TYPE);

  const limit = 1000; // Contentful max per request

  const options = {
    headers: {
      'Authorization': `Bearer ${config.CMA_TOKEN}`
    }
  };

  try {
    // Fetch first page to get total count
    const firstUrl = `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/entries?content_type=${contentType}&limit=${limit}`;
    const firstResponse = await fetchWithTimeout(firstUrl, options, API_TIMEOUT);

    if (!firstResponse.ok) {
      throw new Error(`HTTP ${firstResponse.status}: ${firstResponse.statusText}`);
    }

    const firstData = await firstResponse.json();
    const total = firstData.total || 0;

    const allPages = [firstData];

    // Fetch remaining pages if needed
    if (total > limit) {
      const remainingPages = Math.ceil((total - limit) / limit);
      const pageRequests = [];

      for (let page = 1; page <= remainingPages; page++) {
        const skip = page * limit;
        const pageUrl = `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/entries?content_type=${contentType}&limit=${limit}&skip=${skip}`;

        pageRequests.push(
          fetchWithTimeout(pageUrl, options, API_TIMEOUT)
            .then(r => r.json())
            .catch(err => {
              console.error(`Failed to fetch page ${page}:`, err);
              return { items: [] };
            })
        );
      }

      const remainingData = await Promise.all(pageRequests);
      allPages.push(...remainingData);
    }

    // Process all items from all pages
    const items: Record<string, { value: string; id: string }> = {};

    for (const pageData of allPages) {
      if (pageData.items && Array.isArray(pageData.items)) {
        for (const item of pageData.items) {
          // Skip archived entries only (unpublished entries are OK)
          if (item.sys.archivedVersion !== undefined) {
            continue;
          }

          const fields = item.fields || {};

          // Simple locale extraction
          const keyField = fields[config.KEY_FIELD];
          const valueField = fields[config.VALUE_FIELD];

          let key: string | null = null;
          let value: string | null = null;

          if (keyField && typeof keyField === 'object') {
            key = keyField['en-US'] || keyField[Object.keys(keyField)[0]];
          }

          if (valueField && typeof valueField === 'object') {
            value = valueField['en-US'] || valueField[Object.keys(valueField)[0]];
          }

          if (key && value) {
            items[key] = {
              value: value,
              id: item.sys.id
            };
          }
        }
      }
    }

    return items;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch Contentful items: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Save an item to Contentful (create or update)
 * @param config - Contentful configuration
 * @param item - Item to save with key, value, and optional update info
 * @returns Result object with success status and any errors
 */
export async function saveItemToContentful(config: ContentfulConfig, item: ContentfulSaveItem): Promise<ContentfulSaveResult> {
  const spaceId = encodeURIComponent(config.SPACE_ID);
  const environment = encodeURIComponent(config.ENVIRONMENT);
  const contentType = config.CONTENT_TYPE;

  try {
    if (item.isUpdate && item.entryId) {
      // Update existing entry
      const url = `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/entries/${item.entryId}`;

      // First, get the current entry to get the version
      const getResponse = await fetchWithTimeout(url, {
        headers: {
          'Authorization': `Bearer ${config.CMA_TOKEN}`
        }
      }, API_TIMEOUT);

      if (!getResponse.ok) {
        const errorText = await getResponse.text();
        console.error('[Contentful] Failed to fetch entry for update:', errorText);
        return {
          success: false,
          error: `Could not fetch entry (${getResponse.status})`,
          errorDetails: { status: getResponse.status, response: errorText, operation: 'fetch', entryId: item.entryId }
        };
      }

      const currentEntry = await getResponse.json();
      const version = currentEntry.sys.version;

      // Update the entry
      const updateResponse = await fetchWithTimeout(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${config.CMA_TOKEN}`,
          'Content-Type': 'application/vnd.contentful.management.v1+json',
          'X-Contentful-Version': version.toString()
        },
        body: JSON.stringify({
          fields: {
            [config.KEY_FIELD]: { 'en-US': item.key },
            [config.VALUE_FIELD]: { 'en-US': item.value }
          }
        })
      }, API_TIMEOUT);

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('[Contentful] Update failed:', errorText);
        return {
          success: false,
          error: `Update failed (${updateResponse.status})`,
          errorDetails: { status: updateResponse.status, response: errorText, operation: 'update', entryId: item.entryId, version }
        };
      }

      // Publish the updated entry
      const updatedEntry = await updateResponse.json();
      const publishUrl = `${url}/published`;
      const publishResponse = await fetchWithTimeout(publishUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${config.CMA_TOKEN}`,
          'X-Contentful-Version': updatedEntry.sys.version.toString()
        }
      }, API_TIMEOUT);

      if (!publishResponse.ok) {
        const errorText = await publishResponse.text();
        console.error('[Contentful] Publish failed:', errorText);
        return {
          success: false,
          error: `Publish failed (${publishResponse.status})`,
          errorDetails: { status: publishResponse.status, response: errorText, operation: 'publish', entryId: item.entryId }
        };
      }

      return { success: true };
    } else {
      // Create new entry
      const url = `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/entries`;

      const createResponse = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.CMA_TOKEN}`,
          'Content-Type': 'application/vnd.contentful.management.v1+json',
          'X-Contentful-Content-Type': contentType
        },
        body: JSON.stringify({
          fields: {
            [config.KEY_FIELD]: { 'en-US': item.key },
            [config.VALUE_FIELD]: { 'en-US': item.value }
          }
        })
      }, API_TIMEOUT);

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('[Contentful] Create failed:', errorText);
        return {
          success: false,
          error: `Create failed (${createResponse.status})`,
          errorDetails: { status: createResponse.status, response: errorText, operation: 'create', key: item.key }
        };
      }

      // Publish the new entry
      const newEntry = await createResponse.json();
      const publishUrl = `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/entries/${newEntry.sys.id}/published`;
      const publishResponse = await fetchWithTimeout(publishUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${config.CMA_TOKEN}`,
          'X-Contentful-Version': newEntry.sys.version.toString()
        }
      }, API_TIMEOUT);

      if (!publishResponse.ok) {
        const errorText = await publishResponse.text();
        console.error('[Contentful] Publish after create failed:', errorText);
        return {
          success: false,
          error: `Created but publish failed (${publishResponse.status})`,
          errorDetails: { status: publishResponse.status, response: errorText, operation: 'publish-new', entryId: newEntry.sys.id }
        };
      }

      return { success: true };
    }
  } catch (error) {
    console.error('[Contentful] Exception:', error);
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
        errorDetails: { exception: error.name, stack: error.stack, operation: item.isUpdate ? 'update' : 'create' }
      };
    }
    return {
      success: false,
      error: 'Unknown error occurred',
      errorDetails: { exception: String(error) }
    };
  }
}
