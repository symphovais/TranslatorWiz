# Code Review: Bulletproofing ConteFi

## Executive Summary

This review identifies potential crash points and proposes bulletproofing improvements to ensure graceful error handling throughout the plugin.

---

## Critical Issues Found

### 1. **Selection Change Handler - No Error Handling**

**Location**: `code.ts` lines 109-120

**Issue**: 
```typescript
figma.on('selectionchange', () => {
  const selection = figma.currentPage.selection;
  
  if (selection.length === 1 && selection[0].type === 'TEXT') {
    const textNode = selection[0] as TextNode;
    figma.ui.postMessage({
      type: 'text-node-selected',
      nodeName: textNode.name,
      nodeText: textNode.characters
    });
  }
});
```

**Problems**:
- No try-catch wrapper
- `figma.currentPage` could be null
- `textNode.characters` could throw if font is missing
- No validation of node existence

**Risk**: Plugin crash on selection change

---

### 2. **Message Handler - Insufficient Type Guards**

**Location**: `code.ts` lines 122-132

**Issue**:
```typescript
figma.ui.onmessage = async (msg: { 
  type: string; 
  config?: ContentfulConfig; 
  locale?: string; 
  // ...
}) => {
```

**Problems**:
- No validation that `msg` is an object
- No validation that `msg.type` is a string
- Optional fields accessed without null checks
- No validation of nested object structures

**Risk**: Runtime errors from malformed messages

---

### 3. **Regex Pattern Compilation - Repeated Without Caching**

**Location**: Multiple places (lines 100, 419, 494, 624)

**Issue**:
```typescript
const pattern = new RegExp(config.NODE_NAME_PATTERN);
```

**Problems**:
- Regex compiled multiple times
- No error handling in some locations
- Performance impact on large documents

**Risk**: Performance degradation, potential crashes on invalid regex

---

### 4. **Font Loading - No Comprehensive Error Handling**

**Location**: `code.ts` lines 646-672

**Issue**:
```typescript
if (node.hasMissingFont) {
  errors.push(`${node.name}: Missing font`);
  continue;
}

const fontName = node.fontName;
if (fontName === figma.mixed) {
  // Load mixed fonts
  for (let i = 0; i < node.characters.length; i++) {
    const font = node.getRangeFontName(i, i + 1) as FontName;
    await figma.loadFontAsync(font);
  }
} else {
  await figma.loadFontAsync(fontName as FontName);
}
```

**Problems**:
- `getRangeFontName` can throw
- No timeout on font loading
- No handling of unavailable fonts
- Loop could be very slow on long text

**Risk**: Plugin hangs or crashes on font issues

---

### 5. **Network Requests - Incomplete Error Information**

**Location**: Multiple fetch functions

**Issue**:
```typescript
const response = await fetchWithTimeout(url, options, API_TIMEOUT);

if (!response.ok) {
  if (response.status === 401 || response.status === 403) {
    throw new Error('Invalid API credentials');
  }
  throw new Error('Failed to fetch...');
}
```

**Problems**:
- No response body logged for debugging
- Generic error messages
- No retry logic
- No handling of network offline state

**Risk**: Poor debugging experience, unclear errors to users

---

### 6. **Node Access by ID - No Validation**

**Location**: `code.ts` line 785

**Issue**:
```typescript
const node = figma.getNodeById(mapping.node) as TextNode | null;

if (!node || node.type !== 'TEXT') {
  errors.push(`Node not found: ${mapping.node}`);
  continue;
}
```

**Problems**:
- Node could have been deleted
- Node could be on different page
- No handling of locked parent containers

**Risk**: Silent failures, incomplete updates

---

### 7. **UI Message Handling - No Sanitization**

**Location**: `ui.html` - multiple locations

**Issue**:
```javascript
const errorMsg = sanitizeString(msg.message || 'Unknown error occurred');
```

**Problems**:
- `sanitizeString` truncates at 500 chars (could lose important info)
- No validation of message structure
- XSS risk if sanitization fails

**Risk**: Security vulnerabilities, lost error information

---

### 8. **Array Operations - No Bounds Checking**

**Location**: `ui.html` - renderItemsTable

**Issue**:
```javascript
filteredItems.forEach((item, index) => {
  const originalIndex = textItems.findIndex(original => original.id === item.id);
  // ...
});
```

**Problems**:
- `findIndex` returns -1 if not found
- No handling of -1 case
- Could cause array access errors

**Risk**: UI rendering failures

---

### 9. **Contentful API Responses - Insufficient Validation**

**Location**: Multiple fetch functions

**Issue**:
```typescript
const data = await response.json();

if (!data.items || !Array.isArray(data.items)) {
  throw new Error('Invalid response format');
}

return data.items.map((item: any) => {
  const fields = (item && typeof item.fields === 'object') ? item.fields : {};
  // ...
});
```

**Problems**:
- No validation of item structure
- Assumes fields exist
- No handling of partial data
- No validation of field types

**Risk**: Runtime errors from unexpected API responses

---

### 10. **Storage Operations - No Quota Handling**

**Location**: `code.ts` lines 66-72

**Issue**:
```typescript
async function saveConfigToStorage(config: ContentfulConfig): Promise<void> {
  try {
    await figma.clientStorage.setAsync('translatorwiz_config', config);
  } catch (e) {
    throw new Error('Failed to save config to storage');
  }
}
```

**Problems**:
- No handling of quota exceeded
- No handling of storage unavailable
- Generic error message loses original error

**Risk**: Config loss, unclear errors

---

## Recommended Improvements

### Priority 1: Critical Error Handlers

#### 1.1 Wrap Selection Handler
```typescript
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
```

#### 1.2 Add Message Validation
```typescript
figma.ui.onmessage = async (msg: any) => {
  try {
    // Validate message structure
    if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') {
      console.error('Invalid message format:', msg);
      return;
    }
    
    // Rest of handler...
  } catch (error) {
    console.error('Message handler error:', error);
    
    // Send error to UI
    try {
      figma.ui.postMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      });
    } catch (postError) {
      console.error('Failed to send error to UI:', postError);
    }
  }
};
```

#### 1.3 Improve Font Loading
```typescript
async function loadNodeFonts(node: TextNode): Promise<boolean> {
  try {
    if (node.hasMissingFont) {
      return false;
    }
    
    const fontName = node.fontName;
    
    if (fontName === figma.mixed) {
      // Limit iterations to prevent hangs
      const maxLength = Math.min(node.characters.length, 1000);
      const fontsToLoad = new Set<string>();
      
      for (let i = 0; i < maxLength; i++) {
        try {
          const font = node.getRangeFontName(i, i + 1) as FontName;
          const fontKey = `${font.family}:${font.style}`;
          fontsToLoad.add(fontKey);
        } catch (e) {
          console.warn(`Could not get font at position ${i}:`, e);
        }
      }
      
      // Load all unique fonts with timeout
      const loadPromises = Array.from(fontsToLoad).map(async (fontKey) => {
        const [family, style] = fontKey.split(':');
        try {
          await Promise.race([
            figma.loadFontAsync({ family, style }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Font load timeout')), 5000)
            )
          ]);
        } catch (e) {
          console.warn(`Could not load font ${fontKey}:`, e);
        }
      });
      
      await Promise.all(loadPromises);
    } else {
      await Promise.race([
        figma.loadFontAsync(fontName as FontName),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Font load timeout')), 5000)
        )
      ]);
    }
    
    return true;
  } catch (error) {
    console.error('Font loading error:', error);
    return false;
  }
}
```

#### 1.4 Add Network Error Details
```typescript
async function fetchWithTimeout(url: string, options?: any, timeout: number = API_TIMEOUT): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Request timeout after ${timeout}ms - please check your network connection`));
    }, timeout);
    
    fetch(url, options)
      .then(async response => {
        clearTimeout(timeoutId);
        
        // Log response for debugging
        if (!response.ok) {
          let errorBody = '';
          try {
            errorBody = await response.text();
            console.error('API Error Response:', {
              status: response.status,
              statusText: response.statusText,
              body: errorBody.substring(0, 500)
            });
          } catch (e) {
            console.error('Could not read error response body');
          }
        }
        
        resolve(response);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        console.error('Network error:', error);
        reject(new Error(`Network error: ${error.message || 'Connection failed'}`));
      });
  });
}
```

### Priority 2: Data Validation

#### 2.1 Validate API Responses
```typescript
function validateContentfulItem(item: any): boolean {
  return (
    item &&
    typeof item === 'object' &&
    item.sys &&
    typeof item.sys === 'object' &&
    typeof item.sys.id === 'string' &&
    item.fields &&
    typeof item.fields === 'object'
  );
}

function validateLocale(locale: any): locale is Locale {
  return (
    locale &&
    typeof locale === 'object' &&
    typeof locale.code === 'string' &&
    typeof locale.name === 'string' &&
    locale.code.trim() !== '' &&
    locale.name.trim() !== ''
  );
}
```

#### 2.2 Safe Array Operations
```typescript
function renderItemsTable() {
  const tbody = document.getElementById('items-table-body');
  if (!tbody) {
    console.error('Table body not found');
    return;
  }
  
  tbody.innerHTML = '';
  
  const searchTerm = document.getElementById('search-input')?.value?.toLowerCase()?.trim() || '';
  
  if (!Array.isArray(textItems)) {
    console.error('textItems is not an array');
    return;
  }
  
  const filteredItems = textItems.filter(item => {
    if (!item || typeof item !== 'object') return false;
    
    const name = String(item.name || '').toLowerCase();
    const characters = String(item.characters || '').toLowerCase();
    
    return name.includes(searchTerm) || characters.includes(searchTerm);
  });
  
  filteredItems.forEach((item) => {
    const originalIndex = textItems.findIndex(original => 
      original && original.id === item.id
    );
    
    if (originalIndex === -1) {
      console.warn('Could not find original index for item:', item.id);
      return; // Skip this item
    }
    
    // Rest of rendering...
  });
}
```

### Priority 3: User-Friendly Error Messages

#### 3.1 Error Message Mapping
```typescript
const ERROR_MESSAGES: { [key: string]: string } = {
  'Invalid API credentials': 'Your Contentful API token is invalid or expired. Please check your settings.',
  'Space or environment not found': 'Could not find the specified Contentful space or environment. Please verify your configuration.',
  'Content type not found': 'The content type does not exist in your Contentful space. Please check your settings.',
  'Request timeout': 'The request took too long. Please check your internet connection and try again.',
  'Network error': 'Could not connect to Contentful. Please check your internet connection.',
  'No translatable text nodes found': 'No text layers matching your pattern were found on this page. Make sure text layers are named correctly.',
};

function getUserFriendlyError(error: Error): string {
  const message = error.message;
  
  for (const [key, friendlyMessage] of Object.entries(ERROR_MESSAGES)) {
    if (message.includes(key)) {
      return friendlyMessage;
    }
  }
  
  return `An error occurred: ${message}`;
}
```

### Priority 4: Performance Optimizations

#### 4.1 Cache Regex Patterns
```typescript
const regexCache = new Map<string, RegExp>();

function getCompiledRegex(pattern: string): RegExp | null {
  if (regexCache.has(pattern)) {
    return regexCache.get(pattern)!;
  }
  
  try {
    const regex = new RegExp(pattern);
    regexCache.set(pattern, regex);
    return regex;
  } catch (e) {
    console.error('Invalid regex pattern:', pattern, e);
    return null;
  }
}
```

#### 4.2 Debounce Search
```typescript
let searchTimeout: number | null = null;

document.getElementById('search-input')?.addEventListener('input', () => {
  if (searchTimeout !== null) {
    clearTimeout(searchTimeout);
  }
  
  searchTimeout = window.setTimeout(() => {
    renderItemsTable();
    searchTimeout = null;
  }, 300); // Wait 300ms after user stops typing
});
```

---

## Testing Checklist

### Error Scenarios to Test

- [ ] Invalid Contentful credentials
- [ ] Network offline
- [ ] Malformed API responses
- [ ] Missing fonts in text nodes
- [ ] Deleted nodes during operation
- [ ] Locked nodes
- [ ] Very long text (>10,000 characters)
- [ ] Invalid regex patterns
- [ ] Empty/null config values
- [ ] Storage quota exceeded
- [ ] Rapid message sending
- [ ] Page switching during operation
- [ ] Plugin closed during async operation

### Edge Cases

- [ ] Zero translatable nodes
- [ ] Duplicate node names
- [ ] Special characters in keys
- [ ] Unicode in text content
- [ ] Mixed RTL/LTR text
- [ ] Very large datasets (1000+ items)
- [ ] Concurrent operations
- [ ] Browser tab inactive

---

## Implementation Priority

1. **Immediate** (Prevents crashes):
   - Selection handler error wrapping
   - Message validation
   - Font loading improvements

2. **High** (Improves reliability):
   - Network error details
   - API response validation
   - Safe array operations

3. **Medium** (Enhances UX):
   - User-friendly error messages
   - Regex caching
   - Search debouncing

4. **Low** (Nice to have):
   - Retry logic
   - Offline detection
   - Performance monitoring

---

## Conclusion

The plugin has good basic error handling but needs bulletproofing in critical areas:
- Selection and message handlers need comprehensive try-catch
- Font loading needs timeouts and limits
- API responses need thorough validation
- Array operations need bounds checking
- Error messages need to be user-friendly

Implementing these improvements will make the plugin production-ready and crash-resistant.
