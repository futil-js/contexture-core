/* eslint-env node */

import fs from 'fs/promises'
import glob from 'glob'
import esbuild from 'esbuild'

let options = {
  platform: 'node',
  format: 'cjs',
  target: 'es2022',
  outdir: 'dist',
  entryPoints: glob.sync('src/**/*.js', {
    ignore: [
      // Tests
      'src/**/*.test.js',
      // Data for tests
      'src/**/__data__/*',
    ],
  }),
}

// Clear build directory since esbuild won't do it for us
await fs.rm(options.outdir, { force: true, recursive: true })

esbuild.build(options)
