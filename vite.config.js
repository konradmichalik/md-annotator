import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  root: './client',
  plugins: [react(), viteSingleFile()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  build: {
    outDir: './dist',
    emptyOutDir: true
  }
})
