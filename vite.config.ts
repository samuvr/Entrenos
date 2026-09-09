import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Ruta relativa: permite desplegar en GitHub Pages o en cualquier subcarpeta.
  base: './',
  build: { outDir: 'dist' },
});
