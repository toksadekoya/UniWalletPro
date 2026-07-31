import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset URLs work both on GitHub Pages and from a local preview.
  base: './',
  build: {
    target: 'es2022',
  },
});
