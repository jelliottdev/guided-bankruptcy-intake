import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Relative base so assets load correctly on GitHub Pages (repo site is at /guided-bankruptcy-intake/)
  base: './',
})
