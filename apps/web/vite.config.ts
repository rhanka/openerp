import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sveltekit()],
  // esbuild 0.28 cannot downlevel Svelte's private-field/destructuring output
  // to Vite's default modules target.
  build: {
    target: "es2022"
  },
  server: {
    port: 4173
  }
});
