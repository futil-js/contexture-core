import fs from 'fs/promises'
import glob from 'glob'
import esbuild from 'esbuild'

// Clear build directory since esbuild won't do it for us
await fs.rm('dist', { force: true, recursive: true })

// Build project
esbuild.build({
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
})
