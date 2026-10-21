# Mediqom

Medical records explorer and doctor–patient consultation analysis. SvelteKit 2 / Svelte 5 web app with a Capacitor build for iOS and Android, Supabase for auth and data, and client-side AES/RSA (+ ML-KEM) encryption so the server never sees plaintext health data.

## Develop

```bash
npm install
npm run dev          # dev server
npm run check        # svelte-check + types
npm run lint         # prettier + eslint
npm test             # Playwright + Vitest
```

Mobile: `npm run mobile:build`, `npm run mobile:sync`, then `npm run mobile:ios` / `npm run mobile:android`.

## Docs

- [`docs/README.md`](docs/README.md): documentation index and feature status board
- [`CLAUDE.md`](CLAUDE.md): architecture overview and coding conventions (for people and AI agents)
- [`DESIGN.md`](DESIGN.md): design system tokens and components
- [`AGENTS.md`](AGENTS.md): repo conventions for testing and commits
