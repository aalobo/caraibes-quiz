import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Le site est servi sous /caraibes-quiz/ sur GitHub Pages.
  base: '/caraibes-quiz/',
})
