# ContentFi - Figma Plugin Knowledge Base

## 📋 Overview

**ContentFi** is a Figma plugin that integrates with Contentful CMS to manage translations and content directly within Figma designs. It enables designers to apply translations to text layers, preview content from Contentful, and write back translation keys to Contentful.

### Key Features
- 🌍 **Multi-language Translation**: Apply translations from Contentful to Figma text nodes
- 📝 **Content Preview**: Preview and apply Contentful entries to Figma designs
- ✍️ **Write Mode**: Push translation keys from Figma back to Contentful
- 🔐 **OAuth 2.0 Support**: Secure authentication with Contentful
- 🎨 **Theme Support**: Adapts to Figma's light/dark themes
- ⚙️ **Configurable**: Flexible configuration for different Contentful setups

---

## 🏗️ Architecture

### File Structure
```
ContentFi/
├── manifest.json          # Plugin manifest (metadata, permissions)
├── code.ts               # Main plugin logic (TypeScript source)
├── code.js               # Compiled JavaScript (generated from code.ts)
├── ui.html               # Plugin UI (HTML + CSS + JavaScript)
├── package.json          # NPM dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── translation-config.json # Default Contentful configuration
├── docs/                 # Documentation
│   ├── IMPLEMENTATION-SUMMARY.md
│   ├── SETTINGS-GUIDE.md
│   ├── CODE-REVIEW-IMPROVEMENTS.md
│   └── CODE_REVIEW.md
├── dist-package/         # Distribution files
└── oauth-worker/         # Cloudflare Worker for OAuth (if implemented)
```

### Technology Stack
- **Language**: TypeScript (compiled to JavaScript)
- **UI Framework**: Vanilla HTML/CSS/JavaScript
- **API**: Figma Plugin API
- **External Integration**: Contentful CMS (Content Management API)
- **Build Tool**: TypeScript Compiler (tsc)
- **Package Manager**: NPM

---

## 🔧 Core Components

### 1. Plugin Backend (`code.ts`)

The backend runs in Figma's plugin sandbox and handles:

#### Configuration Management
- Loads/saves configuration from Figma's `clientStorage`
- Validates configuration fields (Space ID, Environment, CMA Token, etc.)
- Default config pattern: `^jams_` for matching text node names

#### Key Functions

**`loadConfigFromStorage()`**
- Retrieves stored configuration from Figma's client storage
- Merges with default config if fields are missing

**`validateConfig(config)`**
- Validates all required configuration fields
- Tests regex pattern validity
- Returns error message or null if valid

**`fetchLocales(config)`**
- Fetches available locales from Contentful
- Endpoint: `/spaces/{spaceId}/environments/{env}/locales`
- Returns array of `{code, name}` objects

**`fetchTranslations(config, locale)`**
- Fetches translation entries for a specific locale
- Endpoint: `/spaces/{spaceId}/environments/{env}/entries?content_type={type}&locale={locale}`
- Returns array of `{key, value}` objects

**`applyTranslations(translations, config)`**
- Finds text nodes matching the configured pattern
- Loads required fonts (handles mixed fonts)
- Updates node characters with translation values
- Returns count of updated nodes

**`fetchContentTypes(config)`**
- Fetches all content types from Contentful
- Used in Content Preview mode

**`fetchRecords(config, contentType)`**
- Fetches entries for a specific content type
- Limited to 100 records per request

**`applyRecordToNodes(mappings, recordFields)`**
- Applies field values from a Contentful record to mapped Figma text nodes
- Handles font loading and locked nodes

**`fetchAllContentfulItems(config)`**
- Fetches all items of the translation content type
- Used in Write mode to check existing keys

**`saveItemToContentful(config, item)`**
- Creates or updates translation entries in Contentful
- Handles versioning for updates
- Publishes entries after creation/update

#### Message Handlers
The plugin uses message passing between UI and backend:

| Message Type | Purpose |
|-------------|---------|
| `init` | Load config and count translatable nodes |
| `save-config` | Save configuration to storage |
| `preflight-test-locales` | Test connection by fetching locales |
| `preflight-check-content` | Validate content type and fields |
| `load-locales` | Load available locales |
| `apply-translation` | Apply translations to text nodes |
| `load-content-types` | Load content types for preview mode |
| `get-text-nodes` | Get all text nodes on current page |
| `load-records` | Load records for a content type |
| `load-multiple-records` | Load records from multiple content types |
| `apply-record-to-nodes` | Apply record data to nodes |
| `get-translatable-nodes` | Get nodes matching pattern |
| `get-all-contentful-items` | Fetch all translation items |
| `save-contentful-item` | Save item to Contentful |
| `cancel` | Close plugin |

#### Selection Monitoring
```typescript
figma.on('selectionchange', () => {
  // Detects when user selects a text node
  // Sends node name and text to UI
});
```

---

### 2. Plugin UI (`ui.html`)

A single-file UI containing HTML, CSS, and JavaScript.

#### UI Modes

**1. Translation Mode** (Default)
- Select locale from dropdown
- Apply translations to matching text nodes
- Shows count of translatable nodes
- Displays success/error messages

**2. Content Preview Mode**
- Select content type(s)
- Load records from Contentful
- Map fields to Figma text nodes
- Preview content in designs

**3. Write Mode**
- View translatable nodes on page
- See existing Contentful items
- Create new translation keys
- Update existing translations
- Bulk save to Contentful

**4. Settings Mode**
- Configure Contentful credentials
- Test connection with preflight checks
- OAuth authentication (if configured)
- Save/validate configuration

#### Key UI Components

**Theme Support**
```javascript
// Detects Figma theme and applies appropriate class
if (theme === 'dark') {
  document.body.classList.add('figma-dark');
}
```

**OAuth Integration**
- Session-only token storage (not persisted)
- OAuth popup flow with postMessage communication
- Fallback to preview token if OAuth not connected
- Visual connection status indicator

**Field Mapping Interface**
- Drag-and-drop or manual mapping
- Field-to-node associations
- Visual feedback for mapped items

**Validation & Error Handling**
- Input validation before API calls
- User-friendly error messages
- Loading states and animations
- Success confirmations

---

## 🔌 Contentful Integration

### API Endpoints Used

#### Content Management API (CMA)
Base URL: `https://api.contentful.com`

**Locales**
```
GET /spaces/{spaceId}/environments/{env}/locales
Authorization: Bearer {token}
```

**Content Types**
```
GET /spaces/{spaceId}/environments/{env}/content_types
GET /spaces/{spaceId}/environments/{env}/content_types/{contentType}
```

**Entries**
```
GET /spaces/{spaceId}/environments/{env}/entries?content_type={type}&locale={locale}
GET /spaces/{spaceId}/environments/{env}/entries?content_type={type}&limit={limit}
POST /spaces/{spaceId}/environments/{env}/entries
PUT /spaces/{spaceId}/environments/{env}/entries/{entryId}
PUT /spaces/{spaceId}/environments/{env}/entries/{entryId}/published
```

### Authentication

**Preview Token** (Read-only)
- Configured in settings
- Limited permissions
- Simpler setup

**OAuth 2.0** (Full access)
- Implicit flow
- Session-only storage
- Requires Cloudflare Worker for redirect
- User-specific permissions

### Configuration Fields

| Field | Description | Example |
|-------|-------------|---------|
| SPACE_ID | Contentful space identifier | `4fejn84m8z5w` |
| ENVIRONMENT | Environment name | `master` |
| CMA_TOKEN | Preview token or OAuth token | `8R6kV7o...` |
| CONTENT_TYPE | Content type ID for translations | `translation` |
| KEY_FIELD | Field name for translation key | `key` |
| VALUE_FIELD | Field name for translation value | `value` |
| NODE_NAME_PATTERN | Regex pattern for matching nodes | `^jams_` |

---

## 🎯 Workflows

### Translation Workflow

1. **Setup**
   - Configure Contentful credentials in Settings
   - Define node name pattern (e.g., `^jams_`)
   - Validate connection

2. **Prepare Figma**
   - Name text nodes with pattern prefix (e.g., `jams_welcome_title`)
   - Ensure nodes are unlocked

3. **Apply Translations**
   - Open plugin
   - Select target locale
   - Click "Apply Translation"
   - Plugin updates matching nodes

### Content Preview Workflow

1. **Select Content Type**
   - Switch to Content Preview mode
   - Choose one or more content types

2. **Load Records**
   - Plugin fetches entries from Contentful
   - Displays available records

3. **Map Fields**
   - Select a record
   - Map Contentful fields to Figma text nodes
   - Preview shows field values

4. **Apply**
   - Click "Apply to Nodes"
   - Text nodes update with record data

### Write Mode Workflow

1. **View Nodes**
   - Plugin scans page for translatable nodes
   - Shows node names and current text

2. **Check Existing**
   - Loads existing Contentful items
   - Highlights matches/new items

3. **Edit/Create**
   - Edit values for existing keys
   - Create new translation entries
   - Bulk operations supported

4. **Save**
   - Click "Save All"
   - Plugin creates/updates Contentful entries
   - Publishes changes automatically

---

## 🔒 Security Considerations

### Token Storage
- **OAuth tokens**: Session-only (JavaScript variable)
- **Preview tokens**: Stored in Figma clientStorage
- **No localStorage**: Prevents XSS token theft
- **No backend**: No server-side token storage

### API Security
- HTTPS-only connections
- Bearer token authentication
- CORS headers configured in manifest
- Input sanitization for user-provided data

### Permissions
- `networkAccess`: Limited to `api.contentful.com` and OAuth domains
- `documentAccess`: `dynamic-page` (current page only)
- No file system access
- No external script loading

---

## 🛠️ Development

### Build Process

```bash
# Install dependencies
npm install

# Build (compile TypeScript)
npm run build

# Watch mode (auto-rebuild on changes)
npm run watch

# Lint
npm run lint

# Package for distribution
npm run package
```

### Development Workflow

1. **Edit Source**
   - Modify `code.ts` for backend logic
   - Modify `ui.html` for UI changes

2. **Compile**
   - Run `npm run build` or `npm run watch`
   - Generates `code.js` from `code.ts`

3. **Test in Figma**
   - Figma Desktop App → Plugins → Development → Import plugin from manifest
   - Select `manifest.json`
   - Run plugin to test changes

4. **Debug**
   - Backend: Check Figma console (View → Developer → Console)
   - UI: Right-click plugin → Inspect (opens DevTools)

### Code Style
- TypeScript strict mode enabled
- ESLint with Figma plugin rules
- Unused variables prefixed with `_`
- Error handling with try-catch blocks
- Async/await for API calls

---

## 🐛 Common Issues & Solutions

### "No translatable text nodes found"
- **Cause**: No text nodes match the configured pattern
- **Solution**: Check node names match pattern (e.g., `^jams_`)

### "Invalid API credentials"
- **Cause**: Incorrect token or expired OAuth session
- **Solution**: Verify token in settings or reconnect OAuth

### "Missing font"
- **Cause**: Text node uses font not available in Figma
- **Solution**: Load missing fonts or change text node font

### "Content type not found"
- **Cause**: Content type ID doesn't exist in Contentful
- **Solution**: Verify content type ID in Contentful settings

### "Request timeout"
- **Cause**: Network issues or slow Contentful response
- **Solution**: Check network connection, retry operation

### OAuth popup blocked
- **Cause**: Browser popup blocker
- **Solution**: Allow popups for Figma, retry connection

---

## 📊 Performance

### Optimization Strategies

**API Calls**
- 10-second timeout for all requests
- Batch operations where possible
- Limit records to 100 per request

**Font Loading**
- Loads fonts only when needed
- Caches loaded fonts (Figma handles this)
- Handles mixed fonts efficiently

**UI Updates**
- Debounced input handlers
- Minimal DOM manipulation
- CSS animations for smooth transitions

**Memory**
- Session-only OAuth tokens (cleared on close)
- No large data caching
- Efficient data structures (Maps for lookups)

---

## 📦 Distribution

### Package Contents
- `manifest.json` - Plugin metadata
- `code.js` - Compiled backend code
- `ui.html` - Plugin UI

### Installation (Development)
1. Download/clone repository
2. Run `npm install && npm run build`
3. Figma → Plugins → Development → Import plugin from manifest
4. Select `manifest.json`

### Installation (Users)
1. Extract distribution ZIP
2. Figma → Plugins → Development → Import plugin from manifest
3. Select `manifest.json` from extracted folder

### Publishing (Future)
- Submit to Figma Community
- Requires Figma account
- Review process by Figma team

---

## 🔮 Future Enhancements

### Potential Features
- [ ] Batch translation updates
- [ ] Translation history/versioning
- [ ] Multi-page support
- [ ] Custom field mappings
- [ ] Export/import configurations
- [ ] Translation status indicators
- [ ] Conflict resolution UI
- [ ] Offline mode support
- [ ] Analytics dashboard
- [ ] Plugin settings presets

### Technical Improvements
- [ ] Unit tests
- [ ] Integration tests
- [ ] Performance monitoring
- [ ] Error tracking (Sentry)
- [ ] Automated builds (CI/CD)
- [ ] TypeScript strict mode
- [ ] Code splitting
- [ ] Lazy loading

---

## 📚 Resources

### Documentation
- [Figma Plugin API](https://www.figma.com/plugin-docs/)
- [Contentful CMA API](https://www.contentful.com/developers/docs/references/content-management-api/)
- [OAuth 2.0 Spec](https://oauth.net/2/)

### Tools
- [Figma Desktop App](https://www.figma.com/downloads/)
- [Node.js](https://nodejs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Cloudflare Workers](https://workers.cloudflare.com/)

### Support
- Check `docs/` folder for detailed guides
- Review code comments for inline documentation
- Test with sample Contentful space

---

## 🎓 Learning Path

### For New Developers

1. **Understand Figma Plugins**
   - Read Figma Plugin API docs
   - Study manifest.json structure
   - Learn plugin sandbox limitations

2. **Study the Codebase**
   - Start with `manifest.json`
   - Review `code.ts` message handlers
   - Explore `ui.html` UI modes

3. **Set Up Development**
   - Install Node.js and dependencies
   - Configure Contentful test space
   - Run plugin in Figma Desktop

4. **Make Changes**
   - Start with UI tweaks
   - Add console.log for debugging
   - Test thoroughly in Figma

5. **Advanced Topics**
   - OAuth implementation
   - Font handling
   - Error recovery
   - Performance optimization

---

## 📝 Version History

### v1.0.0 (Current)
- Initial release
- Translation mode
- Content preview mode
- Write mode
- OAuth support
- Theme support
- Preflight validation

---

**Last Updated**: October 15, 2025  
**Maintainer**: Development Team  
**Status**: Active Development
