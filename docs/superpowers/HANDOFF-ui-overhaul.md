# Handoff — UI/UX overhaul

**For:** a fresh session picking this up
**Written:** 2026-08-11

## Start here

1. Read `docs/superpowers/specs/2026-08-11-ui-overhaul-design.md`. It is approved and complete — design decisions are settled, do not re-litigate them.
2. Invoke `superpowers:writing-plans` to turn it into `docs/superpowers/plans/2026-08-11-ui-overhaul.md`.
3. Execute with `superpowers:subagent-driven-development`.

Do **not** re-run brainstorming. The design conversation happened; its outcome is the spec.

## State of the repo

- Branch `typescript-rewrite`, PR #3 open against `main`, unmerged.
- 64 tests, `npm audit` clean, runtime dependencies exactly `react`, `react-dom`, `react-router`.
- **Decide first:** branch this work off `typescript-rewrite`, or wait for #3 to merge and branch off `main`. Branching off `typescript-rewrite` is fine and probably simpler — it is where all this code lives.

## Settled decisions — do not reopen

| Decision | Why |
| --- | --- |
| Green felt and photographic cards stay | The owner explicitly likes them; they are what makes it feel real |
| Layout stays | Its responsive matrix was verified against the original across all three permutations |
| No FLIP — arrival + exit handoff instead | Three of four players' cards are face-down and identical, so FLIP's continuity is imperceptible; see spec §4 |
| Sound is synthesized, zero bytes | No assets to license or bundle |
| Pacing drops to 650ms | Approved; cuts ~18s from a four-player game |

## Traps this codebase has already bitten on

These are real defects that reached review during the rewrite. Do not rediscover them.

1. **StrictMode double-invokes effects.** An effect that latches a flag on mount and returns *no cleanup* will see the flag already set on the second invoke and fall through. This caused a Critical crash once and was nearly reintroduced a second time. Gate on idempotent *state*, not a mount latch. If you must use a mounted-ref, assign `true` on setup as well as clearing on cleanup.
2. **The node test environment has no DOM.** No `localStorage`, no `window`, no layout. `jsdom` and `happy-dom` are forbidden. `react-dom/server` renders without a DOM and is already a dependency — that is how `pages.test.ts` covers the render path.
3. **CSS module class names are not type-checked.** `vite/client` types them as a generic index signature, so `styles.tpyo` yields `undefined` and renders `class="undefined"` silently. Verify every `styles.*` lookup exists by reading the stylesheet.
4. **Layout invariants can live in the *sum* of parts.** Two separately-correct CSS rules produced a 270px drift because the original held `hand + spacer + pile` constant. Per-file review missed it; only whole-branch review caught it. When changing sizing, check the total, not the piece.
5. **Commit discipline.** Always stage explicit paths. A bare `git commit` after a partial `git add` sweeps the whole index — that happened once and required a history rewrite. Put `-m` *before* any `--` pathspec.
6. **Every import is `@cg/`**, stylesheets included. ESLint enforces it; there are no relative imports anywhere.
7. **Do not bump `typescript` past 6.0.3.** `typescript-eslint` caps at `<6.1.0`; TS 7 silently disables all linting.

## The one hard constraint

`playGameReducer` is pinned by a property test playing 900 seeded games against ground truth. The spec permits exactly two non-view changes — `TIME_BETWEEN_PLAYS_MS` to 650, and an additive `GameState.lastRoundWinnerId`. **If the property test fails, the change is wrong.**

Adding a required field to `GameState` breaks every full state literal, notably `stateWith` in `use-play-game.test.ts` and the smoke tests. That is a compile error, so `tsc` will list each site.

## What cannot be verified automatically

No agent in this project has been able to drive a browser. Motion, layout and sound need a human pass — spec §11 lists the checks. Report honestly what was and was not observed; a previous implementer correctly refused to claim a browser check it could not run, and that was the right call.

## Working agreement that produced good results last time

- Fresh implementer subagent per task, brief passed as a file path, never the whole plan.
- Task reviewer after each task; the controller independently verifies gates rather than trusting reports.
- Fix rounds resume the original implementer, who still has context.
- Keep a ledger at `.superpowers/sdd/<plan-name>/progress.md`; it is what survives compaction.
- When a review finds a defect in the *plan* rather than the implementation, fix the plan and regenerate the brief, so the fix is permanent rather than local to one working tree.
