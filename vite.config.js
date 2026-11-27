import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        complete: resolve(import.meta.dirname, "pages/complete.html"),
        climateChamber: resolve(
          import.meta.dirname,
          "src/rooms/ClimateChamber.html",
        ),
        maze: resolve(import.meta.dirname, "src/rooms/Maze.html"),
        riverCrossing: resolve(
          import.meta.dirname,
          "src/rooms/RiverCrossing.html",
        ),
        demolitionLab: resolve(
          import.meta.dirname,
          "src/rooms/DemolitionLab.html",
        ),
        resonanceLab: resolve(
          import.meta.dirname,
          "src/rooms/ResonanceLab.html",
        ),
      },
    },
  },
});