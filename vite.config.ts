import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Rutas relativas: evita página en blanco si la URL base no coincide exactamente
  // con el nombre del repo (forks, renombres, o ajustes en Pages).
  base: "./",
  plugins: [react()],
})
