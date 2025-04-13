import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000, // Change the port if needed
  },
  build: {
    outDir: 'dist', // Output directory for the build
  },
});
