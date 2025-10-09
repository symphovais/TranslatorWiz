// TranslatorWiz - Figma plugin for Contentful-based translations

figma.showUI(__html__, { width: 400, height: 550, themeColors: true });

interface ContentfulConfig {
  SPACE_ID: string;
  ENVIRONMENT: string;
  PREVIEW_TOKEN: string;
  CONTENT_TYPE: string;
  KEY_FIELD: string;
  VALUE_FIELD: string;
  NODE_NAME_PATTERN: string;
}

interface Locale {
  code: string;
  name: string;
}

interface Translation {
  key: string;
  value: string;
}

interface FieldMapping {
  field: string;
  node: string;
  contentTypeId?: string;
}

interface TextNodeInfo {
  id: string;
  name: string;
  characters: string;
}

// Network timeout for API calls (10 seconds)
const API_TIMEOUT = 10000;

// Default config
const defaultConfig: ContentfulConfig = {
  SPACE_ID: "4fejn84m8z5w",
  ENVIRONMENT: "master",
  PREVIEW_TOKEN: "8R6kV7olel_4nuNpRsgYRXP1RwZ5Vax_3-nnS58zorA",
  CONTENT_TYPE: "translation",
  KEY_FIELD: "key",
  VALUE_FIELD: "value",
  NODE_NAME_PATTERN: "^jams_"
};

// Load config from storage or use default
let configData: ContentfulConfig = defaultConfig;

async function loadConfigFromStorage(): Promise<ContentfulConfig> {
  try {
    const stored = await figma.clientStorage.getAsync('translatorwiz_config');
    if (stored && typeof stored === 'object') {
      return { ...defaultConfig, ...stored };
    }
  } catch (e) {
    console.error('Failed to load config from storage:', e);
  }
  return defaultConfig;
}

async function saveConfigToStorage(config: ContentfulConfig): Promise<void> {
  try {
    await figma.clientStorage.setAsync('translatorwiz_config', config);
  } catch (e) {
    throw new Error('Failed to save config to storage');
  }
}

// Validate config on startup
function validateConfig(config: ContentfulConfig): string | null {
  if (!config.SPACE_ID || !config.SPACE_ID.trim()) {
    return 'SPACE_ID is required';
  }
  if (!config.ENVIRONMENT || !config.ENVIRONMENT.trim()) {
    return 'ENVIRONMENT is required';
  }
  if (!config.PREVIEW_TOKEN || !config.PREVIEW_TOKEN.trim()) {
    return 'PREVIEW_TOKEN is required';
  }
  if (!config.CONTENT_TYPE || !config.CONTENT_TYPE.trim()) {
    return 'CONTENT_TYPE is required';
  }
  if (!config.KEY_FIELD || !config.KEY_FIELD.trim()) {
    return 'KEY_FIELD is required';
  }
  if (!config.VALUE_FIELD || !config.VALUE_FIELD.trim()) {
    return 'VALUE_FIELD is required';
  }
  if (!config.NODE_NAME_PATTERN || !config.NODE_NAME_PATTERN.trim()) {
    return 'NODE_NAME_PATTERN is required';
  }
  
  // Validate regex pattern
  try {
    new RegExp(config.NODE_NAME_PATTERN);
  } catch (e) {
    return `Invalid regex pattern: ${config.NODE_NAME_PATTERN}`;
  }
  
  return null;
}

figma.ui.onmessage = async (msg: { 
  type: string; 
  config?: ContentfulConfig; 
  locale?: string; 
  count?: number;
  contentType?: string;
  contentTypes?: string[];
  mappings?: FieldMapping[];
  recordFields?: any;
}) => {
  try {
    if (msg.type === 'init') {
      // Load config from storage
      configData = await loadConfigFromStorage();
      
      // Validate config before sending
      const configError = validateConfig(configData);
      if (configError) {
        figma.ui.postMessage({ type: 'error', message: `Config error: ${configError}` });
        return;
      }
      
      figma.ui.postMessage({ type: 'config-loaded', config: configData });
      
      // Count translatable nodes and send to UI
      const nodeCount = getTranslatableNodeCount(configData);
      figma.ui.postMessage({ type: 'node-count', count: nodeCount });
      return;
    }

    if (msg.type === 'save-config') {
      if (!msg.config) {
        figma.ui.postMessage({ type: 'config-save-failed', message: 'No config provided' });
        return;
      }
      
      // Validate new config
      const configError = validateConfig(msg.config);
      if (configError) {
        figma.ui.postMessage({ type: 'config-save-failed', message: configError });
        return;
      }
      
      // Save to storage
      await saveConfigToStorage(msg.config);
      configData = msg.config;
      
      figma.ui.postMessage({ type: 'config-saved', config: configData });
      
      // Reload locales with new config
      const nodeCount = getTranslatableNodeCount(configData);
      figma.ui.postMessage({ type: 'node-count', count: nodeCount });
      return;
    }

    // Preflight check: Test by fetching locales (validates credentials, space, and environment)
    if (msg.type === 'preflight-test-locales') {
      if (!msg.config) {
        figma.ui.postMessage({ 
          type: 'preflight-locales-result', 
          result: { success: false, error: 'No config provided' }
        });
        return;
      }
      
      try {
        const locales = await fetchLocales(msg.config);
        
        if (locales.length === 0) {
          throw new Error('No locales found');
        }
        
        figma.ui.postMessage({ 
          type: 'preflight-locales-result', 
          result: { success: true, message: `Found ${locales.length} locale(s) ✓` }
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to fetch locales';
        figma.ui.postMessage({ 
          type: 'preflight-locales-result', 
          result: { success: false, error: errorMsg }
        });
      }
      return;
    }

    // Preflight check: Check content type
    if (msg.type === 'preflight-check-content') {
      if (!msg.config) {
        figma.ui.postMessage({ 
          type: 'preflight-content-result', 
          result: { success: false, error: 'No config provided' }
        });
        return;
      }
      
      try {
        const spaceId = encodeURIComponent(msg.config.SPACE_ID);
        const environment = encodeURIComponent(msg.config.ENVIRONMENT);
        const contentType = encodeURIComponent(msg.config.CONTENT_TYPE);
        const url = `https://preview.contentful.com/spaces/${spaceId}/environments/${environment}/content_types/${contentType}`;
        const options = {
          headers: {
            'Authorization': `Bearer ${msg.config.PREVIEW_TOKEN}`
          }
        };
        const response = await fetchWithTimeout(url, options, API_TIMEOUT);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`Content type not found`);
          }
          throw new Error('Content type check failed');
        }
        
        const data = await response.json();
        
        // Verify required fields exist
        const fields = Array.isArray(data.fields) ? data.fields : [];
        const fieldNames = fields.map((f: any) => (f && typeof f.id === 'string') ? f.id : '');
        
        if (!fieldNames.includes(msg.config.KEY_FIELD)) {
          throw new Error(`Key field not found in content type`);
        }
        if (!fieldNames.includes(msg.config.VALUE_FIELD)) {
          throw new Error(`Value field not found in content type`);
        }
        
        figma.ui.postMessage({ 
          type: 'preflight-content-result', 
          result: { success: true, message: `Content type validated ✓` }
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Content type check failed';
        figma.ui.postMessage({ 
          type: 'preflight-content-result', 
          result: { success: false, error: errorMsg }
        });
      }
      return;
    }

    if (msg.type === 'load-locales') {
      if (!msg.config) {
        figma.ui.postMessage({ type: 'error', message: 'Configuration missing' });
        return;
      }
      
      // Validate config
      const configError = validateConfig(msg.config);
      if (configError) {
        figma.ui.postMessage({ type: 'error', message: `Config error: ${configError}` });
        return;
      }
      
      const locales = await fetchLocales(msg.config);
      
      if (locales.length === 0) {
        figma.ui.postMessage({ type: 'error', message: 'No locales found in Contentful' });
        return;
      }
      
      figma.ui.postMessage({ type: 'locales-loaded', locales });
      return;
    }

    if (msg.type === 'apply-translation') {
      if (!msg.config || !msg.locale) {
        figma.ui.postMessage({ type: 'error', message: 'Configuration or locale missing' });
        return;
      }
      
      // Validate config
      const configError = validateConfig(msg.config);
      if (configError) {
        figma.ui.postMessage({ type: 'error', message: `Config error: ${configError}` });
        return;
      }
      
      // Validate locale
      if (!msg.locale.trim()) {
        figma.ui.postMessage({ type: 'error', message: 'Please select a valid locale' });
        return;
      }
      
      // Pre-flight check: verify translatable nodes exist
      const nodeCount = getTranslatableNodeCount(msg.config);
      if (nodeCount === 0) {
        figma.ui.postMessage({ type: 'error', message: 'No translatable text nodes found on current page' });
        return;
      }
      
      const translations = await fetchTranslations(msg.config, msg.locale);
      
      if (translations.length === 0) {
        figma.ui.postMessage({ type: 'error', message: `No translations found for locale: ${msg.locale}` });
        return;
      }
      
      const count = await applyTranslations(translations, msg.config);
      figma.ui.postMessage({ type: 'translation-applied', count });
      
      // Update node count after translation
      const updatedNodeCount = getTranslatableNodeCount(msg.config);
      figma.ui.postMessage({ type: 'node-count', count: updatedNodeCount });
      return;
    }

    // Content Preview Mode handlers
    if (msg.type === 'load-content-types') {
      if (!msg.config) {
        figma.ui.postMessage({ type: 'error', message: 'Configuration missing' });
        return;
      }
      
      try {
        const contentTypes = await fetchContentTypes(msg.config);
        figma.ui.postMessage({ type: 'content-types-loaded', contentTypes });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        figma.ui.postMessage({ type: 'error', message: errorMessage });
      }
      return;
    }

    if (msg.type === 'get-text-nodes') {
      try {
        const textNodes = getAllTextNodes();
        figma.ui.postMessage({ type: 'text-nodes-loaded', nodes: textNodes });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        figma.ui.postMessage({ type: 'error', message: errorMessage });
      }
      return;
    }

    if (msg.type === 'load-records') {
      if (!msg.config || !msg.contentType) {
        figma.ui.postMessage({ type: 'error', message: 'Configuration or content type missing' });
        return;
      }
      
      try {
        const records = await fetchRecords(msg.config, msg.contentType);
        figma.ui.postMessage({ type: 'records-loaded', records });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        figma.ui.postMessage({ type: 'error', message: errorMessage });
      }
      return;
    }

    if (msg.type === 'load-multiple-records') {
      if (!msg.config || !msg.contentTypes) {
        figma.ui.postMessage({ type: 'error', message: 'Configuration or content types missing' });
        return;
      }
      
      try {
        const recordsByContentType: { [key: string]: any[] } = {};
        
        // Load records from each content type
        for (const contentType of msg.contentTypes) {
          const records = await fetchRecords(msg.config, contentType);
          recordsByContentType[contentType] = records;
        }
        
        figma.ui.postMessage({ type: 'multiple-records-loaded', recordsByContentType });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        figma.ui.postMessage({ type: 'error', message: errorMessage });
      }
      return;
    }

    if (msg.type === 'apply-record-to-nodes') {
      if (!msg.mappings || !msg.recordFields) {
        figma.ui.postMessage({ type: 'error', message: 'Mappings or record data missing' });
        return;
      }
      
      try {
        await applyRecordToNodes(msg.mappings, msg.recordFields);
        figma.ui.postMessage({ type: 'record-applied' });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        figma.ui.postMessage({ type: 'error', message: errorMessage });
      }
      return;
    }

    if (msg.type === 'cancel') {
      figma.closePlugin();
      return;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    figma.ui.postMessage({ type: 'error', message: errorMessage });
  }
};

function getTranslatableNodeCount(config: ContentfulConfig): number {
  const pattern = new RegExp(config.NODE_NAME_PATTERN);
  const textNodes = figma.currentPage.findAll(
    (n) => n.type === 'TEXT' && pattern.test(n.name)
  ) as TextNode[];
  return textNodes.length;
}

async function fetchWithTimeout(url: string, options?: any, timeout: number = API_TIMEOUT): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Request timeout - please check your network connection'));
    }, timeout);
    
    fetch(url, options)
      .then(response => {
        clearTimeout(timeoutId);
        resolve(response);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

async function fetchLocales(config: ContentfulConfig): Promise<Locale[]> {
  const spaceId = encodeURIComponent(config.SPACE_ID);
  const environment = encodeURIComponent(config.ENVIRONMENT);
  const url = `https://preview.contentful.com/spaces/${spaceId}/environments/${environment}/locales`;
  const options = {
    headers: {
      'Authorization': `Bearer ${config.PREVIEW_TOKEN}`
    }
  };
  
  try {
    const response = await fetchWithTimeout(url, options, API_TIMEOUT);
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Invalid API credentials');
      }
      if (response.status === 404) {
        throw new Error('Space or environment not found');
      }
      throw new Error('Failed to fetch locales');
    }
    
    const data = await response.json();
    
    if (!data.items || !Array.isArray(data.items)) {
      throw new Error('Invalid response format');
    }
    
    return data.items
      .map((item: any) => ({
        code: (item && typeof item.code === 'string') ? item.code : '',
        name: (item && typeof item.name === 'string') ? item.name : ''
      }))
      .filter((item: Locale) => item.code.trim() !== '' && item.name.trim() !== '');
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load locales: ${error.message}`);
    }
    throw error;
  }
}

async function fetchTranslations(config: ContentfulConfig, locale: string): Promise<Translation[]> {
  // Validate and sanitize locale input
  if (!locale || typeof locale !== 'string' || locale.trim() === '') {
    throw new Error('Invalid locale');
  }
  
  const spaceId = encodeURIComponent(config.SPACE_ID);
  const environment = encodeURIComponent(config.ENVIRONMENT);
  const contentType = encodeURIComponent(config.CONTENT_TYPE);
  const localeParam = encodeURIComponent(locale.trim());
  
  const url = `https://preview.contentful.com/spaces/${spaceId}/environments/${environment}/entries?content_type=${contentType}&locale=${localeParam}`;
  const options = {
    headers: {
      'Authorization': `Bearer ${config.PREVIEW_TOKEN}`
    }
  };
  
  try {
    const response = await fetchWithTimeout(url, options, API_TIMEOUT);
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Invalid API credentials');
      }
      if (response.status === 404) {
        throw new Error('Content type not found');
      }
      throw new Error('Failed to fetch translations');
    }
    
    const data = await response.json();
    
    if (!data.items || !Array.isArray(data.items)) {
      throw new Error('Invalid response format');
    }
    
    return data.items
      .map((item: any) => {
        const fields = (item && typeof item.fields === 'object') ? item.fields : {};
        return {
          key: (typeof fields[config.KEY_FIELD] === 'string') ? fields[config.KEY_FIELD] : '',
          value: (typeof fields[config.VALUE_FIELD] === 'string') ? fields[config.VALUE_FIELD] : ''
        };
      })
      .filter((t: Translation) => t.key.trim() !== '' && t.value.trim() !== '');
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load translations: ${error.message}`);
    }
    throw error;
  }
}

async function applyTranslations(translations: Translation[], config: ContentfulConfig): Promise<number> {
  const translationMap = new Map<string, string>();
  for (const t of translations) {
    if (t.key && t.value) {
      translationMap.set(t.key, t.value);
    }
  }

  const pattern = new RegExp(config.NODE_NAME_PATTERN);
  const textNodes = figma.currentPage.findAll(
    (n) => n.type === 'TEXT' && pattern.test(n.name)
  ) as TextNode[];

  if (textNodes.length === 0) {
    throw new Error('No translatable text nodes found on current page');
  }

  let count = 0;
  const errors: string[] = [];
  const skipped: string[] = [];
  
  for (const node of textNodes) {
    // Check if node is locked
    if (node.locked) {
      skipped.push(`${node.name}: Locked`);
      continue;
    }
    
    const translation = translationMap.get(node.name);
    if (translation) {
      try {
        // Handle mixed fonts in text nodes
        if (node.hasMissingFont) {
          errors.push(`${node.name}: Missing font`);
          continue;
        }
        
        // Load all unique fonts in the text node
        const fontName = node.fontName;
        if (fontName === figma.mixed) {
          // Text has mixed fonts, load all ranges
          const uniqueFonts = new Set<string>();
          for (let i = 0; i < node.characters.length; i++) {
            const font = node.getRangeFontName(i, i + 1) as FontName;
            uniqueFonts.add(`${font.family}:${font.style}`);
            await figma.loadFontAsync(font);
          }
        } else {
          await figma.loadFontAsync(fontName as FontName);
        }
        
        node.characters = translation;
        count++;
      } catch (fontError) {
        errors.push(`${node.name}: ${fontError instanceof Error ? fontError.message : 'Font error'}`);
      }
    }
  }

  if (count === 0) {
    if (errors.length > 0) {
      throw new Error(`Translation failed: ${errors[0]}`);
    }
    if (skipped.length > 0) {
      throw new Error(`All nodes skipped: ${skipped[0]}`);
    }
    throw new Error('No matching translations found for text nodes');
  }

  return count;
}

// ========== Content Preview Mode Functions ==========

async function fetchContentTypes(config: ContentfulConfig): Promise<any[]> {
  const spaceId = encodeURIComponent(config.SPACE_ID);
  const environment = encodeURIComponent(config.ENVIRONMENT);
  const url = `https://preview.contentful.com/spaces/${spaceId}/environments/${environment}/content_types`;
  const options = {
    headers: {
      'Authorization': `Bearer ${config.PREVIEW_TOKEN}`
    }
  };
  
  try {
    const response = await fetchWithTimeout(url, options, API_TIMEOUT);
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Invalid API credentials');
      }
      if (response.status === 404) {
        throw new Error('Space or environment not found');
      }
      throw new Error('Failed to fetch content types');
    }
    
    const data = await response.json();
    
    if (!data.items || !Array.isArray(data.items)) {
      throw new Error('Invalid response format');
    }
    
    return data.items;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load content types: ${error.message}`);
    }
    throw error;
  }
}

function getAllTextNodes(): TextNodeInfo[] {
  const textNodes = figma.currentPage.findAll(
    (n) => n.type === 'TEXT'
  ) as TextNode[];
  
  return textNodes.map(node => ({
    id: node.id,
    name: node.name,
    characters: node.characters
  }));
}

async function fetchRecords(config: ContentfulConfig, contentType: string): Promise<any[]> {
  const spaceId = encodeURIComponent(config.SPACE_ID);
  const environment = encodeURIComponent(config.ENVIRONMENT);
  const contentTypeParam = encodeURIComponent(contentType);
  
  const url = `https://preview.contentful.com/spaces/${spaceId}/environments/${environment}/entries?content_type=${contentTypeParam}&limit=100`;
  const options = {
    headers: {
      'Authorization': `Bearer ${config.PREVIEW_TOKEN}`
    }
  };
  
  try {
    const response = await fetchWithTimeout(url, options, API_TIMEOUT);
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Invalid API credentials');
      }
      if (response.status === 404) {
        throw new Error('Content type not found');
      }
      throw new Error('Failed to fetch records');
    }
    
    const data = await response.json();
    
    if (!data.items || !Array.isArray(data.items)) {
      throw new Error('Invalid response format');
    }
    
    return data.items;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load records: ${error.message}`);
    }
    throw error;
  }
}

async function applyRecordToNodes(mappings: FieldMapping[], recordFields: any): Promise<void> {
  const errors: string[] = [];
  
  for (const mapping of mappings) {
    try {
      const node = figma.getNodeById(mapping.node) as TextNode | null;
      
      if (!node || node.type !== 'TEXT') {
        errors.push(`Node not found: ${mapping.node}`);
        continue;
      }
      
      if (node.locked) {
        errors.push(`Node is locked: ${node.name}`);
        continue;
      }
      
      const fieldValue = recordFields[mapping.field];
      if (fieldValue === undefined || fieldValue === null) {
        continue; // Skip if field value doesn't exist
      }
      
      const textValue = String(fieldValue);
      
      // Handle fonts
      if (node.hasMissingFont) {
        errors.push(`Missing font in node: ${node.name}`);
        continue;
      }
      
      const fontName = node.fontName;
      if (fontName === figma.mixed) {
        // Text has mixed fonts, load all ranges
        const uniqueFonts = new Set<string>();
        for (let i = 0; i < node.characters.length; i++) {
          const font = node.getRangeFontName(i, i + 1) as FontName;
          uniqueFonts.add(`${font.family}:${font.style}`);
          await figma.loadFontAsync(font);
        }
      } else {
        await figma.loadFontAsync(fontName as FontName);
      }
      
      node.characters = textValue;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Error applying to node: ${errorMsg}`);
    }
  }
  
  if (errors.length > 0) {
    console.warn('Some mappings failed:', errors);
  }
}
