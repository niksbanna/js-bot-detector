const esbuild = require('esbuild');
const path = require('path');

const isWatch = process.argv.includes('--watch');

const commonConfig = {
  entryPoints: ['src/index.js'],
  bundle: true,
  sourcemap: false,
  target: ['es2020', 'chrome80', 'firefox75', 'safari13'],
};

const builds = [
  // ESM build
  {
    ...commonConfig,
    format: 'esm',
    outfile: 'dist/bot-detector.esm.js',
  },
  // CommonJS build
  {
    ...commonConfig,
    format: 'cjs',
    outfile: 'dist/bot-detector.cjs.js',
  },
  // IIFE build for browsers (self-executing)
  {
    ...commonConfig,
    format: 'iife',
    globalName: 'BotDetectorLib',
    outfile: 'dist/bot-detector.iife.js',
  },
  // Minified IIFE for production
  {
    ...commonConfig,
    format: 'iife',
    globalName: 'BotDetectorLib',
    outfile: 'dist/bot-detector.iife.min.js',
    minify: true,
    sourcemap: false,
  },
];

async function build() {
  try {
    if (isWatch) {
      // Create contexts for watching
      const contexts = await Promise.all(
        builds.map(config => esbuild.context(config))
      );
      
      await Promise.all(contexts.map(ctx => ctx.watch()));
      console.log('Watching for changes...');
    } else {
      // One-time build
      await Promise.all(builds.map(config => esbuild.build(config)));
      console.log('Build complete!');
      
      // Log bundle sizes
      const fs = require('fs');
      console.log('\nBundle sizes:');
      builds.forEach(config => {
        const stats = fs.statSync(config.outfile);
        const size = (stats.size / 1024).toFixed(2);
        console.log(`  ${path.basename(config.outfile)}: ${size} KB`);
      });
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
