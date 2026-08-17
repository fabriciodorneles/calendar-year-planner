import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base` matches the GitHub Pages path (https://<user>.github.io/<repo>/).
// Overridable so local dev and other hosts keep working.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/calendar-year-planner/',
  plugins: [react()],
  // Import entre pastas (feature → shared) usa '@/'; dentro da própria pasta,
  // caminho relativo. Sem isso um arquivo de feature veria '../../../shared'.
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
