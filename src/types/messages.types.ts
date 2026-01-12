import { ContentfulConfig } from './config.types';
import { FieldMapping } from './figma.types';

/**
 * Message sent from UI to plugin backend
 */
export interface UIMessage {
  type: string;
  config?: ContentfulConfig;
  locale?: string;
  contentType?: string;
  contentTypes?: string[];
  mappings?: FieldMapping[];
  recordFields?: Record<string, unknown>;
  item?: unknown;
  items?: unknown[];
  nodeId?: string;
  nodeIds?: string[];
  newText?: string;
  width?: number;
  height?: number;
  isCompact?: boolean;
  [key: string]: unknown;
}

/**
 * Fetch options for network requests
 */
export interface FetchOptions {
  headers?: Record<string, string>;
  method?: string;
  body?: string;
}
