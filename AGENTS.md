# AGENTS.md

## Project

MimoDoku is a standalone cat-placement Sudoku game built with TanStack Start,
React 19, and Cloudflare Workers.

## Commands

```bash
pnpm dev
pnpm check
pnpm e2e
pnpm build
pnpm run deploy
```

Deployment credentials are local CLI credentials only. They are not runtime
Worker secrets and must not be uploaded with `wrangler secret put`.

## Architecture

- `src/game/`: game UI, puzzle data, preferences, and browser storage
- `src/routes/`: TanStack Router file routes
- `src/lib/haptics.ts`: browser haptic compatibility helper
- `public/`: icons, mascot art, social preview, font files, and game audio
- `tests/e2e/`: Playwright user journeys

The route tree is generated at `src/routeTree.gen.ts`; never edit it manually.

## Constraints

- Keep the Worker stateless.
- Avoid Node.js-only runtime APIs.
- Preserve deterministic daily puzzles.
- Keep local-storage and session-storage schemas versioned.
- Update Playwright tests for user-visible behavior changes.
- Document the source and license status of every new binary asset.
- Do not expose credentials in logs or committed files.
