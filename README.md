# MimoDoku

A cozy, browser-based cat-placement Sudoku puzzle built with TanStack Start,
React, and Cloudflare Workers.

![MimoDoku](./public/og.png)

## Features

- 80 handcrafted logic puzzles
- Deterministic daily puzzle
- English and Chinese interfaces
- Mouse, touch, and keyboard-friendly controls
- Automatic marking, hints, undo, and session restore
- Local progress, completion history, and ranking
- Music, sound, haptics, and reduced-motion preferences
- Responsive desktop and mobile layouts

## Tech stack

- TanStack Start
- TanStack Router
- React 19
- TypeScript
- Cloudflare Workers
- Playwright
- Biome

## Development

```bash
pnpm install
pnpm dev
```

The local application is available at `http://localhost:3000`.

## Test

```bash
pnpm check
pnpm e2e
pnpm build
```

## Deployment

Log in to Cloudflare once:

```bash
pnpm exec wrangler login
```

Deploy the production Worker:

```bash
pnpm run deploy
```

The Worker is deployed to `sudoku.mksaas.link`. It is stateless and does not
require runtime environment variables or Cloudflare storage bindings.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Game menu |
| `/levels` | Level selection |
| `/play?level=1` | Handcrafted level |
| `/play?mode=daily` | Daily puzzle |
| `/ranking` | Local completion history |
| `/settings` | Language and game preferences |
| `/how-to-play` | Rules and controls |

## Build more with TanStarter

MimoDoku is intentionally kept small and focused, but it originally grew out
of a project built with [TanStarter](https://tanstarter.dev).

If you want to turn a game, tool, or product idea into a complete SaaS,
TanStarter provides a production-ready TanStack Start boilerplate with auth,
payments, AI, storage, email, newsletters, a blog, dashboard, i18n, SEO, and
Cloudflare Workers deployment.

**Ship Faster with TanStack, Cost Less with Cloudflare.**

- [TanStarter website](https://tanstarter.dev)
- [Live demo](https://demo.tanstarter.dev)
- [Documentation](https://docs.tanstarter.dev)
- [Video tutorials](https://www.youtube.com/@TanStarter)

## Asset notice

Third-party packages and binary asset notes are documented in
[THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).

If you are a rights holder and believe an asset should be removed, please open
an issue or contact the repository maintainer.

## License

Source code is released under the [MIT License](./LICENSE). Third-party assets
may be subject to separate rights described in
[THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
