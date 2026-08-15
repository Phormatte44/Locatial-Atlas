import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const libraryExternals = [
  "react",
  "react-dom",
  "react/jsx-runtime",
  "maplibre-gl",
  "three",
  "gsap",
  "@turf/turf"
];

export default defineConfig(({ mode }) => {
  const plugins = [react()];

  if (mode === "library") {
    return {
      plugins,
      publicDir: false,
      build: {
        lib: {
          entry: "src/index.ts",
          formats: ["es"],
          fileName: "index"
        },
        rollupOptions: {
          external: libraryExternals
        },
        sourcemap: true,
        emptyOutDir: true
      }
    };
  }

  return {
    plugins,
    server: {
      port: 5190,
      strictPort: true,
      open: true
    }
  };
});
