/**
 * Contentful configuration for the plugin
 */
export interface ContentfulConfig {
  SPACE_ID: string;
  ENVIRONMENT: string;
  CMA_TOKEN: string;
  CONTENT_TYPE: string;
  KEY_FIELD: string;
  VALUE_FIELD: string;
  NODE_NAME_PATTERN: string;
}
