import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Sidan ligger i roten på sin egen domän (Vercel). Ska den någon gång
// serveras från en underkatalog räcker det att sätta BASE_PATH i bygget.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
})
