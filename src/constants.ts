import { ContentfulConfig } from './types';

/**
 * Plugin version - must match version in package.json
 */
export const PLUGIN_VERSION = "2.0.0";

/**
 * Network timeout for API calls (10 seconds)
 */
export const API_TIMEOUT = 10000;

/**
 * Debounce time for selection events (milliseconds)
 */
export const SELECTION_DEBOUNCE_MS = 300;

/**
 * Threshold for duplicate message detection (milliseconds)
 */
export const DUPLICATE_THRESHOLD_MS = 200;

/**
 * Default configuration values
 */
export const defaultConfig: ContentfulConfig = {
  SPACE_ID: "",
  ENVIRONMENT: "master",
  CMA_TOKEN: "",
  CONTENT_TYPE: "translation",
  KEY_FIELD: "key",
  VALUE_FIELD: "value",
  NODE_NAME_PATTERN: "^jams_"
};
