# ConteFi - Distribution Guide

## For Testers: Installation Instructions

### Requirements
- Figma Desktop App (required for development plugins)
- Download link: https://www.figma.com/downloads/

### Installation Steps

1. **Download the plugin files**
   - Extract the ZIP file to a folder on your computer
   - Example: `C:\FigmaPlugins\ConteFi\`

2. **Import into Figma**
   - Open Figma Desktop app
   - Go to: `Plugins` → `Development` → `Import plugin from manifest...`
   - Navigate to your ConteFi folder
   - Select `manifest.json`
   - Click "Open"

3. **Using the plugin**
   - The plugin will appear in: `Plugins` → `Development` → `ConteFi`
   - Click it to launch

### Configuration

On first run, you'll need to configure your Contentful credentials:
1. Click the ⚙️ settings icon
2. Enter your Contentful details:
   - Space ID
   - Environment (usually "master")
   - Preview Token
   - Content Type
   - Key Field
   - Value Field
   - Node Name Pattern

3. Click "Save & Validate"
4. The plugin will test your connection

### Troubleshooting

**Plugin not showing up?**
- Make sure all 3 files (manifest.json, code.js, ui.html) are in the same folder
- Restart Figma Desktop app

**Connection errors?**
- Verify your Contentful credentials
- Check your Preview Token has proper permissions
- Ensure your network allows connections to Contentful

**Need help?**
- Contact: [your-email@example.com]

## For Developers: Creating Distribution Package

### Build Steps

```bash
# 1. Install dependencies
npm install

# 2. Build the plugin
npm run build

# 3. Create distribution folder
mkdir -p dist-package
cp manifest.json dist-package/
cp code.js dist-package/
cp ui.html dist-package/
cp DISTRIBUTION.md dist-package/README.md

# 4. Create ZIP (optional)
# On Windows PowerShell:
Compress-Archive -Path dist-package/* -DestinationPath ConteFi-v1.0.zip

# On Mac/Linux:
zip -r ConteFi-v1.0.zip dist-package/
```

### Updating the Plugin

When you release updates:
1. Update version in `package.json`
2. Rebuild: `npm run build`
3. Share new files with testers
4. Testers just need to replace the files (no re-import needed)

### Version History

- v1.0.0 - Initial release
  - Contentful integration
  - Multi-language support
  - Figma theme support
  - Preflight validation


