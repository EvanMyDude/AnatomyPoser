import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// `base` must match the GitHub Pages project subpath so built asset URLs
// resolve under https://evanmydude.github.io/AnatomyPoser/
export default defineConfig({
  base: '/AnatomyPoser/',
  plugins: [react()],
  test: { environment: 'node', include: ['src/**/*.test.js'] },
})
