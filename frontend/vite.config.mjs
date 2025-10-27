import path from 'path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { quasar, transformAssetUrls } from '@quasar/vite-plugin';

export default defineConfig({
  base: '/Matcha/',
  test: {
    environment: 'node',
    coverage: {
      reporter: ['text', 'html'],
    }
  },
  plugins: [
    vue({
      template: { transformAssetUrls }
    }),
    quasar({
  sassVariables: path.resolve(__dirname, 'src/quasar-variables.sass')
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});