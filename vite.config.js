import { readFileSync } from 'fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

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
