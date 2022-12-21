import fs from 'fs/promises'
import glob from 'glob'
import esbuild from 'esbuild'

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

await esbuild.build({
  platform: 'node',
  format: 'cjs',
  target: 'es2022',
  outdir: 'dist/cjs',
  entryPoints,
})

await fs.writeFile('./dist/cjs/package.json', '{ "type": "commonjs" }')

await esbuild.build({
  platform: 'browser',
  format: 'esm',
  target: 'es2022',
  outdir: 'dist/esm',
  entryPoints,
})

await fs.writeFile('./dist/esm/package.json', '{ "type": "module" }')
