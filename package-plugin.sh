#!/bin/bash
# ContentFi Plugin Packager
# Creates a distributable ZIP file for testers

echo "📦 Building ContentFi Plugin Package..."

# Build the plugin
echo ""
echo "1. Building TypeScript..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

# Create distribution folder
echo ""
echo "2. Creating distribution folder..."
DIST_FOLDER="dist-package"
rm -rf "$DIST_FOLDER"
mkdir -p "$DIST_FOLDER"

# Copy required files
echo ""
echo "3. Copying files..."
cp manifest.json "$DIST_FOLDER/"
cp code.js "$DIST_FOLDER/"
cp ui.html "$DIST_FOLDER/"
cp DISTRIBUTION.md "$DIST_FOLDER/README.md"

# Copy icon files if they exist
if [ -f "icon-32.png" ]; then
    cp icon-32.png "$DIST_FOLDER/"
fi
if [ -f "icon-128.png" ]; then
    cp icon-128.png "$DIST_FOLDER/"
fi

# Get version from package.json
VERSION=$(node -pe "JSON.parse(require('fs').readFileSync('package.json')).version")
ZIP_NAME="ContentFi-v${VERSION}.zip"

# Create ZIP
echo ""
echo "4. Creating ZIP archive..."
rm -f "$ZIP_NAME"
cd "$DIST_FOLDER"
zip -r "../$ZIP_NAME" ./*
cd ..

# Summary
echo ""
echo "✅ Package created successfully!"
echo ""
echo "Package details:"
echo "  📁 Folder: $DIST_FOLDER/"
echo "  📦 ZIP: $ZIP_NAME"
echo "  🏷️ Version: v$VERSION"

echo ""
echo "Share this with testers:"
echo "  1. Send them $ZIP_NAME"
echo "  2. They extract it and follow README.md instructions"
echo "  3. Import manifest.json in Figma Desktop"

echo ""
echo "🎉 Done!"

