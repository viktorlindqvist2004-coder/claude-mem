import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relativ bas gör att bygget fungerar både på en egen domän och i en
// underkatalog (t.ex. GitHub Pages) utan omkonfiguration.
export default defineConfig({
  base: process.env.BASE_PATH || './',
  plugins: [react()],
})
