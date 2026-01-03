// ConteFi - Figma plugin for Contentful-based translations

figma.showUI(__html__, { width: 800, height: 500, themeColors: true });

interface ContentfulConfig {
  SPACE_ID: string;
  ENVIRONMENT: string;
  CMA_TOKEN: string;
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
  SPACE_ID: "",
  ENVIRONMENT: "master",
  CMA_TOKEN: "",
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
  if (!config.CMA_TOKEN || !config.CMA_TOKEN.trim()) {
    return 'CMA_TOKEN is required';
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

// Listen for selection changes in Figma
figma.on('selectionchange', () => {
  try {
    if (!figma.currentPage) return;
    
    const selection = figma.currentPage.selection;
    
    if (selection.length === 1 && selection[0] && selection[0].type === 'TEXT') {
      const textNode = selection[0] as TextNode;
      
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
});

figma.ui.onmessage = async (msg: any) => {
  try {
    // Validate message structure
    if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') {
      console.error('Invalid message format:', msg);
      return;
    }
    if (msg.type === 'init') {
      // Load config from storage
      configData = await loadConfigFromStorage();
      
      // Always send config to UI (even if incomplete) so UI can show onboarding
      figma.ui.postMessage({ type: 'config-loaded', config: configData });
      
      // Count translatable nodes and send to UI (only if config is valid)
      const configError = validateConfig(configData);
      if (!configError) {
        const nodeCount = getTranslatableNodeCount(configData);
        figma.ui.postMessage({ type: 'node-count', count: nodeCount });
      }
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
        const url = `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/content_types/${contentType}`;
        const options = {
          headers: {
            'Authorization': `Bearer ${msg.config.CMA_TOKEN}`
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

    // Write mode handlers
    if (msg.type === 'get-translatable-nodes') {
      if (!msg.config) {
        figma.ui.postMessage({ type: 'error', message: 'Configuration missing' });
        return;
      }
      
      try {
        const pattern = new RegExp(msg.config.NODE_NAME_PATTERN);
        const textNodes = figma.currentPage.findAll(
          (n) => n.type === 'TEXT' && pattern.test(n.name)
        ) as TextNode[];
        
        const nodes = textNodes.map(node => ({
          id: node.id,
          name: node.name,
          characters: node.characters
        }));
        
        figma.ui.postMessage({ type: 'translatable-nodes-loaded', nodes });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        figma.ui.postMessage({ type: 'error', message: errorMessage });
      }
      return;
    }

    if (msg.type === 'get-all-contentful-items') {
      if (!msg.config) {
        figma.ui.postMessage({ type: 'error', message: 'Configuration missing' });
        return;
      }
      
      try {
        const items = await fetchAllContentfulItems(msg.config);
        figma.ui.postMessage({ type: 'contentful-items-loaded', items });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        figma.ui.postMessage({ type: 'error', message: errorMessage });
      }
      return;
    }

    if (msg.type === 'save-contentful-item') {
      if (!msg.config || !msg.item) {
        figma.ui.postMessage({ type: 'error', message: 'Configuration or item missing' });
        return;
      }
      
      try {
        const result = await saveItemToContentful(msg.config, msg.item);
        figma.ui.postMessage({ 
          type: 'item-saved', 
          key: msg.item.key,
          success: result.success,
          error: result.error,
          errorDetails: result.errorDetails
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorDetails = error instanceof Error ? { exception: error.name, stack: error.stack } : { exception: String(error) };
        figma.ui.postMessage({ 
          type: 'item-saved', 
          key: msg.item.key,
          success: false,
          error: errorMessage,
          errorDetails
        });
      }
      return;
    }

    if (msg.type === 'get-window-size-state') {
      const isCompact = await figma.clientStorage.getAsync('window-size-compact');
      console.log('Retrieved window size state:', isCompact);
      figma.ui.postMessage({ type: 'window-size-state', isCompact: isCompact || false });
      return;
    }

    if (msg.type === 'resize-window') {
      console.log('Resize window message received:', msg.width, msg.height, 'isCompact:', msg.isCompact);
      if (msg.width && msg.height) {
        try {
          figma.ui.resize(msg.width, msg.height);
          console.log('Window resized successfully to:', msg.width, 'x', msg.height);

          // Store the compact state
          if (msg.isCompact !== undefined) {
            await figma.clientStorage.setAsync('window-size-compact', msg.isCompact);
            console.log('Stored window-size-compact:', msg.isCompact);
          }
        } catch (error) {
          console.error('Failed to resize window:', error);
        }
      } else {
        console.error('Invalid resize dimensions:', msg.width, msg.height);
      }
      return;
    }

    if (msg.type === 'update-multiple-nodes') {
      try {
        const { nodeIds, newText } = msg;

        if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0) {
          figma.ui.postMessage({
            type: 'update-multiple-nodes-result',
            success: false,
            error: 'Invalid node IDs'
          });
          return;
        }

        let successCount = 0;
        const errors: string[] = [];

        for (const nodeId of nodeIds) {
          try {
            const node = await figma.getNodeByIdAsync(nodeId);

            if (!node || !('type' in node) || node.type !== 'TEXT') {
              errors.push(`Node ${nodeId}: Not found or not a text node`);
              continue;
            }

            const textNode = node as TextNode;

            if (textNode.hasMissingFont) {
              errors.push(`${node.name}: Missing font`);
              continue;
            }

            // Load fonts (handle mixed fonts like applyTranslations)
            const fontName = textNode.fontName;
            if (fontName === figma.mixed) {
              // Text has mixed fonts, load all ranges
              for (let i = 0; i < textNode.characters.length; i++) {
                const font = textNode.getRangeFontName(i, i + 1) as FontName;
                await figma.loadFontAsync(font);
              }
            } else {
              await figma.loadFontAsync(fontName as FontName);
            }

            // Update the text
            textNode.characters = newText;
            successCount++;

          } catch (nodeError) {
            const errorMsg = nodeError instanceof Error ? nodeError.message : String(nodeError);
            errors.push(`Node ${nodeId}: ${errorMsg}`);
          }
        }

        figma.ui.postMessage({
          type: 'update-multiple-nodes-result',
          success: successCount > 0,
          count: successCount,
          errors: errors.length > 0 ? errors : undefined,
          error: successCount === 0 ? errors[0] : undefined
        });

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        figma.ui.postMessage({
          type: 'update-multiple-nodes-result',
          success: false,
          error: errorMsg
        });
      }
      return;
    }

    if (msg.type === 'select-node') {
      try {
        const { nodeId } = msg;
        const node = await figma.getNodeByIdAsync(nodeId);
        if (node && 'type' in node) {
          figma.currentPage.selection = [node as SceneNode];
          figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
        }
      } catch (error) {
        console.error('Error selecting node:', error);
      }
      return;
    }

    if (msg.type === 'cancel') {
      figma.closePlugin();
      return;
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

function getTranslatableNodeCount(config: ContentfulConfig): number {
  try {
    if (!figma.currentPage) return 0;
    
    const pattern = new RegExp(config.NODE_NAME_PATTERN);
    const textNodes = figma.currentPage.findAll(
      (n) => {
        if (!n || n.type !== 'TEXT') return false;
        if (!n.name) return false;
        return pattern.test(n.name);
      }
    ) as TextNode[];
    return textNodes.length;
  } catch (error) {
    console.error('Error counting translatable nodes:', error);
    return 0;
  }
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
  const url = `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/locales`;
  const options = {
    headers: {
      'Authorization': `Bearer ${config.CMA_TOKEN}`
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
  
  const url = `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/entries?content_type=${contentType}&locale=${localeParam}`;
  const options = {
    headers: {
      'Authorization': `Bearer ${config.CMA_TOKEN}`
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
  const url = `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/content_types`;
  const options = {
    headers: {
      'Authorization': `Bearer ${config.CMA_TOKEN}`
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
  
  const url = `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/entries?content_type=${contentTypeParam}&limit=100`;
  const options = {
    headers: {
      'Authorization': `Bearer ${config.CMA_TOKEN}`
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

// ========== Write Mode Functions ==========

async function fetchAllContentfulItems(config: ContentfulConfig): Promise<{ [key: string]: { value: string; id: string } }> {
  const spaceId = encodeURIComponent(config.SPACE_ID);
  const environment = encodeURIComponent(config.ENVIRONMENT);
  const contentType = encodeURIComponent(config.CONTENT_TYPE);
  
  const url = `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/entries?content_type=${contentType}&limit=1000`;
  const options = {
    headers: {
      'Authorization': `Bearer ${config.CMA_TOKEN}`
    }
  };
  
  try {
    const response = await fetchWithTimeout(url, options, API_TIMEOUT);
    
    if (!response.ok) {
      throw new Error('Failed to fetch Contentful items');
    }
    
    const data = await response.json();
    const items: { [key: string]: { value: string; id: string } } = {};
    
    if (data.items && Array.isArray(data.items)) {
      for (const item of data.items) {
        // Skip archived entries only (unpublished entries are OK)
        const isArchived = item.sys.archivedVersion !== undefined;
        
        if (isArchived) {
          console.log(`Skipping archived entry ${item.sys.id}`);
          continue;
        }
        
        const fields = item.fields || {};
        // CMA API returns fields in localized format: { 'en-US': 'value' }
        const keyField = fields[config.KEY_FIELD];
        const valueField = fields[config.VALUE_FIELD];
        
        // Get the actual value from the locale (default to 'en-US' or first available locale)
        let key: string | null = null;
        let value: string | null = null;
        
        if (keyField && typeof keyField === 'object') {
          key = keyField['en-US'] || keyField[Object.keys(keyField)[0]];
        }
        
        if (valueField && typeof valueField === 'object') {
          value = valueField['en-US'] || valueField[Object.keys(valueField)[0]];
        }
        
        if (key && value) {
          items[key] = {
            value: value,
            id: item.sys.id
          };
        }
      }
    }
    
    return items;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch Contentful items: ${error.message}`);
    }
    throw error;
  }
}

async function saveItemToContentful(config: ContentfulConfig, item: any): Promise<{ success: boolean; error?: string; errorDetails?: any }> {
  const spaceId = encodeURIComponent(config.SPACE_ID);
  const environment = encodeURIComponent(config.ENVIRONMENT);
  const contentType = config.CONTENT_TYPE;
  
  try {
    if (item.isUpdate && item.entryId) {
      // Update existing entry
      const url = `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/entries/${item.entryId}`;
      
      // First, get the current entry to get the version
      const getResponse = await fetchWithTimeout(url, {
        headers: {
          'Authorization': `Bearer ${config.CMA_TOKEN}`
        }
      }, API_TIMEOUT);
      
      if (!getResponse.ok) {
        const errorText = await getResponse.text();
        console.error('[Contentful] Failed to fetch entry for update:', errorText);
        return { 
          success: false, 
          error: `Could not fetch entry (${getResponse.status})`, 
          errorDetails: { status: getResponse.status, response: errorText, operation: 'fetch', entryId: item.entryId }
        };
      }
      
      const currentEntry = await getResponse.json();
      const version = currentEntry.sys.version;
      
      // Update the entry
      const updateResponse = await fetchWithTimeout(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${config.CMA_TOKEN}`,
          'Content-Type': 'application/vnd.contentful.management.v1+json',
          'X-Contentful-Version': version.toString()
        },
        body: JSON.stringify({
          fields: {
            [config.KEY_FIELD]: { 'en-US': item.key },
            [config.VALUE_FIELD]: { 'en-US': item.value }
          }
        })
      }, API_TIMEOUT);
      
      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('[Contentful] Update failed:', errorText);
        return { 
          success: false, 
          error: `Update failed (${updateResponse.status})`, 
          errorDetails: { status: updateResponse.status, response: errorText, operation: 'update', entryId: item.entryId, version }
        };
      }
      
      // Publish the updated entry
      const updatedEntry = await updateResponse.json();
      const publishUrl = `${url}/published`;
      const publishResponse = await fetchWithTimeout(publishUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${config.CMA_TOKEN}`,
          'X-Contentful-Version': updatedEntry.sys.version.toString()
        }
      }, API_TIMEOUT);
      
      if (!publishResponse.ok) {
        const errorText = await publishResponse.text();
        console.error('[Contentful] Publish failed:', errorText);
        return { 
          success: false, 
          error: `Publish failed (${publishResponse.status})`, 
          errorDetails: { status: publishResponse.status, response: errorText, operation: 'publish', entryId: item.entryId }
        };
      }
      
      return { success: true };
    } else {
      // Create new entry
      const url = `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/entries`;
      
      const createResponse = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.CMA_TOKEN}`,
          'Content-Type': 'application/vnd.contentful.management.v1+json',
          'X-Contentful-Content-Type': contentType
        },
        body: JSON.stringify({
          fields: {
            [config.KEY_FIELD]: { 'en-US': item.key },
            [config.VALUE_FIELD]: { 'en-US': item.value }
          }
        })
      }, API_TIMEOUT);
      
      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('[Contentful] Create failed:', errorText);
        return { 
          success: false, 
          error: `Create failed (${createResponse.status})`, 
          errorDetails: { status: createResponse.status, response: errorText, operation: 'create', key: item.key }
        };
      }
      
      // Publish the new entry
      const newEntry = await createResponse.json();
      const publishUrl = `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/entries/${newEntry.sys.id}/published`;
      const publishResponse = await fetchWithTimeout(publishUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${config.CMA_TOKEN}`,
          'X-Contentful-Version': newEntry.sys.version.toString()
        }
      }, API_TIMEOUT);
      
      if (!publishResponse.ok) {
        const errorText = await publishResponse.text();
        console.error('[Contentful] Publish after create failed:', errorText);
        return { 
          success: false, 
          error: `Created but publish failed (${publishResponse.status})`, 
          errorDetails: { status: publishResponse.status, response: errorText, operation: 'publish-new', entryId: newEntry.sys.id }
        };
      }
      
      return { success: true };
    }
  } catch (error) {
    console.error('[Contentful] Exception:', error);
    if (error instanceof Error) {
      return { 
        success: false, 
        error: error.message, 
        errorDetails: { exception: error.name, stack: error.stack, operation: item.isUpdate ? 'update' : 'create' }
      };
    }
    return { 
      success: false, 
      error: 'Unknown error occurred', 
      errorDetails: { exception: String(error) }
    };
  }
}
