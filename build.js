const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/_worker.js',
  format: 'esm',
  platform: 'browser',
  external: [],
  minify: false,
}).then(() => {
  console.log('Build complete!');
}).catch(() => process.exit(1));
