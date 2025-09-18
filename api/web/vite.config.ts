import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/api-docs': 'http://localhost:3000',
      '/admin/endpoints': 'http://localhost:3000'
    }
  },
  build: {
    outDir: 'dist'
  }
})


