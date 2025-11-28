import {
  resetMocks,
  mockFetchResponse,
  getPostedMessages,
  getLastPostedMessage,
  figmaMock,
  mockFetch,
  setMockStorage,
  createMockTextNode,
  mockFetchResponses,
} from './setup';

// Import the compiled JS code (this will execute the code with mocked figma)
// Note: The onmessage handler is set on figma.ui
beforeAll(() => {
  // Load the compiled JavaScript module (not TypeScript - avoids type checking issues)
  require('../code.js');
});

describe('ConteFi Plugin Tests', () => {
  beforeEach(() => {
    resetMocks();
  });

  // Helper to send a message to the plugin
  async function sendMessage(msg: any): Promise<void> {
    const handler = (figmaMock.ui as any).onmessage;
    if (handler) {
      await handler(msg);
    }
  }

  // Valid config for testing
  const validConfig = {
    SPACE_ID: 'test-space',
    ENVIRONMENT: 'master',
    CMA_TOKEN: 'test-token',
    CONTENT_TYPE: 'translation',
    KEY_FIELD: 'key',
    VALUE_FIELD: 'value',
    NODE_NAME_PATTERN: '^jams_',
  };

  // ==================== validateConfig Tests ====================
  describe('validateConfig (via save-config)', () => {
    it('should reject config with missing SPACE_ID', async () => {
      await sendMessage({
        type: 'save-config',
        config: { ...validConfig, SPACE_ID: '' },
      });

      const result = getLastPostedMessage();
      expect(result.type).toBe('config-save-failed');
      expect(result.message).toContain('SPACE_ID');
    });

    it('should reject config with whitespace-only SPACE_ID', async () => {
      await sendMessage({
        type: 'save-config',
        config: { ...validConfig, SPACE_ID: '   ' },
      });

      const result = getLastPostedMessage();
      expect(result.type).toBe('config-save-failed');
      expect(result.message).toContain('SPACE_ID');
    });

    it('should reject config with missing ENVIRONMENT', async () => {
      await sendMessage({
        type: 'save-config',
        config: { ...validConfig, ENVIRONMENT: '' },
      });

      const result = getLastPostedMessage();
      expect(result.type).toBe('config-save-failed');
      expect(result.message).toContain('ENVIRONMENT');
    });

    it('should reject config with missing CMA_TOKEN', async () => {
      await sendMessage({
        type: 'save-config',
        config: { ...validConfig, CMA_TOKEN: '' },
      });

      const result = getLastPostedMessage();
      expect(result.type).toBe('config-save-failed');
      expect(result.message).toContain('CMA_TOKEN');
    });

    it('should reject config with missing CONTENT_TYPE', async () => {
      await sendMessage({
        type: 'save-config',
        config: { ...validConfig, CONTENT_TYPE: '' },
      });

      const result = getLastPostedMessage();
      expect(result.type).toBe('config-save-failed');
      expect(result.message).toContain('CONTENT_TYPE');
    });

    it('should reject config with missing KEY_FIELD', async () => {
      await sendMessage({
        type: 'save-config',
        config: { ...validConfig, KEY_FIELD: '' },
      });

      const result = getLastPostedMessage();
      expect(result.type).toBe('config-save-failed');
      expect(result.message).toContain('KEY_FIELD');
    });

    it('should reject config with missing VALUE_FIELD', async () => {
      await sendMessage({
        type: 'save-config',
        config: { ...validConfig, VALUE_FIELD: '' },
      });

      const result = getLastPostedMessage();
      expect(result.type).toBe('config-save-failed');
      expect(result.message).toContain('VALUE_FIELD');
    });

    it('should reject config with missing NODE_NAME_PATTERN', async () => {
      await sendMessage({
        type: 'save-config',
        config: { ...validConfig, NODE_NAME_PATTERN: '' },
      });

      const result = getLastPostedMessage();
      expect(result.type).toBe('config-save-failed');
      expect(result.message).toContain('NODE_NAME_PATTERN');
    });

    it('should reject config with invalid regex pattern', async () => {
      await sendMessage({
        type: 'save-config',
        config: { ...validConfig, NODE_NAME_PATTERN: '[invalid(' },
      });

      const result = getLastPostedMessage();
      expect(result.type).toBe('config-save-failed');
      expect(result.message).toContain('Invalid regex');
    });

    it('should accept valid config', async () => {
      await sendMessage({
        type: 'save-config',
        config: validConfig,
      });

      const result = getLastPostedMessage();
      expect(result.type).toBe('node-count');
    });

    it('should reject when no config provided', async () => {
      await sendMessage({ type: 'save-config' });

      const result = getLastPostedMessage();
      expect(result.type).toBe('config-save-failed');
      expect(result.message).toContain('No config');
    });
  });

  // ==================== Config Storage Tests ====================
  describe('Config Storage', () => {
    it('should load config from storage on init', async () => {
      setMockStorage('translatorwiz_config', validConfig);

      await sendMessage({ type: 'init' });

      const configMsg = getPostedMessages('config-loaded')[0];
      expect(configMsg).toBeDefined();
      expect(configMsg.config.SPACE_ID).toBe('test-space');
    });

    it('should use default config when storage is empty', async () => {
      await sendMessage({ type: 'init' });

      const configMsg = getPostedMessages('config-loaded')[0];
      expect(configMsg).toBeDefined();
      expect(configMsg.config.ENVIRONMENT).toBe('master');
    });

    it('should merge stored config with defaults', async () => {
      setMockStorage('translatorwiz_config', { SPACE_ID: 'my-space' });

      await sendMessage({ type: 'init' });

      const configMsg = getPostedMessages('config-loaded')[0];
      expect(configMsg.config.SPACE_ID).toBe('my-space');
      expect(configMsg.config.ENVIRONMENT).toBe('master'); // default
    });

    it('should save valid config to storage', async () => {
      await sendMessage({
        type: 'save-config',
        config: validConfig,
      });

      expect(figmaMock.clientStorage.setAsync).toHaveBeenCalledWith(
        'translatorwiz_config',
        validConfig
      );
    });
  });

  // ==================== Fetch Locales Tests ====================
  describe('fetchLocales (via load-locales)', () => {
    it('should load locales successfully', async () => {
      mockFetchResponse(/locales/, {
        ok: true,
        status: 200,
        data: {
          items: [
            { code: 'en-US', name: 'English (US)' },
            { code: 'de-DE', name: 'German' },
          ],
        },
      });

      await sendMessage({ type: 'load-locales', config: validConfig });

      const result = getPostedMessages('locales-loaded')[0];
      expect(result).toBeDefined();
      expect(result.locales).toHaveLength(2);
      expect(result.locales[0].code).toBe('en-US');
    });

    it('should handle 401 unauthorized error', async () => {
      mockFetchResponse(/locales/, {
        ok: false,
        status: 401,
      });

      await sendMessage({ type: 'load-locales', config: validConfig });

      const result = getPostedMessages('error')[0];
      expect(result).toBeDefined();
      expect(result.message).toContain('Invalid API credentials');
    });

    it('should handle 404 not found error', async () => {
      mockFetchResponse(/locales/, {
        ok: false,
        status: 404,
      });

      await sendMessage({ type: 'load-locales', config: validConfig });

      const result = getPostedMessages('error')[0];
      expect(result).toBeDefined();
      expect(result.message).toContain('not found');
    });

    it('should filter out locales with empty code or name', async () => {
      mockFetchResponse(/locales/, {
        ok: true,
        status: 200,
        data: {
          items: [
            { code: 'en-US', name: 'English' },
            { code: '', name: 'Empty Code' },
            { code: 'de-DE', name: '' },
            { code: '  ', name: '  ' },
          ],
        },
      });

      await sendMessage({ type: 'load-locales', config: validConfig });

      const result = getPostedMessages('locales-loaded')[0];
      expect(result.locales).toHaveLength(1);
      expect(result.locales[0].code).toBe('en-US');
    });

    it('should show error when no locales found', async () => {
      mockFetchResponse(/locales/, {
        ok: true,
        status: 200,
        data: { items: [] },
      });

      await sendMessage({ type: 'load-locales', config: validConfig });

      const result = getPostedMessages('error')[0];
      expect(result.message).toContain('No locales found');
    });

    it('should handle missing config', async () => {
      await sendMessage({ type: 'load-locales' });

      const result = getPostedMessages('error')[0];
      expect(result.message).toContain('Configuration missing');
    });
  });

  // ==================== Fetch Translations Tests ====================
  describe('fetchTranslations (via apply-translation)', () => {
    beforeEach(() => {
      // Set up a mock text node that matches the pattern
      const mockNode = createMockTextNode({
        name: 'jams_test_key',
        characters: 'Original text',
      });
      figmaMock.currentPage.findAll.mockReturnValue([mockNode]);
    });

    it('should fetch and apply translations', async () => {
      mockFetchResponse(/entries/, {
        ok: true,
        status: 200,
        data: {
          items: [
            { fields: { key: 'jams_test_key', value: 'Translated text' } },
          ],
        },
      });

      await sendMessage({
        type: 'apply-translation',
        config: validConfig,
        locale: 'en-US',
      });

      const result = getPostedMessages('translation-applied')[0];
      expect(result).toBeDefined();
      expect(result.count).toBe(1);
    });

    it('should validate locale is not empty', async () => {
      await sendMessage({
        type: 'apply-translation',
        config: validConfig,
        locale: '   ',
      });

      const result = getPostedMessages('error')[0];
      expect(result.message).toContain('valid locale');
    });

    it('should handle 401 error when fetching translations', async () => {
      mockFetchResponse(/entries/, {
        ok: false,
        status: 401,
      });

      await sendMessage({
        type: 'apply-translation',
        config: validConfig,
        locale: 'en-US',
      });

      const result = getPostedMessages('error')[0];
      expect(result.message).toContain('Invalid API credentials');
    });

    it('should handle no translations found', async () => {
      mockFetchResponse(/entries/, {
        ok: true,
        status: 200,
        data: { items: [] },
      });

      await sendMessage({
        type: 'apply-translation',
        config: validConfig,
        locale: 'en-US',
      });

      const result = getPostedMessages('error')[0];
      expect(result.message).toContain('No translations found');
    });

    it('should filter out translations with empty key or value', async () => {
      mockFetchResponse(/entries/, {
        ok: true,
        status: 200,
        data: {
          items: [
            { fields: { key: '', value: 'No key' } },
            { fields: { key: 'has_key', value: '' } },
            { fields: { key: 'jams_test_key', value: 'Valid' } },
          ],
        },
      });

      await sendMessage({
        type: 'apply-translation',
        config: validConfig,
        locale: 'en-US',
      });

      const result = getPostedMessages('translation-applied')[0];
      expect(result).toBeDefined();
    });
  });

  // ==================== Content Types Tests ====================
  describe('fetchContentTypes (via load-content-types)', () => {
    it('should load content types successfully', async () => {
      mockFetchResponse(/content_types$/, {
        ok: true,
        status: 200,
        data: {
          items: [
            { sys: { id: 'page' }, name: 'Page' },
            { sys: { id: 'article' }, name: 'Article' },
          ],
        },
      });

      await sendMessage({ type: 'load-content-types', config: validConfig });

      const result = getPostedMessages('content-types-loaded')[0];
      expect(result).toBeDefined();
      expect(result.contentTypes).toHaveLength(2);
    });

    it('should handle 403 forbidden error', async () => {
      mockFetchResponse(/content_types$/, {
        ok: false,
        status: 403,
      });

      await sendMessage({ type: 'load-content-types', config: validConfig });

      const result = getPostedMessages('error')[0];
      expect(result.message).toContain('Invalid API credentials');
    });
  });

  // ==================== Records Tests ====================
  describe('fetchRecords (via load-records)', () => {
    it('should load records successfully', async () => {
      mockFetchResponse(/entries\?content_type=/, {
        ok: true,
        status: 200,
        data: {
          items: [
            { sys: { id: 'entry-1' }, fields: { title: { 'en-US': 'Test' } } },
          ],
        },
      });

      await sendMessage({
        type: 'load-records',
        config: validConfig,
        contentType: 'page',
      });

      const result = getPostedMessages('records-loaded')[0];
      expect(result).toBeDefined();
      expect(result.records).toHaveLength(1);
    });

    it('should handle missing content type parameter', async () => {
      await sendMessage({
        type: 'load-records',
        config: validConfig,
      });

      const result = getPostedMessages('error')[0];
      expect(result.message).toContain('content type missing');
    });
  });

  // ==================== Multiple Records Tests ====================
  describe('load-multiple-records', () => {
    it('should load records from multiple content types', async () => {
      mockFetchResponse(/entries\?content_type=page/, {
        ok: true,
        data: { items: [{ sys: { id: '1' } }] },
      });
      mockFetchResponse(/entries\?content_type=article/, {
        ok: true,
        data: { items: [{ sys: { id: '2' } }, { sys: { id: '3' } }] },
      });

      await sendMessage({
        type: 'load-multiple-records',
        config: validConfig,
        contentTypes: ['page', 'article'],
      });

      const result = getPostedMessages('multiple-records-loaded')[0];
      expect(result).toBeDefined();
      expect(result.recordsByContentType.page).toHaveLength(1);
      expect(result.recordsByContentType.article).toHaveLength(2);
    });
  });

  // ==================== Text Nodes Tests ====================
  describe('getAllTextNodes (via get-text-nodes)', () => {
    it('should return all text nodes on page', async () => {
      const mockNodes = [
        createMockTextNode({ id: '1', name: 'Header', characters: 'Hello' }),
        createMockTextNode({ id: '2', name: 'Body', characters: 'World' }),
      ];
      figmaMock.currentPage.findAll.mockReturnValue(mockNodes);

      await sendMessage({ type: 'get-text-nodes' });

      const result = getPostedMessages('text-nodes-loaded')[0];
      expect(result.nodes).toHaveLength(2);
      expect(result.nodes[0].name).toBe('Header');
    });
  });

  // ==================== Translatable Nodes Tests ====================
  describe('get-translatable-nodes', () => {
    it('should return nodes matching the pattern', async () => {
      const mockNodes = [
        createMockTextNode({ name: 'jams_header', characters: 'Header' }),
        createMockTextNode({ name: 'jams_body', characters: 'Body' }),
      ];
      figmaMock.currentPage.findAll.mockReturnValue(mockNodes);

      await sendMessage({
        type: 'get-translatable-nodes',
        config: validConfig,
      });

      const result = getPostedMessages('translatable-nodes-loaded')[0];
      expect(result.nodes).toHaveLength(2);
    });
  });

  // ==================== Apply Record to Nodes Tests ====================
  describe('applyRecordToNodes (via apply-record-to-nodes)', () => {
    it('should apply record fields to nodes', async () => {
      const mockNode = createMockTextNode({
        id: 'node-1',
        name: 'Header',
        characters: 'Old text',
      });
      figmaMock.getNodeById.mockReturnValue(mockNode);

      await sendMessage({
        type: 'apply-record-to-nodes',
        mappings: [{ field: 'title', node: 'node-1' }],
        recordFields: { title: 'New text' },
      });

      const result = getPostedMessages('record-applied')[0];
      expect(result).toBeDefined();
      expect(mockNode.characters).toBe('New text');
    });

    it('should skip locked nodes', async () => {
      const mockNode = createMockTextNode({
        id: 'node-1',
        locked: true,
        characters: 'Original',
      });
      figmaMock.getNodeById.mockReturnValue(mockNode);

      await sendMessage({
        type: 'apply-record-to-nodes',
        mappings: [{ field: 'title', node: 'node-1' }],
        recordFields: { title: 'New text' },
      });

      expect(mockNode.characters).toBe('Original');
    });

    it('should skip nodes with missing fonts', async () => {
      const mockNode = createMockTextNode({
        id: 'node-1',
        hasMissingFont: true,
        characters: 'Original',
      });
      figmaMock.getNodeById.mockReturnValue(mockNode);

      await sendMessage({
        type: 'apply-record-to-nodes',
        mappings: [{ field: 'title', node: 'node-1' }],
        recordFields: { title: 'New text' },
      });

      expect(mockNode.characters).toBe('Original');
    });

    it('should handle node not found', async () => {
      figmaMock.getNodeById.mockReturnValue(null);

      await sendMessage({
        type: 'apply-record-to-nodes',
        mappings: [{ field: 'title', node: 'nonexistent' }],
        recordFields: { title: 'New text' },
      });

      // Should complete without crashing
      const result = getPostedMessages('record-applied')[0];
      expect(result).toBeDefined();
    });
  });

  // ==================== Preflight Tests ====================
  describe('Preflight Checks', () => {
    describe('preflight-test-locales', () => {
      it('should succeed when locales are found', async () => {
        mockFetchResponse(/locales/, {
          ok: true,
          data: { items: [{ code: 'en-US', name: 'English' }] },
        });

        await sendMessage({
          type: 'preflight-test-locales',
          config: validConfig,
        });

        const result = getPostedMessages('preflight-locales-result')[0];
        expect(result.result.success).toBe(true);
      });

      it('should fail when no locales found', async () => {
        mockFetchResponse(/locales/, {
          ok: true,
          data: { items: [] },
        });

        await sendMessage({
          type: 'preflight-test-locales',
          config: validConfig,
        });

        const result = getPostedMessages('preflight-locales-result')[0];
        expect(result.result.success).toBe(false);
        expect(result.result.error).toContain('No locales');
      });

      it('should fail when no config provided', async () => {
        await sendMessage({ type: 'preflight-test-locales' });

        const result = getPostedMessages('preflight-locales-result')[0];
        expect(result.result.success).toBe(false);
        expect(result.result.error).toContain('No config');
      });
    });

    describe('preflight-check-content', () => {
      it('should succeed when content type and fields are valid', async () => {
        mockFetchResponse(/content_types\/translation/, {
          ok: true,
          data: {
            fields: [{ id: 'key' }, { id: 'value' }],
          },
        });

        await sendMessage({
          type: 'preflight-check-content',
          config: validConfig,
        });

        const result = getPostedMessages('preflight-content-result')[0];
        expect(result.result.success).toBe(true);
      });

      it('should fail when content type not found', async () => {
        mockFetchResponse(/content_types\/translation/, {
          ok: false,
          status: 404,
        });

        await sendMessage({
          type: 'preflight-check-content',
          config: validConfig,
        });

        const result = getPostedMessages('preflight-content-result')[0];
        expect(result.result.success).toBe(false);
        expect(result.result.error).toContain('not found');
      });

      it('should fail when key field not found', async () => {
        mockFetchResponse(/content_types\/translation/, {
          ok: true,
          data: {
            fields: [{ id: 'otherField' }, { id: 'value' }],
          },
        });

        await sendMessage({
          type: 'preflight-check-content',
          config: validConfig,
        });

        const result = getPostedMessages('preflight-content-result')[0];
        expect(result.result.success).toBe(false);
        expect(result.result.error).toContain('Key field not found');
      });

      it('should fail when value field not found', async () => {
        mockFetchResponse(/content_types\/translation/, {
          ok: true,
          data: {
            fields: [{ id: 'key' }, { id: 'otherField' }],
          },
        });

        await sendMessage({
          type: 'preflight-check-content',
          config: validConfig,
        });

        const result = getPostedMessages('preflight-content-result')[0];
        expect(result.result.success).toBe(false);
        expect(result.result.error).toContain('Value field not found');
      });
    });
  });

  // ==================== Contentful Items Tests ====================
  describe('fetchAllContentfulItems (via get-all-contentful-items)', () => {
    it('should fetch and parse all items', async () => {
      mockFetchResponse(/entries\?content_type=/, {
        ok: true,
        data: {
          items: [
            {
              sys: { id: 'entry-1' },
              fields: {
                key: { 'en-US': 'test_key' },
                value: { 'en-US': 'Test value' },
              },
            },
          ],
        },
      });

      await sendMessage({
        type: 'get-all-contentful-items',
        config: validConfig,
      });

      const result = getPostedMessages('contentful-items-loaded')[0];
      expect(result.items).toBeDefined();
      expect(result.items['test_key']).toBeDefined();
      expect(result.items['test_key'].value).toBe('Test value');
    });

    it('should skip archived entries', async () => {
      mockFetchResponse(/entries\?content_type=/, {
        ok: true,
        data: {
          items: [
            {
              sys: { id: 'entry-1', archivedVersion: 1 },
              fields: {
                key: { 'en-US': 'archived_key' },
                value: { 'en-US': 'Archived' },
              },
            },
            {
              sys: { id: 'entry-2' },
              fields: {
                key: { 'en-US': 'active_key' },
                value: { 'en-US': 'Active' },
              },
            },
          ],
        },
      });

      await sendMessage({
        type: 'get-all-contentful-items',
        config: validConfig,
      });

      const result = getPostedMessages('contentful-items-loaded')[0];
      expect(result.items['archived_key']).toBeUndefined();
      expect(result.items['active_key']).toBeDefined();
    });
  });

  // ==================== Save to Contentful Tests ====================
  describe('saveItemToContentful (via save-contentful-item)', () => {
    it('should create new entry successfully', async () => {
      // Mock create response
      mockFetchResponse(/entries$/, {
        ok: true,
        data: { sys: { id: 'new-entry', version: 1 } },
      });
      // Mock publish response
      mockFetchResponse(/published/, {
        ok: true,
        data: { sys: { id: 'new-entry', version: 2 } },
      });

      await sendMessage({
        type: 'save-contentful-item',
        config: validConfig,
        item: { key: 'new_key', value: 'New value', isUpdate: false },
      });

      const result = getPostedMessages('item-saved')[0];
      expect(result.success).toBe(true);
    });

    it('should update existing entry successfully', async () => {
      // Mock GET for current version
      mockFetchResponse(/entries\/existing-entry$/, {
        ok: true,
        data: { sys: { id: 'existing-entry', version: 5 } },
      });
      // Mock PUT for update
      mockFetchResponse(/entries\/existing-entry$/, {
        ok: true,
        data: { sys: { id: 'existing-entry', version: 6 } },
      });
      // Mock publish response
      mockFetchResponse(/published/, {
        ok: true,
        data: { sys: { id: 'existing-entry', version: 7 } },
      });

      await sendMessage({
        type: 'save-contentful-item',
        config: validConfig,
        item: {
          key: 'existing_key',
          value: 'Updated value',
          isUpdate: true,
          entryId: 'existing-entry',
        },
      });

      const result = getPostedMessages('item-saved')[0];
      expect(result.success).toBe(true);
    });

    it('should handle create failure', async () => {
      mockFetchResponse(/entries$/, {
        ok: false,
        status: 400,
        text: 'Bad request',
      });

      await sendMessage({
        type: 'save-contentful-item',
        config: validConfig,
        item: { key: 'new_key', value: 'New value', isUpdate: false },
      });

      const result = getPostedMessages('item-saved')[0];
      expect(result.success).toBe(false);
      expect(result.error).toContain('Create failed');
    });

    it('should handle publish failure after create', async () => {
      mockFetchResponse(/entries$/, {
        ok: true,
        data: { sys: { id: 'new-entry', version: 1 } },
      });
      mockFetchResponse(/published/, {
        ok: false,
        status: 500,
      });

      await sendMessage({
        type: 'save-contentful-item',
        config: validConfig,
        item: { key: 'new_key', value: 'New value', isUpdate: false },
      });

      const result = getPostedMessages('item-saved')[0];
      expect(result.success).toBe(false);
      expect(result.error).toContain('publish failed');
    });
  });

  // ==================== Message Handler Edge Cases ====================
  describe('Message Handler Edge Cases', () => {
    it('should ignore invalid message format', async () => {
      await sendMessage(null);
      await sendMessage('string');
      await sendMessage({ noType: true });

      // Should not crash and no error messages should be sent
      expect(getPostedMessages('error')).toHaveLength(0);
    });

    it('should close plugin on cancel message', async () => {
      await sendMessage({ type: 'cancel' });

      expect(figmaMock.closePlugin).toHaveBeenCalled();
    });
  });

  // ==================== Network Timeout Tests ====================
  describe('Network Timeout', () => {
    it('should timeout long-running requests', async () => {
      // Override fetch to simulate timeout
      mockFetch.mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Request timeout'));
          }, 100);
        });
      });

      await sendMessage({ type: 'load-locales', config: validConfig });

      const result = getPostedMessages('error')[0];
      expect(result).toBeDefined();
    });
  });

  // ==================== Node Count Tests ====================
  describe('getTranslatableNodeCount', () => {
    it('should count nodes matching pattern on init', async () => {
      const mockNodes = [
        createMockTextNode({ name: 'jams_header' }),
        createMockTextNode({ name: 'jams_body' }),
        createMockTextNode({ name: 'other_text' }),
      ];

      // Only return nodes matching the pattern
      figmaMock.currentPage.findAll.mockImplementation((predicate: any) => {
        return mockNodes.filter((n) => predicate(n));
      });

      setMockStorage('translatorwiz_config', validConfig);

      await sendMessage({ type: 'init' });

      const nodeCountMsg = getPostedMessages('node-count')[0];
      expect(nodeCountMsg).toBeDefined();
    });

    it('should return 0 when no nodes match pattern', async () => {
      figmaMock.currentPage.findAll.mockReturnValue([]);

      setMockStorage('translatorwiz_config', validConfig);

      await sendMessage({ type: 'init' });

      const nodeCountMsg = getPostedMessages('node-count')[0];
      expect(nodeCountMsg.count).toBe(0);
    });
  });
});
