import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import netlify from "@netlify/vite-plugin-tanstack-start";

// Netlify's plugin configures Nitro's "netlify" preset and the Netlify
// Functions/Edge adapter itself, so no separate nitro/vite plugin is added
// here — TanStack's own Netlify hosting guide and Netlify's docs both show
// tanstackStart() + netlify() alone, without nitro().
export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart({
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      server: { entry: "server" },
    }),
    viteReact(),
    netlify(),
  ],
});
