import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        admin: path.resolve(__dirname, 'admin/admin.html'),
        instructor: path.resolve(__dirname, 'instructor/instructor.html'),
        rev: path.resolve(__dirname, 'rev/rev.html'),
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks(id) {
          // Vendor Chunking
          if (id.includes('node_modules')) {
            if (id.includes('/node_modules/firebase/') || id.includes('/node_modules/@firebase/')) {
              return 'vendor-firebase';
            }
            if (id.includes('/node_modules/lucide-react/')) {
              return 'vendor-icons';
            }
            if (id.includes('/node_modules/recharts/') || id.includes('/node_modules/d3-') || id.includes('/node_modules/victory-vendor/')) {
              return 'vendor-charts';
            }
            if (id.includes('/node_modules/jspdf/') || id.includes('/node_modules/html2canvas/')) {
              return 'vendor-pdf';
            }
            if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/') || id.includes('/node_modules/react-router/')) {
              return 'vendor-core';
            }
            return 'vendor-common';
          }

          // Feature Application Chunking
          if (id.includes('/src/components/instructor/') || id.includes('instructor-main')) {
            return 'chunk-instructor';
          }
          if (id.includes('/src/components/admin/') || id.includes('admin-main')) {
            return 'chunk-admin';
          }
          if (id.includes('/src/components/pages/') || id.includes('/src/components/user/')) {
            return 'chunk-learner';
          }
        },
      },
    },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
});

