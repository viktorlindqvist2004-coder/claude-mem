import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/claude-mem/barbershop/',
  plugins: [react(), tailwindcss()],
})
