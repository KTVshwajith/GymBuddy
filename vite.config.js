import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' so the same build works on GitHub Pages and inside the Android app
export default defineConfig({ plugins: [react()], base: './' });
