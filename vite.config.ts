import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      usePolling: true,
      interval: 1000,
    },
    host: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react-router-dom',
        'lucide-react',
        'recharts',
        '@supabase/supabase-js',
        'jspdf',
        'xlsx'
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react-router-dom': 'ReactRouterDOM',
          'lucide-react': 'Lucide',
          'recharts': 'Recharts',
          '@supabase/supabase-js': 'supabase'
        }
      }
    }
  }
});