import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // "/" locally; the GitHub Pages build sets BASE_PATH=/gracia-sfin-ia/
  base: process.env.BASE_PATH || '/',
  // PGlite ships its own WebAssembly files; don't let Vite pre-bundle it.
  optimizeDeps: { exclude: ['@electric-sql/pglite'] },
  worker: { format: 'es' },
})
