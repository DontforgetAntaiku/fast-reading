import { readdirSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/** Fills the cache name and the hashed-asset list of public/sw.js after the bundle is written. */
function swPrecache(): Plugin {
  let outDir = 'dist'
  return {
    name: 'sw-precache',
    apply: 'build',
    configResolved(c) {
      outDir = c.build.outDir
    },
    async writeBundle() {
      const assets = readdirSync(join(outDir, 'assets')).map((f) => `/assets/${f}`)
      const file = join(outDir, 'sw.js')
      const src = await readFile(file, 'utf8')
      const out = src
        .replace('__BUILD_ID__', Date.now().toString(36))
        .replace('/*PRECACHE*/ []', JSON.stringify(assets))
      await writeFile(file, out)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), swPrecache()],
    define: {
      'import.meta.env.VITE_DEBUG': JSON.stringify(env.FRONTEND_DEBUG ?? 'False'),
    },
  }
})
