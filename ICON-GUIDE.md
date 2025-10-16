# ContentFi Plugin Icons Guide

## Icon Requirements

### Sizes
- **icon-32.png** - 32×32 pixels (required for plugin menu)
- **icon-128.png** - 128×128 pixels (required for Figma Community)

### Format
- **File type**: PNG (recommended) or SVG
- **Background**: Transparent
- **Color**: Should work on both light and dark backgrounds

## Design Tips

### For ContentFi Plugin
Since ContentFi integrates with Contentful CMS, consider:
- Using a combination of content/document icon with connectivity elements
- Incorporating Contentful's brand colors if appropriate
- Keeping it simple and recognizable at small sizes
- Using a bold, clear design that stands out

### Color Suggestions
- **Primary**: Blue/Purple (tech/content management)
- **Accent**: Orange/Yellow (Contentful brand colors)
- **Style**: Modern, flat design with subtle gradients

## How to Add Icons

### 1. Create Your Icons
Create two PNG files with the exact dimensions:
- `icon-32.png` (32×32 pixels)
- `icon-128.png` (128×128 pixels)

Place them in the project root directory:
```
TranslatorWiz/
├── icon-32.png      ← Add here
├── icon-128.png     ← Add here
├── manifest.json
├── code.ts
└── ...
```

### 2. Update manifest.json
The manifest already has the menu configuration. Once you add the icon files, update it to reference them:

```json
{
  "name": "ContentFi",
  "version": "1.0.0",
  "id": "1558089998326222257",
  "api": "1.0.0",
  "main": "code.js",
  "menu": [
    {
      "name": "ContentFi",
      "command": "open"
    }
  ],
  "ui": "ui.html"
}
```

**Note**: Figma automatically looks for `icon-*.png` files in the same directory as manifest.json, so you don't need to explicitly declare them in the manifest!

### 3. Package the Plugin
The packaging scripts have been updated to automatically include icon files:

```powershell
.\package-plugin.ps1
```

This will copy the icons to `dist-package/` and include them in the ZIP.

## Testing Icons

1. Add your icon files to the project root
2. Reload the plugin in Figma Desktop
3. Check the plugin menu - your icon should appear next to "ContentFi"

## Icon Design Tools

### Free Tools
- **Figma** - Design your icons in Figma itself!
- **Canva** - Simple icon creation
- **GIMP** - Free image editor
- **Inkscape** - Vector graphics editor

### Online Tools
- **Favicon.io** - Generate icons from text/emoji
- **Flaticon** - Download free icons
- **Icons8** - Icon library with customization

### Export Settings
When exporting from design tools:
- Export as PNG
- 2x or 3x resolution for crisp display
- Transparent background
- Exact dimensions (32×32 and 128×128)

## Example Icon Concept

For ContentFi, you could combine:
- 📄 Document/content icon
- 🔗 Connection/link symbol
- 🎨 Figma-style design aesthetic

Keep it minimal and ensure it's recognizable even at 32×32 pixels!
