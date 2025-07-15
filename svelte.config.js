import adapter from "@sveltejs/adapter-auto";
import vercel from "@sveltejs/adapter-vercel";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { mdsvex } from "mdsvex";
import { createMermaidHighlighter } from "./src/lib/mdsvex-config.js";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://kit.svelte.dev/docs/integrations#preprocessors
  // for more information about preprocessors
  preprocess: [
    vitePreprocess({ script: true }),
    mdsvex({
      extensions: [".md", ".svx"],
      remarkPlugins: [],
      rehypePlugins: [],
      highlight: {
        highlighter: createMermaidHighlighter(),
      },
    }),
  ],

  extensions: [".svelte", ".md", ".svx"],

  kit: {
    // adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
    // If your environment is not supported or you settled on a specific environment, switch out the adapter.
    // See https://kit.svelte.dev/docs/adapters for more information about adapters.
    adapter: vercel({
      strict: false,
      maxDuration: 300,
    }),
    files: {
      //lib: 'src/core/lib',
    },
    alias: {
      $components: "src/components",
      $data: "src/data",
      $media: "src/media",
    },
    prerender: {
      entries: [
        "/",
        "/www",
        "/www/en",
        "/www/cs",
        "/www/de",
        "/www/en/home",
        "/www/cs/home",
        "/www/de/home",
        "/www/en/families",
        "/www/en/doctors",
        "/www/en/appconnect",
        "/www/en/security",
        "/www/en/pricing",
        "/www/en/beta",
        "/www/en/faq",
        "/www/en/contact",
        "/www/en/faq-doctors",
        "/www/en/terms",
        "/www/en/privacy",
        "/www/en/test-mermaid",
      ],
    },
  },
};

export default config;
