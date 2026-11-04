import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        about: resolve(import.meta.dirname, "pages/about.html"),
        complete: resolve(import.meta.dirname, "pages/complete.html"),
        dataExport: resolve(import.meta.dirname, "pages/data-export.html"),
        game: resolve(import.meta.dirname, "pages/game.html")
        // add each page in pages/ here
      },
    },
  },
});