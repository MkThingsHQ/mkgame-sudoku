# Contributing

## Workflow

1. Create a focused branch.
2. Add or update a behavioral test.
3. Implement the change.
4. Run all quality checks.
5. Submit a pull request with screenshots for visual changes.

```bash
pnpm check
pnpm e2e
pnpm build
```

## Project boundaries

- Do not commit secrets, `.env` files, or Cloudflare credentials.
- Do not copy code from proprietary starter kits or commercial projects.
- Document the source and license status of every new binary asset.

## Code style

- TypeScript with strict type checking
- Two-space indentation
- Single quotes
- Semicolons
- Kebab-case file names
- PascalCase React components
- `@/` imports for project source files
