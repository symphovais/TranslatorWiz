import { ContentfulConfig } from '../types';
import { defaultConfig } from '../constants';

/**
 * Validate configuration - checks all required fields
 * @param config - Configuration to validate
 * @returns Error message or null if valid
 */
export function validateConfig(config: ContentfulConfig): string | null {
  if (!config.SPACE_ID || !config.SPACE_ID.trim()) {
    return 'SPACE_ID is required';
  }
  if (!config.ENVIRONMENT || !config.ENVIRONMENT.trim()) {
    return 'ENVIRONMENT is required';
  }
  if (!config.CMA_TOKEN || !config.CMA_TOKEN.trim()) {
    return 'CMA_TOKEN is required';
  }
  if (!config.CONTENT_TYPE || !config.CONTENT_TYPE.trim()) {
    return 'CONTENT_TYPE is required';
  }
  if (!config.KEY_FIELD || !config.KEY_FIELD.trim()) {
    return 'KEY_FIELD is required';
  }
  if (!config.VALUE_FIELD || !config.VALUE_FIELD.trim()) {
    return 'VALUE_FIELD is required';
  }
  if (!config.NODE_NAME_PATTERN || !config.NODE_NAME_PATTERN.trim()) {
    return 'NODE_NAME_PATTERN is required';
  }

  // Validate regex pattern
  try {
    new RegExp(config.NODE_NAME_PATTERN);
  } catch {
    return `Invalid regex pattern: ${config.NODE_NAME_PATTERN}`;
  }

  return null;
}

/**
 * Merge partial config with defaults
 * @param stored - Partial config from storage
 * @returns Complete config with defaults applied
 */
export function mergeWithDefaults(stored: Partial<ContentfulConfig> | null): ContentfulConfig {
  if (stored && typeof stored === 'object') {
    return { ...defaultConfig, ...stored };
  }
  return { ...defaultConfig };
}

/**
 * Load configuration from Figma client storage
 * @returns Promise resolving to the loaded config
 */
export async function loadConfigFromStorage(): Promise<ContentfulConfig> {
  try {
    const stored = await figma.clientStorage.getAsync('translatorwiz_config');
    return mergeWithDefaults(stored as Partial<ContentfulConfig> | null);
  } catch (e) {
    console.error('Failed to load config from storage:', e);
    return { ...defaultConfig };
  }
}

/**
 * Save configuration to Figma client storage
 * @param config - Configuration to save
 */
export async function saveConfigToStorage(config: ContentfulConfig): Promise<void> {
  try {
    await figma.clientStorage.setAsync('translatorwiz_config', config);
  } catch {
    throw new Error('Failed to save config to storage');
  }
}
