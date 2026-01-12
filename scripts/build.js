const esbuild = require('esbuild');
const path = require('path');

const isWatch = process.argv.includes('--watch');
const isProduction = process.argv.includes('--production');

const buildOptions = {
  entryPoints: [path.resolve(__dirname, '../src/index.ts')],
  bundle: true,
  outfile: path.resolve(__dirname, '../code.js'),
  platform: 'neutral', // Figma plugin sandbox
  target: ['es2020'],
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
    if (isWatch) {
      const context = await esbuild.context(buildOptions);
      await context.watch();
      console.log('Watching for changes...');
    } else {
      await esbuild.build(buildOptions);
      console.log('Build complete!');
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
