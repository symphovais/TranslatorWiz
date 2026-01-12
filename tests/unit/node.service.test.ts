import {
  getTranslatableNodeCount,
  getAllTextNodes,
  getTranslatableNodes,
  applyTranslations,
  applyRecordToNodes,
  updateMultipleNodes,
  selectNode
} from '../../src/services/node.service';
import { ContentfulConfig } from '../../src/types';

describe('NodeService', () => {
  const validConfig: ContentfulConfig = {
    SPACE_ID: 'space123',
    ENVIRONMENT: 'master',
    CMA_TOKEN: 'token123',
    CONTENT_TYPE: 'translation',
    KEY_FIELD: 'key',
    VALUE_FIELD: 'value',
    NODE_NAME_PATTERN: '^jams_'
  };

  // Helper to create a mock text node
  function createMockTextNode(id: string, name: string, characters: string, options: {
    locked?: boolean;
    hasMissingFont?: boolean;
    mixedFonts?: boolean;
  } = {}) {
    const fontName = options.mixedFonts
      ? figma.mixed
      : { family: 'Arial', style: 'Regular' };

    return {
      id,
      name,
      type: 'TEXT' as const,
      characters,
      locked: options.locked || false,
      hasMissingFont: options.hasMissingFont || false,
      fontName,
      getRangeFontName: jest.fn().mockReturnValue({ family: 'Arial', style: 'Bold' })
    };
  }

  describe('getTranslatableNodeCount', () => {
    it('should count nodes matching the pattern', () => {
      const node1 = createMockTextNode('1', 'jams_hello', 'Hello');
      const node2 = createMockTextNode('2', 'jams_world', 'World');
      const node3 = createMockTextNode('3', 'other_text', 'Other');

      (figma.currentPage.findAllWithCriteria as jest.Mock).mockReturnValue([node1, node2, node3]);

      const count = getTranslatableNodeCount(validConfig);

      expect(count).toBe(2);
    });

    it('should return 0 when no nodes match', () => {
      const node1 = createMockTextNode('1', 'other_text', 'Other');

      (figma.currentPage.findAllWithCriteria as jest.Mock).mockReturnValue([node1]);

      const count = getTranslatableNodeCount(validConfig);

      expect(count).toBe(0);
    });

    it('should return 0 when currentPage is not available', () => {
      const originalCurrentPage = figma.currentPage;
      Object.defineProperty(figma, 'currentPage', {
        value: null,
        configurable: true
      });

      const count = getTranslatableNodeCount(validConfig);

      expect(count).toBe(0);

      // Restore
      Object.defineProperty(figma, 'currentPage', {
        value: originalCurrentPage,
        configurable: true
      });
    });

    it('should handle regex errors gracefully', () => {
      const invalidConfig = { ...validConfig, NODE_NAME_PATTERN: '[invalid' };
      (figma.currentPage.findAllWithCriteria as jest.Mock).mockReturnValue([]);

      const count = getTranslatableNodeCount(invalidConfig);

      expect(count).toBe(0);
    });
  });

  describe('getAllTextNodes', () => {
    it('should return all text nodes', () => {
      const node1 = createMockTextNode('1', 'text1', 'Hello');
      const node2 = createMockTextNode('2', 'text2', 'World');

      (figma.currentPage.findAllWithCriteria as jest.Mock).mockReturnValue([node1, node2]);

      const result = getAllTextNodes();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: '1', name: 'text1', characters: 'Hello' });
      expect(result[1]).toEqual({ id: '2', name: 'text2', characters: 'World' });
    });

    it('should return empty array when no text nodes exist', () => {
      (figma.currentPage.findAllWithCriteria as jest.Mock).mockReturnValue([]);

      const result = getAllTextNodes();

      expect(result).toHaveLength(0);
    });
  });

  describe('getTranslatableNodes', () => {
    it('should return only nodes matching the pattern', () => {
      const node1 = createMockTextNode('1', 'jams_hello', 'Hello');
      const node2 = createMockTextNode('2', 'other_text', 'Other');

      (figma.currentPage.findAll as jest.Mock).mockImplementation((filter: (n: { type: string; name: string }) => boolean) => {
        return [node1, node2].filter(n => filter(n));
      });

      const result = getTranslatableNodes(validConfig);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('jams_hello');
    });
  });

  describe('applyTranslations', () => {
    beforeEach(() => {
      (figma.loadFontAsync as jest.Mock).mockResolvedValue(undefined);
    });

    it('should apply translations to matching nodes', async () => {
      const node1 = createMockTextNode('1', 'jams_hello', 'Old Hello');
      const node2 = createMockTextNode('2', 'jams_world', 'Old World');

      (figma.currentPage.findAllWithCriteria as jest.Mock).mockReturnValue([node1, node2]);

      const translations = [
        { key: 'jams_hello', value: 'New Hello' },
        { key: 'jams_world', value: 'New World' }
      ];

      const count = await applyTranslations(translations, validConfig);

      expect(count).toBe(2);
      expect(node1.characters).toBe('New Hello');
      expect(node2.characters).toBe('New World');
    });

    it('should skip locked nodes', async () => {
      const node1 = createMockTextNode('1', 'jams_hello', 'Old Hello', { locked: true });

      (figma.currentPage.findAllWithCriteria as jest.Mock).mockReturnValue([node1]);

      const translations = [{ key: 'jams_hello', value: 'New Hello' }];

      await expect(applyTranslations(translations, validConfig)).rejects.toThrow('All nodes skipped');
    });

    it('should skip nodes with missing fonts', async () => {
      const node1 = createMockTextNode('1', 'jams_hello', 'Old Hello', { hasMissingFont: true });

      (figma.currentPage.findAllWithCriteria as jest.Mock).mockReturnValue([node1]);

      const translations = [{ key: 'jams_hello', value: 'New Hello' }];

      await expect(applyTranslations(translations, validConfig)).rejects.toThrow('Translation failed');
    });

    it('should throw when no translatable nodes found', async () => {
      (figma.currentPage.findAllWithCriteria as jest.Mock).mockReturnValue([]);

      const translations = [{ key: 'jams_hello', value: 'New Hello' }];

      await expect(applyTranslations(translations, validConfig)).rejects.toThrow(
        'No translatable text nodes found on current page'
      );
    });

    it('should throw when no matching translations exist', async () => {
      const node1 = createMockTextNode('1', 'jams_hello', 'Old Hello');

      (figma.currentPage.findAllWithCriteria as jest.Mock).mockReturnValue([node1]);

      const translations = [{ key: 'jams_other', value: 'New Value' }];

      await expect(applyTranslations(translations, validConfig)).rejects.toThrow(
        'No matching translations found for text nodes'
      );
    });

    it('should handle mixed fonts', async () => {
      const node1 = createMockTextNode('1', 'jams_hello', 'AB', { mixedFonts: true });

      (figma.currentPage.findAllWithCriteria as jest.Mock).mockReturnValue([node1]);

      const translations = [{ key: 'jams_hello', value: 'New Hello' }];

      const count = await applyTranslations(translations, validConfig);

      expect(count).toBe(1);
      // loadFontAsync should be called for each character
      expect(figma.loadFontAsync).toHaveBeenCalledTimes(2);
    });

    it('should handle font loading errors', async () => {
      const node1 = createMockTextNode('1', 'jams_hello', 'Old Hello');

      (figma.currentPage.findAllWithCriteria as jest.Mock).mockReturnValue([node1]);
      (figma.loadFontAsync as jest.Mock).mockRejectedValue(new Error('Font not found'));

      const translations = [{ key: 'jams_hello', value: 'New Hello' }];

      await expect(applyTranslations(translations, validConfig)).rejects.toThrow('Translation failed');
    });
  });

  describe('applyRecordToNodes', () => {
    beforeEach(() => {
      (figma.loadFontAsync as jest.Mock).mockResolvedValue(undefined);
    });

    it('should apply record fields to mapped nodes', async () => {
      const node1 = createMockTextNode('node1', 'Title', 'Old Title');

      (figma.getNodeByIdAsync as jest.Mock).mockResolvedValue(node1);

      const mappings = [{ field: 'title', node: 'node1' }];
      const recordFields = { title: 'New Title' };

      await applyRecordToNodes(mappings, recordFields);

      expect(node1.characters).toBe('New Title');
    });

    it('should skip non-existent nodes', async () => {
      (figma.getNodeByIdAsync as jest.Mock).mockResolvedValue(null);

      const mappings = [{ field: 'title', node: 'non-existent' }];
      const recordFields = { title: 'New Title' };

      // Should not throw
      await applyRecordToNodes(mappings, recordFields);
    });

    it('should skip locked nodes', async () => {
      const node1 = createMockTextNode('node1', 'Title', 'Old Title', { locked: true });

      (figma.getNodeByIdAsync as jest.Mock).mockResolvedValue(node1);

      const mappings = [{ field: 'title', node: 'node1' }];
      const recordFields = { title: 'New Title' };

      await applyRecordToNodes(mappings, recordFields);

      expect(node1.characters).toBe('Old Title'); // Should not change
    });

    it('should skip missing field values', async () => {
      const node1 = createMockTextNode('node1', 'Title', 'Old Title');

      (figma.getNodeByIdAsync as jest.Mock).mockResolvedValue(node1);

      const mappings = [{ field: 'nonexistent', node: 'node1' }];
      const recordFields = { title: 'New Title' };

      await applyRecordToNodes(mappings, recordFields);

      expect(node1.characters).toBe('Old Title'); // Should not change
    });

    it('should convert non-string values to strings', async () => {
      const node1 = createMockTextNode('node1', 'Count', '0');

      (figma.getNodeByIdAsync as jest.Mock).mockResolvedValue(node1);

      const mappings = [{ field: 'count', node: 'node1' }];
      const recordFields = { count: 42 };

      await applyRecordToNodes(mappings, recordFields);

      expect(node1.characters).toBe('42');
    });
  });

  describe('updateMultipleNodes', () => {
    beforeEach(() => {
      (figma.loadFontAsync as jest.Mock).mockResolvedValue(undefined);
    });

    it('should update multiple nodes with the same text', async () => {
      const node1 = createMockTextNode('node1', 'Text1', 'Old Text');
      const node2 = createMockTextNode('node2', 'Text2', 'Old Text');

      (figma.getNodeByIdAsync as jest.Mock)
        .mockResolvedValueOnce(node1)
        .mockResolvedValueOnce(node2);

      const result = await updateMultipleNodes(['node1', 'node2'], 'New Text');

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(node1.characters).toBe('New Text');
      expect(node2.characters).toBe('New Text');
    });

    it('should return error for invalid node IDs', async () => {
      const result = await updateMultipleNodes([], 'New Text');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid node IDs');
    });

    it('should handle partial failures', async () => {
      const node1 = createMockTextNode('node1', 'Text1', 'Old Text');

      (figma.getNodeByIdAsync as jest.Mock)
        .mockResolvedValueOnce(node1)
        .mockResolvedValueOnce(null); // Second node not found

      const result = await updateMultipleNodes(['node1', 'node2'], 'New Text');

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(result.errors).toContain('Node node2: Not found or not a text node');
    });

    it('should skip nodes with missing fonts', async () => {
      const node1 = createMockTextNode('node1', 'Text1', 'Old Text', { hasMissingFont: true });

      (figma.getNodeByIdAsync as jest.Mock).mockResolvedValue(node1);

      const result = await updateMultipleNodes(['node1'], 'New Text');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Text1: Missing font');
    });
  });

  describe('selectNode', () => {
    it('should select a node and scroll to it', async () => {
      const node = createMockTextNode('node1', 'Text', 'Hello');

      (figma.getNodeByIdAsync as jest.Mock).mockResolvedValue(node);

      await selectNode('node1');

      expect(figma.currentPage.selection).toContain(node);
      expect(figma.viewport.scrollAndZoomIntoView).toHaveBeenCalledWith([node]);
    });

    it('should handle non-existent nodes gracefully', async () => {
      (figma.getNodeByIdAsync as jest.Mock).mockResolvedValue(null);

      // Should not throw
      await selectNode('non-existent');
    });
  });
});
