import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000', // Adresse du backend
        changeOrigin: true, // Modifier l'origine de l'en-tête Host pour correspondre au backend
        secure: false, // Nécessaire si vous utilisez HTTPS auto-signé
      },
    },
  },
});
