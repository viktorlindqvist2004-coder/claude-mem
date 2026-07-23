import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
// BASE_PATH sätts i GitHub Pages-bygget (t.ex. "/claude-mem/"). Lokalt är
// den tom, så `npm run dev` serveras från roten "/".
export default defineConfig({
  base: process.env.BASE_PATH || "/claude-mem/sunt-fornuft/",
  plugins: [react()],
});
