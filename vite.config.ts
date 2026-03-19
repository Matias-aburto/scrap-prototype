import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Relative assets path for GitHub Pages project sites.
  base: './',
  plugins: [react()],
})
