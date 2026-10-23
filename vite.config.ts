import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('video.js') || id.includes('videojs')) return 'vendor-video';
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
            if (id.includes('firebase') || id.includes('@firebase')) return 'vendor-firebase';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('quill')) return 'vendor-docs';
            return 'vendor';
          }
          if (id.includes('/src/components/admin/')) return 'portal-admin';
          if (id.includes('/src/components/instructor/')) return 'portal-instructor';
          if (id.includes('/src/components/reviewer/')) return 'portal-reviewer';
        },
      },
    },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
});
