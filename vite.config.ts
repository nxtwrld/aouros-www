import { sveltekit } from "@sveltejs/kit/vite";
//import { defineConfig } from 'vitest/config';
import { type ViteDevServer, defineConfig, normalizePath } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import topLevelAwait from "vite-plugin-top-level-await";
import path from "path";
import { dagConfigPlugin } from "./vite-plugin-dag-config";

export default defineConfig({
  plugins: [
    topLevelAwait({
      // The export name of top-level await promise for each chunk module
      promiseExportName: "__tla",
      // The function to generate import names of top-level await promise in each chunk module
      promiseImportName: (i) => `__tla_${i}`,
    }),
    dagConfigPlugin(),
    viteStaticCopy({
      targets: [
        {
          src: normalizePath(
            path.join(
              __dirname,
              "node_modules/@ricky0123/vad-web/dist/vad.worklet.bundle.min.js",
            ),
          ),
          dest: normalizePath(path.join(__dirname, "static")),
        },
        {
          src: normalizePath(
            path.join(
              __dirname,
              "node_modules/@ricky0123/vad-web/dist/silero_vad.onnx",
            ),
          ),
          dest: normalizePath(path.join(__dirname, "static")),
        },
        {
          src: normalizePath(
            path.join(__dirname, "node_modules/onnxruntime-web/dist/*.wasm"),
          ),
          dest: normalizePath(path.join(__dirname, "static")),
        },
        {
          src: normalizePath(
            path.join(__dirname, "node_modules/pdfjs-dist/build/*.*"),
          ),
          dest: normalizePath(path.join(__dirname, "static/pdfjs")),
        },
      ],
    }),
    sveltekit(),
  ],
  server: {
    port: 5174,
    watch: {
      usePolling: true,
      interval: 1000,
      ignored: [
        "**/.DS_Store",
        "**/.git/**",
        "**/node_modules/**",
        "**/.cursor/**",
        "**/.cursor-tutor/**",
        "**/.vercel/**",
        "**/.svelte-kit/**",
        "**/build/**",
        "**/dist/**",
        "**/.vscode/**",
        "**/.idea/**",
        "**/*.log",
        "**/*.tmp",
        "**/*.temp",
      ],
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
    },
    exclude: ["onnx-runtime-web"],
  },
  test: {
    include: ["src/**/*.{test,spec}.{js,ts}"],
  },
});
