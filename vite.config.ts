import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Disable source maps in production
    sourcemap: false,
    // Optimize dependencies
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          supabase: ['@supabase/supabase-js', '@supabase/auth-helpers-react']
        }
      }
    }
  },
  // Be more lenient with TypeScript errors
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  }
})
