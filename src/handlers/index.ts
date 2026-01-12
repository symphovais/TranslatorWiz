import { UIMessage } from '../types/messages.types';
import {
  handleInit,
  handlePluginReady,
  handleSaveConfig,
  handlePreflightTestLocales,
  handlePreflightCheckContent
} from './config.handler';
import {
  handleLoadContentTypes,
  handleGetTextNodes,
  handleLoadRecords,
  handleLoadMultipleRecords,
  handleApplyRecordToNodes
} from './content.handler';
import {
  handleGetTranslatableNodes,
  handleGetAllContentfulItems,
  handleSaveContentfulItem
} from './write.handler';
import {
  handleGetWindowSizeState,
  handleResizeWindow,
  handleUpdateMultipleNodes,
  handleSelectNode,
  handleCancel
} from './ui.handler';

// Track last message to prevent duplicate processing
let lastMessageType: string | null = null;
let lastMessageTime: number = 0;
const DUPLICATE_THRESHOLD_MS = 200;

/**
 * Create the main message handler for the plugin
 * @param enableSelectionTracking - Function to enable selection tracking
 * @returns Message handler function
 */
export function createMessageHandler(enableSelectionTracking: () => void) {
  return async (msg: UIMessage): Promise<void> => {
    const handlerStartTime = Date.now();

    // Prevent duplicate processing of the same message type within 200ms
    const timeSinceLastMessage = handlerStartTime - lastMessageTime;
    if (msg?.type === lastMessageType && timeSinceLastMessage < DUPLICATE_THRESHOLD_MS) {
      return;
    }

    lastMessageType = msg?.type;
    lastMessageTime = handlerStartTime;

    try {
      // Validate message structure
      if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') {
        console.error('Invalid message format:', msg);
        return;
      }

      // Route message to appropriate handler
      switch (msg.type) {
        // Config handlers
        case 'init':
          await handleInit();
          break;

        case 'plugin-ready':
          handlePluginReady(enableSelectionTracking);
          break;

        case 'save-config':
          await handleSaveConfig(msg.config);
          break;

        case 'preflight-test-locales':
          await handlePreflightTestLocales(msg.config);
          break;

        case 'preflight-check-content':
          await handlePreflightCheckContent(msg.config);
          break;

        // Content handlers
        case 'load-content-types':
          await handleLoadContentTypes(msg.config);
          break;

        case 'get-text-nodes':
          handleGetTextNodes();
          break;

        case 'load-records':
          await handleLoadRecords(msg.config, msg.contentType);
          break;

        case 'load-multiple-records':
          await handleLoadMultipleRecords(msg.config, msg.contentTypes);
          break;

        case 'apply-record-to-nodes':
          await handleApplyRecordToNodes(msg.mappings, msg.recordFields);
          break;

        // Write handlers
        case 'get-translatable-nodes':
          handleGetTranslatableNodes(msg.config);
          break;

        case 'get-all-contentful-items':
          await handleGetAllContentfulItems(msg.config);
          break;

        case 'save-contentful-item':
          await handleSaveContentfulItem(msg.config, msg.item);
          break;

        // UI handlers
        case 'get-window-size-state':
          await handleGetWindowSizeState();
          break;

        case 'resize-window':
          await handleResizeWindow(msg.width, msg.height, msg.isCompact);
          break;

        case 'update-multiple-nodes':
          await handleUpdateMultipleNodes(msg.nodeIds, msg.newText);
          break;

        case 'select-node':
          await handleSelectNode(msg.nodeId);
          break;

        case 'cancel':
          handleCancel();
          break;

        default:
          console.warn('Unknown message type:', msg.type);
      }
    } catch (error) {
      console.error('Message handler error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Send error to UI
      try {
        figma.ui.postMessage({ type: 'error', message: errorMessage });
      } catch (postError) {
        console.error('Failed to send error to UI:', postError);
      }
    }
  };
}

// Re-export individual handlers for testing
export * from './config.handler';
export * from './content.handler';
export * from './write.handler';
export * from './ui.handler';
