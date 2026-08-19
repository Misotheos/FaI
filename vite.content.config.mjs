import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: true,
    rollupOptions: {
      input: 'src/content.ts',
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'content.js',
        assetFileNames: 'assets/[name][extname]'
      }
    }
  }
});