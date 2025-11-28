# ConteFi - Contentful Integration for Figma

A Figma plugin that connects your designs to Contentful CMS, enabling seamless translation management and content preview directly within Figma.

## Features

- **Translation Mode**: Apply translations from Contentful to text nodes in your Figma designs
- **Content Preview Mode**: Preview content from any Contentful content type in your designs
- **Write Mode**: Push text content from Figma back to Contentful
- **Multi-locale Support**: Work with all locales configured in your Contentful space
- **Pattern-based Node Matching**: Target specific text nodes using regex patterns

## Installation

### From Figma Community
1. Visit the [ConteFi plugin page](https://www.figma.com/community/plugin/your-plugin-id) on Figma Community
2. Click "Install"

### For Development
1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the plugin:
   ```bash
   npm run build
   ```
4. In Figma, go to **Plugins > Development > Import plugin from manifest**
5. Select the `manifest.json` file from this repository

## Configuration

The plugin requires a Contentful CMA (Content Management API) token and space configuration:

| Field | Description |
|-------|-------------|
| **Space ID** | Your Contentful space identifier |
| **Environment** | Contentful environment (e.g., `master`) |
| **CMA Token** | Content Management API token with read/write access |
| **Content Type** | The content type ID for translations |
| **Key Field** | Field containing the translation key |
| **Value Field** | Field containing the translation value |
| **Node Name Pattern** | Regex pattern to match Figma text node names (e.g., `^jams_`) |

### Setting Up Contentful

1. Create a content type for translations with at least two fields:
   - A **key** field (Short text) - matches your Figma node names
   - A **value** field (Short text or Long text) - contains the translated content

2. Generate a CMA token in **Settings > API keys > Content management tokens**

3. Name your Figma text nodes to match your translation keys (e.g., `jams_header_title`)

## Usage

### Translation Mode
1. Configure your Contentful connection in the Settings tab
2. Select a locale from the dropdown
3. Click "Apply Translations" to update all matching text nodes

### Content Preview Mode
1. Select a content type from Contentful
2. Choose a record to preview
3. Map Contentful fields to Figma text nodes
4. Apply the content to see it in your design

### Write Mode
1. View all translatable nodes in your design
2. Edit values or create new entries
3. Push changes back to Contentful

## Development

### Scripts

```bash
npm run build      # Compile TypeScript
npm run watch      # Watch mode for development
npm test           # Run tests
npm run test:coverage  # Run tests with coverage report
npm run lint       # Run ESLint
```

### Project Structure

```
├── code.ts          # Main plugin logic
├── ui.html          # Plugin UI
├── manifest.json    # Figma plugin manifest
├── tests/           # Test files
│   ├── setup.ts     # Test mocks and utilities
│   └── code.test.ts # Unit tests
└── docs/            # Documentation
```

### Testing

The plugin includes a comprehensive test suite with 55+ tests covering:
- Configuration validation
- Contentful API interactions
- Text node manipulation
- Error handling

Run tests with:
```bash
npm test
```

## Requirements

- Node.js 18+
- Figma desktop app
- Contentful account with CMA access

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request
