/**
 * Locale information from Contentful
 */
export interface Locale {
  code: string;
  name: string;
}

/**
 * Translation key-value pair
 */
export interface Translation {
  key: string;
  value: string;
}

/**
 * Contentful field definition
 */
export interface ContentfulField {
  id: string;
  name: string;
  type: string;
}

/**
 * Contentful record/entry
 */
export interface ContentfulRecord {
  id: string;
  fields: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Locale item from Contentful API response
 */
export interface ContentfulLocaleItem {
  code: string;
  name: string;
}

/**
 * Translation item from Contentful API response
 */
export interface ContentfulTranslationItem {
  fields: {
    [key: string]: string;
  };
}

/**
 * Item to save to Contentful
 */
export interface ContentfulSaveItem {
  key: string;
  value: string;
  isUpdate?: boolean;
  entryId?: string;
}

/**
 * Result of saving to Contentful
 */
export interface ContentfulSaveResult {
  success: boolean;
  error?: string;
  errorDetails?: {
    status?: number;
    response?: string;
    operation?: string;
    entryId?: string;
    version?: number;
    key?: string;
    exception?: string;
    [key: string]: unknown;
  };
}
