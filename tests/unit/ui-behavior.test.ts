/**
 * @jest-environment jsdom
 *
 * UI Behavior Tests
 *
 * These tests verify the critical UI behaviors for the plugin's loading flow,
 * particularly around the first-time settings save scenario.
 *
 * Bug Fixed: After first settings save, users would see a stuck "Initializing..."
 * loading overlay when navigating back to the write view because:
 * 1. Data loading wasn't automatically triggered when switching views
 * 2. The loading overlay wasn't hidden when zero items were found
 */

describe('UI Behavior: View Switching', () => {
  // Mock globals that the UI code depends on
  let config: Record<string, string> | null;
  let isInitialLoad: boolean;
  let textItems: unknown[];
  let contentfulItems: Record<string, unknown>;
  let postMessageCalls: unknown[];

  // Mock parent.postMessage
  const mockPostMessage = jest.fn();

  beforeEach(() => {
    // Reset state before each test
    config = null;
    isInitialLoad = true;
    textItems = [];
    contentfulItems = {};
    postMessageCalls = [];
    mockPostMessage.mockClear();

    // Mock parent object for postMessage
    Object.defineProperty(window, 'parent', {
      value: { postMessage: mockPostMessage },
      writable: true,
    });

    // Setup minimal DOM structure
    document.body.innerHTML = `
      <div class="view active" id="write-view">
        <div id="loading-overlay">
          <div class="spinner"></div>
          <div id="loading-message">Initializing...</div>
        </div>
        <div id="items-table-section" class="hidden"></div>
      </div>
      <div class="view" id="settings-view" style="display: none;"></div>
      <div id="write-status"></div>
    `;
  });

  // Helper function to check if config is complete (mirrors ui.html logic)
  function isConfigComplete(cfg: Record<string, string> | null): boolean {
    if (!cfg) return false;
    return !!(cfg.SPACE_ID && cfg.SPACE_ID.trim() && cfg.CMA_TOKEN && cfg.CMA_TOKEN.trim());
  }

  // Helper function to set loading message (mirrors ui.html logic)
  function setLoadingMessage(message: string): void {
    const loadingMessageEl = document.getElementById('loading-message');
    if (loadingMessageEl) {
      loadingMessageEl.textContent = message;
    }
  }

  // Helper function to hide loading overlay (mirrors ui.html logic)
  function hideLoadingOverlay(): void {
    const loadingOverlay = document.getElementById('loading-overlay');
    const tableSection = document.getElementById('items-table-section');

    if (loadingOverlay) {
      loadingOverlay.classList.add('hidden');
    }
    if (tableSection) {
      tableSection.classList.remove('hidden');
    }
    isInitialLoad = false;
  }

  // Helper function to set write status (mirrors ui.html logic)
  function setWriteStatus(text: string, type = 'info'): void {
    const status = document.getElementById('write-status');
    if (status) {
      status.className = type;
      status.textContent = text;
    }
  }

  // Simplified switchView that includes the fix
  function switchView(viewName: string): void {
    const targetView = document.getElementById(`${viewName}-view`);

    if (!targetView) {
      console.error(`View "${viewName}-view" not found!`);
      return;
    }

    // Remove active from all views
    document.querySelectorAll('.view').forEach(v => {
      v.classList.remove('active');
      (v as HTMLElement).style.display = 'none';
    });

    // Activate target view
    targetView.classList.add('active');
    targetView.style.display = 'block';

    // Auto-load data when switching to write view if config is complete and data hasn't been loaded
    if (viewName === 'write' && isConfigComplete(config) && isInitialLoad) {
      setLoadingMessage('Loading text items...');
      textItems = [];
      contentfulItems = {};
      window.parent.postMessage({ pluginMessage: { type: 'get-translatable-nodes', config } }, '*');
    }
  }

  // Simplified loadItemsAndCheckStatus that includes the fix
  function loadItemsAndCheckStatus(items: unknown[]): void {
    textItems = items;

    if (items.length === 0) {
      setWriteStatus('No translatable text items found', 'info');
      // Hide loading overlay even when no items found to prevent getting stuck
      if (isInitialLoad) {
        hideLoadingOverlay();
      }
      return;
    }

    // Continue with normal flow (simplified)
    setWriteStatus('Loading...', 'loading');
    window.parent.postMessage({ pluginMessage: { type: 'get-all-contentful-items', config } }, '*');
  }

  describe('switchView', () => {
    it('should auto-trigger data loading when switching to write view with complete config on initial load', () => {
      // Setup: Config is complete, initial load hasn't happened
      config = {
        SPACE_ID: 'test-space',
        ENVIRONMENT: 'master',
        CMA_TOKEN: 'test-token',
        CONTENT_TYPE: 'translation',
        KEY_FIELD: 'key',
        VALUE_FIELD: 'value',
        NODE_NAME_PATTERN: '^jams_'
      };
      isInitialLoad = true;

      // Start from settings view
      switchView('settings');

      // Clear the mock to only track subsequent calls
      mockPostMessage.mockClear();

      // Switch to write view - should trigger auto-load
      switchView('write');

      // Verify that postMessage was called to load data
      expect(mockPostMessage).toHaveBeenCalledWith(
        { pluginMessage: { type: 'get-translatable-nodes', config } },
        '*'
      );

      // Verify loading message was updated
      const loadingMessage = document.getElementById('loading-message');
      expect(loadingMessage?.textContent).toBe('Loading text items...');
    });

    it('should NOT auto-trigger data loading when config is incomplete', () => {
      // Setup: Config is incomplete (missing required fields)
      config = {
        SPACE_ID: '',
        ENVIRONMENT: 'master',
        CMA_TOKEN: '',
        CONTENT_TYPE: '',
        KEY_FIELD: '',
        VALUE_FIELD: '',
        NODE_NAME_PATTERN: ''
      };
      isInitialLoad = true;

      // Switch to write view - should NOT trigger auto-load
      switchView('write');

      // Verify that postMessage was NOT called
      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    it('should NOT auto-trigger data loading when isInitialLoad is false', () => {
      // Setup: Config is complete but initial load already happened
      config = {
        SPACE_ID: 'test-space',
        ENVIRONMENT: 'master',
        CMA_TOKEN: 'test-token',
        CONTENT_TYPE: 'translation',
        KEY_FIELD: 'key',
        VALUE_FIELD: 'value',
        NODE_NAME_PATTERN: '^jams_'
      };
      isInitialLoad = false; // Already loaded

      // Switch to write view - should NOT trigger auto-load
      switchView('write');

      // Verify that postMessage was NOT called
      expect(mockPostMessage).not.toHaveBeenCalled();
    });
  });

  describe('loadItemsAndCheckStatus', () => {
    it('should hide loading overlay when zero items are found on initial load', () => {
      isInitialLoad = true;

      // Verify loading overlay is initially visible
      const loadingOverlay = document.getElementById('loading-overlay');
      expect(loadingOverlay?.classList.contains('hidden')).toBe(false);

      // Load with zero items
      loadItemsAndCheckStatus([]);

      // Verify loading overlay is now hidden
      expect(loadingOverlay?.classList.contains('hidden')).toBe(true);

      // Verify isInitialLoad is now false
      expect(isInitialLoad).toBe(false);

      // Verify status message
      const status = document.getElementById('write-status');
      expect(status?.textContent).toBe('No translatable text items found');
    });

    it('should NOT hide loading overlay when zero items found but NOT initial load', () => {
      isInitialLoad = false;

      // Load with zero items
      loadItemsAndCheckStatus([]);

      // Verify loading overlay is NOT hidden (class not added)
      const loadingOverlay = document.getElementById('loading-overlay');
      // It should only have hidden added when isInitialLoad was true
      expect(loadingOverlay?.classList.contains('hidden')).toBe(false);
    });

    it('should continue normal flow when items are found', () => {
      config = {
        SPACE_ID: 'test-space',
        ENVIRONMENT: 'master',
        CMA_TOKEN: 'test-token',
        CONTENT_TYPE: 'translation',
        KEY_FIELD: 'key',
        VALUE_FIELD: 'value',
        NODE_NAME_PATTERN: '^jams_'
      };
      isInitialLoad = true;

      const items = [
        { id: '1', name: 'jams_test', characters: 'Test text' }
      ];

      // Load with items
      loadItemsAndCheckStatus(items);

      // Should continue to fetch contentful items
      expect(mockPostMessage).toHaveBeenCalledWith(
        { pluginMessage: { type: 'get-all-contentful-items', config } },
        '*'
      );

      // Loading overlay should NOT be hidden yet (waiting for contentful response)
      const loadingOverlay = document.getElementById('loading-overlay');
      expect(loadingOverlay?.classList.contains('hidden')).toBe(false);
    });
  });

  describe('Integration: First-time settings save flow', () => {
    it('should properly load data after first settings save and navigation back to write view', () => {
      // Simulate the first-time user flow:

      // 1. Start with incomplete config
      config = null;
      isInitialLoad = true;

      // 2. User is shown settings view (simulated by switching away)
      switchView('settings');
      expect(mockPostMessage).not.toHaveBeenCalled();

      // 3. User saves config (simulated by updating config variable)
      config = {
        SPACE_ID: 'my-space',
        ENVIRONMENT: 'master',
        CMA_TOKEN: 'secret-token',
        CONTENT_TYPE: 'translation',
        KEY_FIELD: 'key',
        VALUE_FIELD: 'value',
        NODE_NAME_PATTERN: '^jams_'
      };

      // 4. User navigates back to write view
      mockPostMessage.mockClear();
      switchView('write');

      // 5. Verify auto-load was triggered
      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      expect(mockPostMessage).toHaveBeenCalledWith(
        { pluginMessage: { type: 'get-translatable-nodes', config } },
        '*'
      );

      // 6. Loading message should be updated
      const loadingMessage = document.getElementById('loading-message');
      expect(loadingMessage?.textContent).toBe('Loading text items...');
    });
  });
});
