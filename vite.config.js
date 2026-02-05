import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],

  // Behåll port 3000 så att befintliga bokmärken/vanor fungerar
  server: {
    port: 3000,
    open: true,
    // Proxy för backend API (justera port efter din setup)
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      // WebSocket-proxy för framtida Hocuspocus collab-server
      '/collab': {
        target: 'ws://localhost:1234',
        ws: true,
        changeOrigin: true,
      },
    },
  },

  // Matcha CRA:s output-katalog
  build: {
    outDir: 'build',
    sourcemap: true,
    // Optimera chunk-storlekar
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },

  // Resolve-alias för att matcha eventuella CRA-importer
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@views': path.resolve(__dirname, 'src/views'),
      '@utils': path.resolve(__dirname, 'src/utils'),
    },
  },

  // Miljövariabler: VITE_ prefix istället för REACT_APP_
  // Se migrate-env.cjs för automatisk konvertering
  define: {
    // Polyfill för bibliotek som förväntar sig process.env
    'process.env': {},
  },
});
