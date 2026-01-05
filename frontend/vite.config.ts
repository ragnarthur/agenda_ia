import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"
import { readFileSync } from "node:fs"

// https://vite.dev/config/
const packageJson = JSON.parse(
  readFileSync(path.resolve(__dirname, "package.json"), "utf-8")
)

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
})
