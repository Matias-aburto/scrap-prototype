import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages project site base path.
  base: "/scrap-prototype/",
  plugins: [react()],
})
