# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ConteFi is a Figma plugin that integrates with Contentful CMS for managing translations and content. It allows designers to:
- Apply translations from Contentful to Figma text nodes based on locale
- Preview content from any Contentful content type
- Write/push content back to Contentful from Figma

## Build Commands

```bash
# Install dependencies
npm install

# Build TypeScript to JavaScript
npm run build

# Watch mode for development
npm run watch

# Lint code
npm run lint
npm run lint:fix

# Package for distribution (creates ZIP for testers)
npm run package          # PowerShell (Windows)
npm run package:bash     # Bash (Mac/Linux)
```

## Architecture

This is a Figma plugin with a sandbox architecture - the plugin runs in two separate contexts:

### Main Thread (`src/index.ts` → `dist/code.js`)
- Runs in Figma's main thread sandbox with access to the Figma API
- Handles all Figma document operations (reading/writing text nodes, selection tracking)
- Communicates with UI via `figma.ui.postMessage()` and `figma.ui.onmessage`
- Makes Contentful API calls (network access restricted to `api.contentful.com`)
- Stores config in `figma.clientStorage` (persisted per-user)

#### Modular Structure
```
src/
├── index.ts              # Entry point, UI initialization, selection tracking
├── constants.ts          # Plugin version and constants
├── handlers/             # Message handlers
│   ├── index.ts          # Main message router
│   ├── config.handler.ts # Config save/load
│   ├── content.handler.ts# Content type fetching
│   ├── ui.handler.ts     # UI interactions
│   └── write.handler.ts  # Write to Contentful
├── services/             # Business logic
│   ├── config.service.ts # Config validation/storage
│   ├── contentful.service.ts # Contentful API calls
│   ├── network.service.ts# Fetch with timeout
│   └── node.service.ts   # Figma node operations
└── types/                # TypeScript interfaces
```

### UI Thread (`ui.html`)
- Runs in an iframe with standard web APIs
- Contains all UI components and user interactions
- Communicates with main thread via `parent.postMessage()` and `window.onmessage`
- Large single-file HTML with embedded CSS and JavaScript

### Message Protocol
The plugin uses a message-passing pattern between threads. Key message types:
- `init` / `config-loaded` - Plugin initialization
- `save-config` / `config-saved` - Configuration persistence
- `load-locales` / `locales-loaded` - Fetch available Contentful locales
- `apply-translation` / `translation-applied` - Apply translations to nodes
- `get-translatable-nodes` / `translatable-nodes-loaded` - Get nodes matching pattern
- `save-contentful-item` / `item-saved` - Write content back to Contentful

### Key Patterns
- **Node Pattern Matching**: Text nodes are identified by name using a configurable regex pattern (default: `^jams_`)
- **Font Loading**: Plugin loads fonts before modifying text, handles mixed fonts in nodes
- **Selection Tracking**: Debounced selection change listener (300ms) for real-time node selection
- **API Timeout**: 10-second timeout on all Contentful API calls

## Version Management

Version is maintained in two places that must stay in sync:
1. `package.json` - `"version": "X.X.X"`
2. `src/constants.ts` - `export const PLUGIN_VERSION = "X.X.X";`

## Plugin Distribution

The `dist-package/` folder contains the distributable plugin files. Testers import `manifest.json` into Figma Desktop via Plugins → Development → Import plugin from manifest.
