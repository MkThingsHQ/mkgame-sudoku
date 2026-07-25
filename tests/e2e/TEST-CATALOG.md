# E2E Test Catalog

This catalog is the acceptance checklist for the standalone MimoDoku app.

## Workflow

Use the local feature flow:

```txt
Spec -> Code -> Verify -> Test -> Green
```

1. Update this catalog.
2. Implement the change.
3. Walk the real UI in a browser.
4. Update the Playwright spec.
5. Run the related test and then the full suite.

## MimoDoku journeys

**File:** `specs/game.spec.ts` | **Priority:** P0

The suite verifies:

- Home navigation and animated MimoDoku branding
- Required first-run tutorial and permanent guide
- Level selection, locks, and deterministic daily puzzles
- Placement rules, marking, mistakes, hints, undo, and completion
- Session restore and safe handling of invalid saved data
- English and Chinese settings with persisted preferences
- Background music, sound, haptics, and reduced motion
- Ranking and progress persistence
- Browser-history return navigation from settings and the guide without
  `returnTo`, `level`, or `mode` query parameters
- Explicit home navigation from the level selector and ranking page, preventing
  a level/selector browser-history loop
- Preserved visual spacing between secondary-page titles and their first
  content section
- Active-game exit confirmation
- Desktop and mobile layout health with no horizontal overflow
- Shared secondary-page headers and accessible controls
- Root-level public routes (`/`, `/levels`, `/play`, `/ranking`,
  `/settings`, and `/how-to-play`)
