import path from 'path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { quasar, transformAssetUrls } from '@quasar/vite-plugin';

export default defineConfig({
  base: '/Matcha/',
  // fix cache dir and ignore build output from watcher to avoid repeated re-optimizations
  cacheDir: 'node_modules/.vite',
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
  },
  server: {
    // Ignore the built `dist` folder and other generated files which some tools may touch
    watch: {
      ignored: ['**/dist/**', '**/.git/**']
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  }
});