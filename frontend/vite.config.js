import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Force all Emotion packages to use the same instance
      '@emotion/react': path.resolve(__dirname, 'node_modules/@emotion/react'),
      '@emotion/styled': path.resolve(__dirname, 'node_modules/@emotion/styled'),
    },
  },
  server: {
    // Development server configuration
    port: 5173,
    host: '0.0.0.0', // Listen on all interfaces for Docker
    proxy: {
      // Proxy API requests to backend during development
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path,
      }
    }
  },
  preview: {
    // Preview server configuration (used by 'serve' in production Docker)
    port: 5173,
    host: '0.0.0.0',
  },
  build: {
    // Optimize build output
    outDir: 'dist',
    sourcemap: false, // Disable sourcemaps in production
    minify: 'terser',
  },
  define: {
    // Make environment variables available in the app
    __VITE_API_URL__: JSON.stringify(process.env.VITE_API_URL || 'http://localhost:3001'),
  },
})
