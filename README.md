# Card Game

A small React card game. Deal a deck, play the highest card, take the pot.

## Requirements

Node `^20.19.0 || ^22.13.0 || >=24`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Run the Vitest suite |
| `npm run typecheck` | Type-check without emitting |
| `npm run lint` | Lint |

## Conventions

- Imports are absolute from `@cg/` (which maps to `src/`). The only relative imports
  permitted are sibling `./*.module.css` files; ESLint enforces this.
- Responsive behaviour is CSS media queries and custom properties only — there is no
  JS viewport measurement.
- Tests are logic-only and run in Vitest's `node` environment.

## Design docs

- Spec: `docs/superpowers/specs/2026-08-06-typescript-rewrite-design.md`
- Plan: `docs/superpowers/plans/2026-08-06-typescript-rewrite.md`
