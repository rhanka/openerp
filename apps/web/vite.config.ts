import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sveltekit()],
  // esbuild 0.28 cannot downlevel Svelte's private-field/destructuring output.
  // Keep both dev transforms (esbuild) and production bundle (build target) at es2022;
  // dropping either caused Chromium-targeted Playwright failures with esbuild 0.28.
  esbuild: {
    target: "es2022"
  },
  build: {
    target: "es2022"
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "es2022"
    }
  },
  server: {
    port: 4173
  }
});
