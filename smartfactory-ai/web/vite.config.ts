import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Split vendor chunks so React core is cached separately from app code
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['lucide-react', 'papaparse'],
        },
      },
    },
    // Increase chunk size warning threshold
    chunkSizeWarningLimit: 1000,
  },
  // Optimise deps pre-bundling in dev so first load is faster
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react', 'papaparse'],
  },
  server: {
    // Faster HMR
    hmr: true,
  },
})
