import fs from 'fs/promises'
import glob from 'glob'
import esbuild from 'esbuild'
// https://github.com/flex-development/toggle-pkg-type#when-should-i-use-this
import toggleTypeModule from '@flex-development/toggle-pkg-type'

// Clear build directory since esbuild won't do it for us
await fs.rm('dist', { force: true, recursive: true })

let entryPoints = glob.sync('src/**/*.js', {
  ignore: [
    // Tests
    'src/**/*.test.js',
    // Data for tests
    'src/**/__data__/*',
  ],
})

// Build project

toggleTypeModule('off')

await esbuild.build({
  platform: 'node',
  format: 'cjs',
  target: 'es2022',
  outdir: 'dist/cjs',
  entryPoints,
})

await fs.writeFile('./dist/cjs/package.json', '{ "type": "commonjs" }')

toggleTypeModule('on')

await esbuild.build({
  platform: 'node',
  format: 'esm',
  target: 'es2022',
  outdir: 'dist/esm',
  entryPoints,
})

await fs.writeFile('./dist/esm/package.json', '{ "type": "module" }')
