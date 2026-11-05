#!/usr/bin/env node
// bundles the extension into `dist/extension.js`. the extension host loads the entry point with
// `require()`, and the package itself is an ES module (it runs its sources directly with node), so
// the bundle is emitted as commonjs and the `dist` folder gets its own `package.json` to mark it.

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { build } from 'esbuild'

/**
 * The root of the repository.
 */
const ROOT_DIR = path.join(import.meta.dirname, '..')

/**
 * The output folder that the manifest points to.
 */
const OUT_DIR = path.join(ROOT_DIR, 'dist')

await mkdir(OUT_DIR, { recursive: true })

await build({
  entryPoints: [path.join(ROOT_DIR, 'src', 'extension.ts')],
  outfile: path.join(OUT_DIR, 'extension.js'),
  bundle: true,
  platform: 'node',
  // the extension host of 1.94 runs on node 20
  target: 'node20',
  format: 'cjs',
  // the `vscode` module is provided by the extension host
  external: ['vscode'],
  sourcemap: true,
  logLevel: 'info',
})

await writeFile(path.join(OUT_DIR, 'package.json'), `${JSON.stringify({ type: 'commonjs' }, null, 2)}\n`, 'utf8')

console.log(`bundle: ${path.join(OUT_DIR, 'extension.js')}`)
