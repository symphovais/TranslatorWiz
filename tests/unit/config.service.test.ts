import { validateConfig, mergeWithDefaults, loadConfigFromStorage, saveConfigToStorage } from '../../src/services/config.service';
import { defaultConfig } from '../../src/constants';
import { ContentfulConfig } from '../../src/types';

describe('ConfigService', () => {
  const validConfig: ContentfulConfig = {
    SPACE_ID: 'space123',
    ENVIRONMENT: 'master',
    CMA_TOKEN: 'token123',
    CONTENT_TYPE: 'translation',
    KEY_FIELD: 'key',
    VALUE_FIELD: 'value',
    NODE_NAME_PATTERN: '^jams_'
  };

  describe('validateConfig', () => {
    it('should return null for valid config', () => {
      expect(validateConfig(validConfig)).toBeNull();
    });

    it('should return error for missing SPACE_ID', () => {
      const config = { ...validConfig, SPACE_ID: '' };
      expect(validateConfig(config)).toBe('SPACE_ID is required');
    });

    it('should return error for whitespace-only SPACE_ID', () => {
      const config = { ...validConfig, SPACE_ID: '   ' };
      expect(validateConfig(config)).toBe('SPACE_ID is required');
    });

    it('should return error for missing ENVIRONMENT', () => {
      const config = { ...validConfig, ENVIRONMENT: '' };
      expect(validateConfig(config)).toBe('ENVIRONMENT is required');
    });

    it('should return error for missing CMA_TOKEN', () => {
      const config = { ...validConfig, CMA_TOKEN: '' };
      expect(validateConfig(config)).toBe('CMA_TOKEN is required');
    });

    it('should return error for missing CONTENT_TYPE', () => {
      const config = { ...validConfig, CONTENT_TYPE: '' };
      expect(validateConfig(config)).toBe('CONTENT_TYPE is required');
    });

    it('should return error for missing KEY_FIELD', () => {
      const config = { ...validConfig, KEY_FIELD: '' };
      expect(validateConfig(config)).toBe('KEY_FIELD is required');
    });

    it('should return error for missing VALUE_FIELD', () => {
      const config = { ...validConfig, VALUE_FIELD: '' };
      expect(validateConfig(config)).toBe('VALUE_FIELD is required');
    });

    it('should return error for missing NODE_NAME_PATTERN', () => {
      const config = { ...validConfig, NODE_NAME_PATTERN: '' };
      expect(validateConfig(config)).toBe('NODE_NAME_PATTERN is required');
    });

    it('should return error for invalid regex pattern', () => {
      const config = { ...validConfig, NODE_NAME_PATTERN: '[invalid' };
      expect(validateConfig(config)).toContain('Invalid regex pattern');
    });

    it('should accept valid regex patterns', () => {
      const patterns = ['^jams_', 'test.*', '\\d+', 'prefix_[a-z]+'];
      patterns.forEach(pattern => {
        const config = { ...validConfig, NODE_NAME_PATTERN: pattern };
        expect(validateConfig(config)).toBeNull();
      });
    });
  });

  describe('mergeWithDefaults', () => {
    it('should return defaults for null input', () => {
      const result = mergeWithDefaults(null);
      expect(result).toEqual(defaultConfig);
    });

    it('should return defaults for undefined input', () => {
      const result = mergeWithDefaults(undefined as unknown as null);
      expect(result).toEqual(defaultConfig);
    });

    it('should merge partial config with defaults', () => {
      const partial = { SPACE_ID: 'custom-space' };
      const result = mergeWithDefaults(partial);

      expect(result.SPACE_ID).toBe('custom-space');
      expect(result.ENVIRONMENT).toBe(defaultConfig.ENVIRONMENT);
      expect(result.CMA_TOKEN).toBe(defaultConfig.CMA_TOKEN);
    });

    it('should override all defaults when full config provided', () => {
      const result = mergeWithDefaults(validConfig);
      expect(result).toEqual(validConfig);
    });

    it('should not mutate the default config', () => {
      const originalDefault = { ...defaultConfig };
      mergeWithDefaults({ SPACE_ID: 'test' });
      expect(defaultConfig).toEqual(originalDefault);
    });
  });

  describe('loadConfigFromStorage', () => {
    it('should load config from figma storage', async () => {
      const storedConfig = { SPACE_ID: 'stored-space', CMA_TOKEN: 'stored-token' };
      (figma.clientStorage.getAsync as jest.Mock).mockResolvedValueOnce(storedConfig);

      const result = await loadConfigFromStorage();

      expect(figma.clientStorage.getAsync).toHaveBeenCalledWith('translatorwiz_config');
      expect(result.SPACE_ID).toBe('stored-space');
      expect(result.CMA_TOKEN).toBe('stored-token');
      expect(result.ENVIRONMENT).toBe(defaultConfig.ENVIRONMENT);
    });

    it('should return defaults if storage is empty', async () => {
      (figma.clientStorage.getAsync as jest.Mock).mockResolvedValueOnce(null);

      const result = await loadConfigFromStorage();

      expect(result).toEqual(defaultConfig);
    });

    it('should return defaults on storage error', async () => {
      (figma.clientStorage.getAsync as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      const result = await loadConfigFromStorage();

      expect(result).toEqual(defaultConfig);
    });
  });

  describe('saveConfigToStorage', () => {
    it('should save config to figma storage', async () => {
      (figma.clientStorage.setAsync as jest.Mock).mockResolvedValueOnce(undefined);

      await saveConfigToStorage(validConfig);

      expect(figma.clientStorage.setAsync).toHaveBeenCalledWith('translatorwiz_config', validConfig);
    });

    it('should throw error on storage failure', async () => {
      (figma.clientStorage.setAsync as jest.Mock).mockRejectedValueOnce(new Error('Write failed'));

      await expect(saveConfigToStorage(validConfig)).rejects.toThrow('Failed to save config to storage');
    });
  });
});
