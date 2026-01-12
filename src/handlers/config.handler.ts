import { ContentfulConfig } from '../types/config.types';
import { PLUGIN_VERSION } from '../constants';
import {
  validateConfig,
  loadConfigFromStorage,
  saveConfigToStorage
} from '../services/config.service';
import { fetchLocales, validateContentType } from '../services/contentful.service';
import { getTranslatableNodeCount } from '../services/node.service';

/**
 * Handle plugin initialization
 */
export async function handleInit(): Promise<void> {
  // Load config from storage
  const configData = await loadConfigFromStorage();

  // Always send config to UI (even if incomplete) so UI can show onboarding
  figma.ui.postMessage({ type: 'config-loaded', config: configData, version: PLUGIN_VERSION });

  // Count translatable nodes and send to UI (only if config is valid)
  const configError = validateConfig(configData);
  if (!configError) {
    const nodeCount = getTranslatableNodeCount(configData);
    figma.ui.postMessage({ type: 'node-count', count: nodeCount });
  }
}

/**
 * Handle plugin ready signal - enable selection tracking
 * @param enableSelectionTracking - Function to enable selection tracking
 */
export function handlePluginReady(enableSelectionTracking: () => void): void {
  enableSelectionTracking();
}

/**
 * Handle save config request
 * @param config - Configuration to save
 */
export async function handleSaveConfig(config: ContentfulConfig | undefined): Promise<void> {
  if (!config) {
    figma.ui.postMessage({ type: 'config-save-failed', message: 'No config provided' });
    return;
  }

  // Validate new config
  const configError = validateConfig(config);
  if (configError) {
    figma.ui.postMessage({ type: 'config-save-failed', message: configError });
    return;
  }

  // Save to storage
  await saveConfigToStorage(config);

  figma.ui.postMessage({ type: 'config-saved', config });

  // Update node count with new config
  const nodeCount = getTranslatableNodeCount(config);
  figma.ui.postMessage({ type: 'node-count', count: nodeCount });
}

/**
 * Handle preflight test for locales (validates credentials, space, and environment)
 * @param config - Configuration to test
 */
export async function handlePreflightTestLocales(config: ContentfulConfig | undefined): Promise<void> {
  if (!config) {
    figma.ui.postMessage({
      type: 'preflight-locales-result',
      result: { success: false, error: 'No config provided' }
    });
    return;
  }

  try {
    const locales = await fetchLocales(config);

    if (locales.length === 0) {
      throw new Error('No locales found');
    }

    figma.ui.postMessage({
      type: 'preflight-locales-result',
      result: { success: true, message: `Found ${locales.length} locale(s)` }
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to fetch locales';
    figma.ui.postMessage({
      type: 'preflight-locales-result',
      result: { success: false, error: errorMsg }
    });
  }
}

/**
 * Handle preflight check for content type and fields
 * @param config - Configuration to check
 */
export async function handlePreflightCheckContent(config: ContentfulConfig | undefined): Promise<void> {
  if (!config) {
    figma.ui.postMessage({
      type: 'preflight-content-result',
      result: { success: false, error: 'No config provided' }
    });
    return;
  }

  const result = await validateContentType(config);

  if (result.success) {
    figma.ui.postMessage({
      type: 'preflight-content-result',
      result: { success: true, message: 'Content type validated' }
    });
  } else {
    figma.ui.postMessage({
      type: 'preflight-content-result',
      result: { success: false, error: result.error }
    });
  }
}
