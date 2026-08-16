import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base` matches the GitHub Pages path (https://<user>.github.io/<repo>/).
// Overridable so local dev and other hosts keep working.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/calendar-year-planner/',
  plugins: [react()],
});
