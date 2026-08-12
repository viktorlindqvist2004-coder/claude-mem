import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Bara för demon. Paketet självt byggs av den sida som använder det.
export default defineConfig({
  root: 'demo',
  plugins: [react()],
  server: { port: 5300 },
  preview: { port: 5300 },
})
