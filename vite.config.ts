// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  plugins: [
    {
      name: "lawclub-brand-font",
      enforce: "pre",
      transform(code, id) {
        if (!id.split("?")[0]?.endsWith("/src/styles.css")) return;
        const sources = ["woff2", "woff"]
          .filter((extension) =>
            existsSync(
              fileURLToPath(new URL(`./public/fonts/HTBaybars.${extension}`, import.meta.url)),
            ),
          )
          .map((extension) => `url("/fonts/HTBaybars.${extension}") format("${extension}")`);
        if (sources.length)
          return code.replace('src: local("HT Baybars");', `src: ${sources.join(", ")};`);
        return undefined;
      },
    },
  ],
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
