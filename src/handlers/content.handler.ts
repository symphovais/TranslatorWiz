import { ContentfulConfig } from '../types/config.types';
import { ContentfulRecord } from '../types/contentful.types';
import { FieldMapping } from '../types/figma.types';
import { fetchContentTypes, fetchRecords } from '../services/contentful.service';
import { getAllTextNodes, applyRecordToNodes } from '../services/node.service';

/**
 * Handle load content types request
 * @param config - Contentful configuration
 */
export async function handleLoadContentTypes(config: ContentfulConfig | undefined): Promise<void> {
  if (!config) {
    figma.ui.postMessage({ type: 'error', message: 'Configuration missing' });
    return;
  }

  try {
    const contentTypes = await fetchContentTypes(config);
    figma.ui.postMessage({ type: 'content-types-loaded', contentTypes });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    figma.ui.postMessage({ type: 'error', message: errorMessage });
  }
}

/**
 * Handle get text nodes request
 */
export function handleGetTextNodes(): void {
  try {
    const textNodes = getAllTextNodes();
    figma.ui.postMessage({ type: 'text-nodes-loaded', nodes: textNodes });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    figma.ui.postMessage({ type: 'error', message: errorMessage });
  }
}

/**
 * Handle load records request
 * @param config - Contentful configuration
 * @param contentType - Content type to load records for
 */
export async function handleLoadRecords(
  config: ContentfulConfig | undefined,
  contentType: string | undefined
): Promise<void> {
  if (!config || !contentType) {
    figma.ui.postMessage({ type: 'error', message: 'Configuration or content type missing' });
    return;
  }

  try {
    const records = await fetchRecords(config, contentType);
    figma.ui.postMessage({ type: 'records-loaded', records });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    figma.ui.postMessage({ type: 'error', message: errorMessage });
  }
}

/**
 * Handle load multiple records request
 * @param config - Contentful configuration
 * @param contentTypes - Array of content types to load records for
 */
export async function handleLoadMultipleRecords(
  config: ContentfulConfig | undefined,
  contentTypes: string[] | undefined
): Promise<void> {
  if (!config || !contentTypes) {
    figma.ui.postMessage({ type: 'error', message: 'Configuration or content types missing' });
    return;
  }

  try {
    const recordsByContentType: Record<string, ContentfulRecord[]> = {};

    // Load records from each content type
    for (const contentType of contentTypes) {
      const records = await fetchRecords(config, contentType) as ContentfulRecord[];
      recordsByContentType[contentType] = records;
    }

    figma.ui.postMessage({ type: 'multiple-records-loaded', recordsByContentType });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    figma.ui.postMessage({ type: 'error', message: errorMessage });
  }
}

/**
 * Handle apply record to nodes request
 * @param mappings - Field-to-node mappings
 * @param recordFields - Record field values to apply
 */
export async function handleApplyRecordToNodes(
  mappings: FieldMapping[] | undefined,
  recordFields: Record<string, unknown> | undefined
): Promise<void> {
  if (!mappings || !recordFields) {
    figma.ui.postMessage({ type: 'error', message: 'Mappings or record data missing' });
    return;
  }

  try {
    await applyRecordToNodes(mappings, recordFields);
    figma.ui.postMessage({ type: 'record-applied' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    figma.ui.postMessage({ type: 'error', message: errorMessage });
  }
}
