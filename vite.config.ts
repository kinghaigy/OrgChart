import { defineConfig } from 'vite';

// Base '' keeps asset URLs relative so the built app can be opened from disk with no server.
export default defineConfig({
  base: '',
});
