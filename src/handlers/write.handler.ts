import { ContentfulConfig } from '../types/config.types';
import { ContentfulSaveItem } from '../types/contentful.types';
import { fetchAllContentfulItems, saveItemToContentful } from '../services/contentful.service';
import { getTranslatableNodes } from '../services/node.service';

/**
 * Handle get translatable nodes request
 * @param config - Contentful configuration
 */
export function handleGetTranslatableNodes(config: ContentfulConfig | undefined): void {
  if (!config) {
    figma.ui.postMessage({ type: 'error', message: 'Configuration missing' });
    return;
  }

  try {
    const nodes = getTranslatableNodes(config);
    figma.ui.postMessage({ type: 'translatable-nodes-loaded', nodes });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    figma.ui.postMessage({ type: 'error', message: errorMessage });
  }
}

/**
 * Handle get all contentful items request
 * @param config - Contentful configuration
 */
export async function handleGetAllContentfulItems(config: ContentfulConfig | undefined): Promise<void> {
  if (!config) {
    figma.ui.postMessage({ type: 'error', message: 'Configuration missing' });
    return;
  }

  try {
    const items = await fetchAllContentfulItems(config);
    figma.ui.postMessage({ type: 'contentful-items-loaded', items });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    figma.ui.postMessage({ type: 'error', message: errorMessage });
  }
}

/**
 * Handle save contentful item request
 * @param config - Contentful configuration
 * @param item - Item to save
 */
export async function handleSaveContentfulItem(
  config: ContentfulConfig | undefined,
  item: unknown
): Promise<void> {
  if (!config || !item) {
    figma.ui.postMessage({ type: 'error', message: 'Configuration or item missing' });
    return;
  }

  try {
    const itemToSave = item as ContentfulSaveItem;
    const result = await saveItemToContentful(config, itemToSave);

    figma.ui.postMessage({
      type: 'item-saved',
      key: itemToSave.key,
      success: result.success,
      error: result.error,
      errorDetails: result.errorDetails
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error
      ? { exception: error.name, stack: error.stack }
      : { exception: String(error) };
    const itemToSave = item as ContentfulSaveItem;

    figma.ui.postMessage({
      type: 'item-saved',
      key: itemToSave.key,
      success: false,
      error: errorMessage,
      errorDetails
    });
  }
}
