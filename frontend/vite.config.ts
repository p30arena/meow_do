import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const APP_VERSION = 14;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      // Removed filename: `sw-v${APP_VERSION}.js`, as per user feedback
      workbox: {
        globPatterns: ["**/index-*.js", "**/*.{css,html,ico,webmanifest}"],
        globIgnores: [
          "**/assets/DescriptionViewer-*.js",
          "**/assets/Mermaid-*.js",
          "**/assets/*Diagram-*.js",
          "**/assets/cytoscape*.js",
          "**/assets/katex-*.js",
          "**/assets/treemap-*.js",
        ],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
      manifest: {
        name: "MeowDo",
        short_name: "MeowDo",
        theme_color: "#ffffff",
        icons: [
          {
            src: "/android-chrome-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: "module",
      },
    }),
  ],
  define: {
    __APP_VERSION__: APP_VERSION,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
