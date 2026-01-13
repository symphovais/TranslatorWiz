# ConteFi

A Figma plugin that integrates with Contentful CMS for managing translations and content.

## Features

- **Apply Translations** - Pull translations from Contentful and apply them to Figma text nodes based on locale
- **Preview Content** - Preview content from any Contentful content type directly in Figma
- **Write Content** - Push content back to Contentful from Figma designs

## How It Works

The plugin identifies text nodes in your Figma document using a configurable naming pattern (default: `^jams_`). When you apply translations, it matches these nodes with entries from your Contentful space and updates the text content.

## Installation

### For Users
Install from the [Figma Community](https://www.figma.com/community/plugin/1558089998326222257)

### For Developers
1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the plugin:
   ```bash
   npm run build
   ```
4. In Figma Desktop: Plugins → Development → Import plugin from manifest
5. Select `dist/manifest.json`

## Development

### Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build to `dist/` folder (development) |
| `npm run build:prod` | Production build (minified, no sourcemaps) |
| `npm run watch` | Watch mode - rebuilds on file changes |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Lint code |
| `npm run lint:fix` | Lint and auto-fix issues |

### Project Structure

```
src/
├── index.ts              # Plugin entry point
├── constants.ts          # Configuration constants
├── services/             # Core business logic
│   ├── config.service.ts     # Configuration management
│   ├── contentful.service.ts # Contentful API integration
│   ├── network.service.ts    # HTTP requests with timeout
│   └── node.service.ts       # Figma node operations
├── handlers/             # Message handlers
│   ├── config.handler.ts     # Config-related messages
│   ├── content.handler.ts    # Content fetching messages
│   ├── ui.handler.ts         # UI-related messages
│   └── write.handler.ts      # Write-to-Contentful messages
└── types/                # TypeScript type definitions

tests/
└── unit/                 # Unit tests (89 tests)

dist/                     # Build output (import this into Figma)
├── code.js
├── manifest.json
└── ui.html
```

### Architecture

This is a Figma plugin with a sandbox architecture:

- **Main Thread** (`code.js`) - Runs in Figma's sandbox with access to the Figma API and Contentful
- **UI Thread** (`ui.html`) - Runs in an iframe with standard web APIs

Communication happens via message passing between the two threads.

### Dev vs Production Builds

- **Development** (`npm run build`): Uses a separate plugin ID (`*-dev`) so it doesn't conflict with the published version
- **Production** (`npm run build:prod`): Uses the real plugin ID for publishing

## Configuration

The plugin requires the following Contentful configuration:

| Field | Description |
|-------|-------------|
| Space ID | Your Contentful space identifier |
| Environment | Contentful environment (e.g., `master`) |
| CMA Token | Content Management API token |
| Content Type | The content type containing translations |
| Key Field | Field containing the translation key |
| Value Field | Field containing the translation value |
| Node Name Pattern | Regex pattern to match Figma text nodes (default: `^jams_`) |

## License

Proprietary

## Contributing

Internal project - contact the maintainers for contribution guidelines.
