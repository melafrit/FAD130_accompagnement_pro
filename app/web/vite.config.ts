import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// En dev, on proxifie /api vers l'API Node (port 3000) pour éviter les soucis CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
