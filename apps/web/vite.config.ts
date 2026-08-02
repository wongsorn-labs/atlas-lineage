import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';
import { execSync } from 'child_process';

// Vercel sets VERCEL_GIT_COMMIT_SHA at build time; fall back to the local
// git HEAD so the same footer works in dev and self-hosted builds.
function getCommitSha(): string {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA
    ?? (() => {
      try {
        return execSync('git rev-parse HEAD').toString().trim();
      } catch {
        return '';
      }
    })();
  return sha.slice(0, 7);
}

export default defineConfig({
  define: {
    __APP_COMMIT__: JSON.stringify(getCommitSha()),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Atlas Lineage',
        short_name: 'Atlas',
        description: 'Map-based genealogy application',
        theme_color: '#9C7526',
        background_color: '#FBF3E7',
        display: 'standalone',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
