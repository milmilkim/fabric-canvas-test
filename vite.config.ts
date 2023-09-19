import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
  },
  base: 'https://milmilkim.github.io/fabric-canvas-test/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
