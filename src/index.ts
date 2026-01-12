// ConteFi - Figma plugin for Contentful-based translations

import { createMessageHandler } from './handlers';
import { loadConfigFromStorage } from './services/config.service';
import { SELECTION_DEBOUNCE_MS } from './constants';

// Initialize UI
figma.showUI(__html__, { width: 800, height: 500, themeColors: true });

// Load all pages to enable documentchange listener
(async () => {
  await figma.loadAllPagesAsync();
})();

// Selection tracking state
let isSelectionTrackingEnabled = false;
let selectionDebounceTimer: ReturnType<typeof setTimeout> | null = null;

// Store the current config for selection tracking
let configData = loadConfigFromStorage();

/**
 * Enable selection tracking after plugin initialization completes
 */
function enableSelectionTracking(): void {
  if (isSelectionTrackingEnabled) return; // Already enabled

  figma.on('selectionchange', () => {
    // Debounce to prevent rapid-fire events during initialization or multi-selection
    if (selectionDebounceTimer) clearTimeout(selectionDebounceTimer);

    selectionDebounceTimer = setTimeout(async () => {
      try {
        if (!figma.currentPage) return;

        const selection = figma.currentPage.selection;

        if (selection.length === 1 && selection[0] && selection[0].type === 'TEXT') {
          const textNode = selection[0] as TextNode;

          // Get current config
          const currentConfig = await configData;

          // Check if node name matches the configured pattern
          if (currentConfig && currentConfig.NODE_NAME_PATTERN) {
            try {
              const pattern = new RegExp(currentConfig.NODE_NAME_PATTERN);
              if (!pattern.test(textNode.name)) {
                // Node name doesn't match pattern - ignore this selection
                return;
              }
            } catch (e) {
              console.warn('Invalid regex pattern in config:', e);
              return;
            }
          }

          // Safely access characters
          let characters = '';
          try {
            characters = textNode.characters;
          } catch (e) {
            console.warn('Could not read text node characters:', e);
            characters = '[Unable to read text]';
          }

          figma.ui.postMessage({
            type: 'text-node-selected',
            nodeName: textNode.name || '[Unnamed]',
            nodeText: characters
          });
        }
      } catch (error) {
        console.error('Selection change handler error:', error);
        // Don't crash the plugin
      }
    }, SELECTION_DEBOUNCE_MS);
  });

  isSelectionTrackingEnabled = true;
}

// Create and set up message handler
const messageHandler = createMessageHandler(enableSelectionTracking);
figma.ui.onmessage = messageHandler;

// Update config when it changes (for selection tracking)
figma.ui.onmessage = async (msg) => {
  // First call the main message handler
  await messageHandler(msg);

  // Update local config reference when config is saved
  if (msg.type === 'save-config' && msg.config) {
    configData = Promise.resolve(msg.config);
  }
};
