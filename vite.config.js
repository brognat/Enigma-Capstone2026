import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        complete: resolve(import.meta.dirname, "pages/complete.html"),
        game: resolve(import.meta.dirname, "pages/game.html")
        // add each page in pages/ here
      },
    },
  },
});