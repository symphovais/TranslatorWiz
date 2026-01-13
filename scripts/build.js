const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const isWatch = process.argv.includes('--watch');
const isProduction = process.argv.includes('--production');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');

function ensureDistDir() {
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
}

function copyStaticFiles() {
  // Copy ui.html
  const uiSrc = path.resolve(rootDir, 'ui.html');
  const uiDest = path.resolve(distDir, 'ui.html');
  if (fs.existsSync(uiSrc)) {
    fs.copyFileSync(uiSrc, uiDest);
    console.log('Copied ui.html to dist/');
  }

  // Process manifest.json - use different ID for dev builds to avoid conflict with published plugin
  const manifestSrc = path.resolve(rootDir, 'manifest.json');
  const manifestDest = path.resolve(distDir, 'manifest.json');
  if (fs.existsSync(manifestSrc)) {
    const manifest = JSON.parse(fs.readFileSync(manifestSrc, 'utf8'));

    if (!isProduction) {
      // Development: use a different ID to avoid conflict with published plugin
      // This allows clientStorage to work while keeping dev separate from production
      manifest.id = manifest.id + '-dev';
      manifest.name = manifest.name + ' (Dev)';
      console.log('Created dev manifest (dev ID, renamed to avoid published plugin conflict)');
    } else {
      console.log('Copied manifest.json to dist/ (production, with ID)');
    }

    fs.writeFileSync(manifestDest, JSON.stringify(manifest, null, 2));
  }
}

const buildOptions = {
  entryPoints: [path.resolve(rootDir, 'src/index.ts')],
  bundle: true,
  outfile: path.resolve(distDir, 'code.js'),
  platform: 'neutral', // Figma plugin sandbox
  target: ['es2017'], // ES2017 for Figma sandbox compatibility (no optional catch binding)
  format: 'iife',
  minify: isProduction,
  sourcemap: isProduction ? false : 'inline',
  logLevel: 'info',
  define: {
    'process.env.NODE_ENV': isProduction ? '"production"' : '"development"'
  }
};

async function build() {
  try {
    ensureDistDir();
    copyStaticFiles();

    if (isWatch) {
      const context = await esbuild.context(buildOptions);
      await context.watch();
      console.log('Watching for changes...');
    } else {
      await esbuild.build(buildOptions);
      console.log('Build complete! Output in dist/');
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
