import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const monacoEditorPlugin = require('vite-plugin-monaco-editor').default as (opts: object) => Plugin

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

/**
 * Dev サーバーで SQLite WASM ファイルを /sqlite3.wasm として提供する
 * node_modules からファイルを直接配信するインラインプラグイン
 */
const serveSqliteWasm = (): Plugin => ({
  name: 'serve-sqlite-wasm',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url === '/sqlite3.wasm') {
        const wasmPath = resolve('node_modules/@sqlite.org/sqlite-wasm/sqlite-wasm/jswasm/sqlite3.wasm')
        res.setHeader('Content-Type', 'application/wasm')
        res.end(readFileSync(wasmPath))
        return
      }
      next()
    })
  }
})

/**
 * ブラウザ環境では使用されない Node.js fs モジュールを空モックに置換する
 */
const fsMock = (): Plugin => ({
  name: 'fs-mock',
  enforce: 'pre',
  resolveId(id) {
    if (id === 'fs') return '\0fs-mock'
    return null
  },
  load(id) {
    if (id === '\0fs-mock') {
      return 'export default {}; export const readFileSync = () => null; export const existsSync = () => false;'
    }
    return null
  }
})

export default defineConfig({
  plugins: [
    vue(),
    nodePolyfills({
      include: ['buffer', 'path'],
      globals: { Buffer: true }
    }),
    fsMock(),
    monacoEditorPlugin({
      languageWorkers: ['editorWorkerService']
    }),
    serveSqliteWasm(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/@sqlite.org/sqlite-wasm/sqlite-wasm/jswasm/sqlite3.wasm',
          dest: './'
        },
        { src: 'src/pwa/manifest.webmanifest', dest: './' },
        { src: 'src/pwa/service-worker.js', dest: './' },
        { src: 'src/assets/pwa/icon-192.png', dest: './' },
        { src: 'src/assets/pwa/icon-512.png', dest: './' },
        { src: 'src/assets/pwa/apple-touch-icon.png', dest: './' },
        { src: 'src/assets/pwa/favicon.ico', dest: './' }
      ]
    })
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  resolve: {
    alias: {
      'vue$': 'vue/dist/vue.esm-bundler.js'
    }
  },
  server: {
    port: 9000,
    open: false,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  },
  preview: {
    port: 9000,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          'monaco-editor': ['monaco-editor']
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['@sqlite.org/sqlite-wasm']
  }
})
