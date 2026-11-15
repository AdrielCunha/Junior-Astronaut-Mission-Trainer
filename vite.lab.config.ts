import { defineConfig } from 'vite';
// Dedicated build: the experimental scene never replaces the game's entry point.
export default defineConfig({
  base: './', publicDir: false,
  build: { outDir: 'dist-lab', rollupOptions: { input: 'laboratorio-astronauta.html' } },
});
