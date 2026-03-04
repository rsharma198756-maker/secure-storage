import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  appType: "spa",           // serve index.html for all unmatched routes
  resolve: {
    // Prefer TS sources over generated JS siblings on extensionless imports.
    extensions: [".tsx", ".ts", ".jsx", ".js", ".mjs", ".json"]
  },
  server: {
    port: 5173,
  }
});
