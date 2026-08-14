# Card Game UI/UX Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the game's 2022 chrome with a modern, animated, keyboard-operable surface that tells the player whose turn it is, where the pot went, and how far through the game they are — without touching the game rules.

**Architecture:** Everything is view-layer. A single token sheet (`src/styles/theme.css`) holds the palette, type scale and motion durations; no component hardcodes a colour. Motion is CSS keyframes driven by two small hooks whose *pure cores* are extracted so they can be unit-tested in a DOM-free Node environment. Sound is synthesized at runtime with WebAudio behind a three-function module that fails silently. Exactly two non-view changes are permitted, both listed in Global Constraints.

**Tech Stack:** Vite 8.2.1, React 19.2.8, TypeScript 6.0.3, react-router 8.3.0, Vitest 4.1.10 (node environment), CSS Modules, WebAudio.

**Spec:** `docs/superpowers/specs/2026-08-11-ui-overhaul-design.md` — read it before Task 1. It is approved; do not re-litigate its decisions.

---

## Global Constraints

Every task's requirements implicitly include this section.

### Environment

- **`npm` is not on the default PATH in this environment.** Every shell command in this plan must be preceded by:
  ```bash
  export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"
  ```
  `node -v` must report `v24.19.0`. If it reports v22 or v18, the export did not take.
- Work happens on the `ui-overhaul` branch. Do not create worktrees or switch branches.

### Code style

- No semicolons, single quotes, 2-space indent, arrow-function components. Every code block in this plan already follows it.
- **Every intra-project import is `@cg/...`, stylesheets included.** ESLint fails the build on a relative import. There are no exceptions.
- `strict: true`. No `any`, no `@ts-ignore`, no non-null assertions (`!`). Narrow explicitly. `as unknown as X` is permitted **only** in test doubles, and only where noted.
- `noUnusedLocals` and `noUnusedParameters` are on. A leftover import is a build failure.

### Dependencies

- **Runtime dependencies stay exactly three:** `react`, `react-dom`, `react-router`. Adding any other `dependencies` entry fails the review.
- **No new devDependencies either.** In particular `jsdom`, `happy-dom`, `@testing-library/*` and `react-test-renderer` are forbidden — see "Testing" below.
- **Do not bump `typescript` past 6.0.3.** `typescript-eslint@8.66.0` requires `<6.1.0`; TypeScript 7 silently disables all linting.
- **No new asset bytes and no webfont.** Sound is synthesized; type is the system stack.

### The one hard constraint

`playGameReducer` is pinned by a property test playing 900 seeded games against ground truth (`use-play-game.test.ts`, `describe('gameLeads property')`). **If that test fails, the change is wrong — revert it, do not adjust the test.**

Exactly two non-view changes are permitted across this whole plan, both in Task 2:

1. `TIME_BETWEEN_PLAYS_MS` 1000 → 650
2. `GameState.lastRoundWinnerId: number | null`, additive, set by `HANDLE_ROUND_COMPLETED`, `null` initially

Any other change to `src/hooks/use-play-game.tsx`'s reducer, `src/lib/cards.ts`'s rank logic, or `src/lib/storage.ts`'s game payload is out of scope.

### Testing

- **Vitest runs in the `node` environment. There is no DOM** — no `window`, no `localStorage`, no layout, no `requestAnimationFrame`, and no way to run a React hook. `jsdom` and `happy-dom` are forbidden.
- `react-dom/server`'s `renderToString` works without a DOM and is already a dependency. That is how `src/pages/pages.test.ts` covers the render path. **`useEffect` does not run under `renderToString`** — server rendering only exercises render-time code.
- Therefore: **every piece of logic worth testing is extracted as a pure function and tested directly**, and the hook that wraps it stays thin enough to review by eye. Tasks 3, 4 and 9 do exactly this. Where a behaviour genuinely cannot be covered (timer expiry, rAF stepping, focus movement), the plan says so explicitly and defers it to the manual pass. **Do not claim coverage you do not have.**

### Copy — exact strings

These strings are asserted by tests. Component and test must agree character for character, including the ellipsis character `…` (U+2026) and the en dash `—` (U+2014).

| Where | Exact string |
| --- | --- |
| Home title | `Card Game` |
| Home instruction | `Highest card takes the pot. Ten rounds — the best score wins.` |
| Home player-count prompt | `Select number of players` |
| Home buttons | `2 Players`, `3 Players`, `4 Players` |
| Home loading | `Dealing…` |
| Home error (unchanged, from `use-create-game.ts`) | `Could not deal a new game. Please try again.` |
| Nameplate name | `Name: ${player.name}` |
| Nameplate score | `Score: ${score}` |
| Turn cue | `Your turn` |
| Round indicator | `Round`, then the number, then `/`, then `10` |
| Modal button | `New game` |

`Name: User` and `Score: 0` are asserted by the existing smoke tests. **Do not reword them.**

### Traps this codebase has already bitten on

Read these. They are real defects that reached review during the rewrite.

1. **StrictMode double-invokes effects on mount.** An effect that latches a flag on mount and returns *no cleanup* sees the flag already set on the second invoke and falls through. Gate on idempotent *state*, not a mount latch. Every effect in this plan is gated on a state value and is safe to run twice; if you add one, keep that property.
2. **CSS module class names are not type-checked.** `styles.tpyo` is `undefined` and renders `class="undefined"` silently. After writing a component, re-read its stylesheet and confirm every `styles.*` lookup exists.
3. **Layout invariants live in the *sum* of parts.** The hand's width is fixed at a full hand because the original held `hand + spacer + pile` constant; the community slot's 3px border is load-bearing because the row totals `players * (card-w + 6)`. **When you change sizing, check the total, not the piece.** This plan never changes a card, slot, or hand dimension — if a step seems to require it, stop and report instead.
4. **Commit discipline.** Always `git add` explicit paths, and put `-m` *before* any `--` pathspec. A bare `git commit` after a partial `git add` sweeps the whole index; that happened once and required a history rewrite.

### Definition of done for every task

Run all four, from the repo root, with the PATH export above:

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

All four clean. `npm test` must report **at least** the count in the task's step, and the `gameLeads property` tests must be among the passes.

---

## File Structure

| Path | Responsibility | Task |
| --- | --- | --- |
| `src/styles/theme.css` | rewritten — palette, type, motion tokens, reduced-motion block | 1 |
| `src/components/common/text.tsx` | transitional colour remap, then deleted | 1, 12 |
| `src/components/playing-table.tsx` + css | felt gradient, rail, vignette, absolutely-positioned header slot | 1, 5 |
| `src/constants.ts` | `TIME_BETWEEN_PLAYS_MS` 1000 → 650 | 2 |
| `src/types.ts` | `GameState.lastRoundWinnerId` | 2 |
| `src/hooks/use-play-game.tsx` | set `lastRoundWinnerId`; fire sound cues | 2, 5 |
| `src/hooks/use-count-up.ts` + test | `interpolate`, `prefersReducedMotion`, `useCountUp` | 3 |
| `src/hooks/use-departed.ts` + test | `departedFrom`, `useDeparted` | 4 |
| `src/lib/storage.ts` | `readItem` / `writeItem` shared seam | 5 |
| `src/lib/sound.ts` + test | WebAudio synthesis, preference, fail-silent surface | 5 |
| `src/hooks/use-sound.ts` | toggle state | 5 |
| `src/components/sound-toggle.tsx` + css | labelled `aria-pressed` button | 5 |
| `src/lib/cards.ts` | `cardName` for aria-labels | 6 |
| `src/components/card.tsx` + css | `Card` (decorative) and `PlayableCard` (button) | 6 |
| `src/components/players-cards.tsx` + css | roving tabindex, exit ghost | 6, 7 |
| `src/components/community-cards.tsx` + css | arrival animation, pot ghost, winning-card glow | 7 |
| `src/components/player.tsx` + css | turn state, won-stack pulse | 8 |
| `src/components/name-and-points.tsx` + css | restyle, count-up, turn ring | 8 |
| `src/components/round-progress.tsx` + css | new | 9 |
| `src/lib/announce.ts` + test | pure announcement text | 9 |
| `src/components/live-region.tsx` | `aria-live` renderer | 9 |
| `src/components/modal.tsx` + css | restyle, dialog semantics, focus trap, Escape | 10 |
| `src/pages/home.tsx` + css | restyle, loading and error states | 11 |
| `src/pages/game.tsx` + css | mount round progress, sound toggle, live region | 5, 9 |
| `src/pages/pages.test.ts` | extended smoke coverage | 6, 10, 11 |
| `src/components/common/{text,button,wrap}.*` | deleted once unused | 12 |

### Two deliberate departures from the spec's file inventory

Both are decisions, not drift. They are made here so no implementer has to make them alone.

1. **`src/lib/announce.ts` is a new file** the spec's inventory does not list. The spec asks for `live-region.tsx`; the announcement *text* is pure logic and is the only part that can be tested in this environment, so it lives in `lib/` with a test and the component stays a four-line renderer.
2. **`src/components/common/text.tsx` and `button.tsx` are touched**, though the inventory omits them. They map `TextColor` onto `--color-primary` etc., which this overhaul deletes. Task 1 repoints that map so the app never breaks mid-plan; Task 12 deletes both files once no component imports them.

---

### Task 1: Palette migration and the felt

Rewrites the token sheet and moves every existing reference onto the new tokens in one commit, so the app is never half-migrated. The felt gets its gradient, hairline rail and vignette. Later tasks restyle individual components properly; this task only makes them correct against the new palette.

**Files:**
- Modify: `src/styles/theme.css` (full rewrite)
- Modify: `src/components/playing-table.module.css`
- Modify: `src/components/common/text.tsx:14-22`
- Modify: `src/components/common/button.module.css:6`
- Modify: `src/components/players-cards.module.css:37`
- Modify: `src/components/community-cards.module.css:20`
- Modify: `src/components/name-and-points.module.css:5,11`
- Modify: `src/components/modal.module.css:22`
- Test: none new — `src/pages/pages.test.ts` must keep passing unchanged

**Interfaces:**
- Consumes: nothing.
- Produces: the CSS custom properties every later task references — `--surface-0/1/2`, `--felt-lit/base/edge`, `--rail`, `--text-hi/-lo`, `--accent`, `--accent-soft`, `--danger`, `--font-ui`, `--font-display`, `--fs-xs/sm/base/lg/xl/2xl`, `--dur-fast/base/card/pot`, `--ease-out`, and the untouched `--card-w`, `--card-h`, `--card-stick`.

- [ ] **Step 1: Confirm the baseline is green before changing anything**

```bash
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"
npm run typecheck && npm run lint && npm test
```

Expected: typecheck and lint silent, `Tests  64 passed (64)`.

- [ ] **Step 2: Rewrite `src/styles/theme.css`**

Replace the whole file with this. The three card-size custom properties and both media queries are carried over **unchanged** — they are the verified responsive matrix and are not part of this overhaul.

```css
:root {
  /* Surfaces */
  --surface-0: #0d0f0e;
  --surface-1: #14181a;
  --surface-2: rgba(255, 255, 255, 0.06);

  /* Felt — --felt-base is the existing green, kept deliberately */
  --felt-lit: #2b8a10;
  --felt-base: #1e6b03;
  --felt-edge: #123f03;
  --rail: rgba(201, 162, 39, 0.35);

  /* Text and accent */
  --text-hi: #f2efe6;
  --text-lo: #a9a49a;
  --accent: #c9a227;
  --accent-soft: rgba(201, 162, 39, 0.16);
  --danger: #e0705a;

  /* Type — system stack only, no webfont, no bundle cost */
  --font-ui: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  --font-display: ui-serif, Georgia, 'Times New Roman', serif;

  --fs-xs: 12px;
  --fs-sm: 14px;
  --fs-base: 16px;
  --fs-lg: 20px;
  --fs-xl: 28px;
  --fs-2xl: 40px;

  /* Motion */
  --dur-fast: 140ms;
  --dur-base: 240ms;
  --dur-card: 300ms;
  --dur-pot: 420ms;
  --ease-out: cubic-bezier(0.2, 0.8, 0.2, 1);

  /*
   * Card geometry — carried over untouched from the rewrite. The hand, won pile and
   * community row all size themselves from these, and their totals are load-bearing.
   * Changing any of the three is out of scope for this overhaul.
   */
  --card-w: 75px;
  --card-h: 104px;
  --card-stick: 20px;
}

@media (min-width: 700px) and (max-width: 1199px) {
  :root {
    --card-w: 113px;
    --card-h: 157px;
    --card-stick: 30px;
  }
}

@media (min-width: 1500px) {
  :root {
    --card-w: 113px;
    --card-h: 157px;
  }
}

body {
  margin: 0;
  background: var(--surface-0);
  color: var(--text-hi);
  font-family: var(--font-ui);
  font-size: var(--fs-base);
}

/*
 * One block turns the whole overhaul's motion off. Tokens drop to 1ms so anything
 * timed from them collapses, and the !important sweep catches animations declared
 * with literal durations. useCountUp checks the same preference in JS — see
 * src/hooks/use-count-up.ts.
 */
@media (prefers-reduced-motion: reduce) {
  :root {
    --dur-fast: 1ms;
    --dur-base: 1ms;
    --dur-card: 1ms;
    --dur-pot: 1ms;
  }

  *,
  *::before,
  *::after {
    animation-duration: 1ms !important;
    animation-delay: 0ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
    transition-delay: 0ms !important;
  }
}
```

- [ ] **Step 3: Give the table its felt**

Replace `src/components/playing-table.module.css` with:

```css
.table {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  /*
   * border-box is deliberate. With content-box the 100vh minimum plus padding and border
   * always overflowed the viewport by 60px; harmless while the page behind was also
   * green, but now --surface-0 shows as a dark band under the table. This is the outermost
   * container and its children are centred, so no inner invariant depends on the sum.
   */
  box-sizing: border-box;
  background:
    radial-gradient(ellipse 90% 70% at 50% 38%,
      var(--felt-lit) 0%,
      var(--felt-base) 45%,
      var(--felt-edge) 100%);
  /* The 10px gold border becomes a hairline rail plus depth. */
  border: 1px solid var(--rail);
  box-shadow:
    inset 0 0 140px rgba(0, 0, 0, 0.45),
    0 24px 80px rgba(0, 0, 0, 0.6);
  /* Top padding leaves room for the absolutely-positioned header added in Task 5. */
  padding: 56px 20px 20px;
}

@media (min-width: 1200px) {
  .table[data-many-players='true'] {
    align-items: stretch;
  }
}
```

- [ ] **Step 4: Repoint `COLOR_VARIABLE` onto the new tokens**

In `src/components/common/text.tsx`, replace the `COLOR_VARIABLE` map (lines 14-22) with this. Leave the `TextColor` union and everything else in the file alone — this is transitional, and Task 12 deletes the file.

```ts
/*
 * Transitional. The old --color-* palette is gone; these names survive only until the
 * last component stops importing Text and Button. Task 12 of the UI overhaul plan
 * deletes both files. Do not add a new call site.
 */
export const COLOR_VARIABLE: Record<TextColor, string> = {
  primary: 'var(--accent)',
  secondary: 'var(--text-hi)',
  white: 'var(--text-hi)',
  black: 'var(--surface-0)',
  silver: 'var(--text-lo)',
  darkSlateGray: 'var(--surface-1)'
}
```

- [ ] **Step 5: Move the four remaining stylesheet references**

Four one-line edits. **Do not change any width, height or border *width*** — only the colour. The 3px community slot border and the 2px won-pile border are load-bearing (see Trap 3).

`src/components/common/button.module.css:6`:
```css
  border: 2px solid var(--rail);
```

`src/components/players-cards.module.css:37` — inside `.bordered`:
```css
  border: 2px solid var(--rail);
```

`src/components/community-cards.module.css:20` — inside `.slot`, width stays 3px:
```css
  border: 3px solid var(--rail);
```

`src/components/modal.module.css:22` — inside `.content`:
```css
  background: var(--surface-1);
```

And `src/components/name-and-points.module.css`, both rules:
```css
.nameTag {
  display: flex;
  justify-content: space-between;
  align-self: stretch;
  background: var(--surface-2);
  padding: 10px;
  border-radius: 5px;
}

.leading {
  background: var(--accent-soft);
}
```

- [ ] **Step 6: Verify no reference to the old palette survives**

```bash
grep -rn -- "--color-" src
```

Expected: **no output at all.** Any hit is a token that now resolves to nothing and renders as an invalid declaration the browser silently drops.

- [ ] **Step 7: Run the full gate**

```bash
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"
npm run typecheck && npm run lint && npm test && npm run build
```

Expected: all clean, `Tests  64 passed (64)`.

- [ ] **Step 8: Commit**

```bash
git add src/styles/theme.css src/components/playing-table.module.css \
  src/components/common/text.tsx src/components/common/button.module.css \
  src/components/players-cards.module.css src/components/community-cards.module.css \
  src/components/name-and-points.module.css src/components/modal.module.css
git commit -m "feat: replace the palette with the overhaul's token system"
```

---

### Task 2: `lastRoundWinnerId` and pacing

The plan's only two non-view changes. TDD: the new assertions are written first, and the property test stands as the regression gate.

**Files:**
- Modify: `src/types.ts:18-25`
- Modify: `src/constants.ts:3`
- Modify: `src/hooks/use-play-game.tsx:25-32,100-107`
- Test: `src/hooks/use-play-game.test.ts:18-26` (extend `stateWith`) and a new `describe`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `GameState.lastRoundWinnerId: number | null` — the `id` of the player awarded the most recent pot, `null` until the first round settles. Read by Tasks 7, 8 and 9 via `usePlayGameContext()`.
  - `TIME_BETWEEN_PLAYS_MS = 650`.

- [ ] **Step 1: Write the failing tests**

In `src/hooks/use-play-game.test.ts`, first add the new field to the `stateWith` helper so every existing literal stays valid:

```ts
const stateWith = (numberOfPlayers: number, overrides: Partial<GameState> = {}): GameState => ({
  canUserPlay: true,
  activePlayerId: 0,
  roundNumber: 1,
  players: Array.from({ length: numberOfPlayers }, (_, id) => emptyPlayer(id)),
  community: [],
  gameLeads: [],
  lastRoundWinnerId: null,
  ...overrides
})
```

Then append this `describe` block immediately after the existing `describe('HANDLE_ROUND_COMPLETED', ...)` block and before `describe('gameLeads property', ...)`:

```ts
describe('lastRoundWinnerId', () => {
  it('is null before any round settles', () => {
    const discarded = card('7S', 7)
    const initial = stateWith(4)
    const withHand = {
      ...initial,
      players: replaceAt(0, { ...initial.players[0], remainingCards: [discarded] }, initial.players)
    }

    expect(initial.lastRoundWinnerId).toBeNull()

    const next = playGameReducer(withHand, {
      type: 'CARD_DISCARDED',
      payload: { cardObj: discarded, numberOfPlayers: 4 }
    })

    expect(next.lastRoundWinnerId).toBeNull()
  })

  it('names the player awarded the pot', () => {
    const community = [card('a', 3), card('b', 9), card('c', 2), card('d', 5)]
    const next = playGameReducer(stateWith(4, { community }), {
      type: 'HANDLE_ROUND_COMPLETED',
      payload: 4
    })

    expect(next.lastRoundWinnerId).toBe(1)
    expect(next.players[1].score).toBe(19)
  })

  // The pot ceremony animates toward this seat, so a tie must resolve to the same player
  // the pot was actually awarded to — the later one.
  it('follows the reducer tie rule to the later player', () => {
    const community = [card('a', 9), card('b', 9), card('c', 2), card('d', 5)]
    const next = playGameReducer(stateWith(4, { community }), {
      type: 'HANDLE_ROUND_COMPLETED',
      payload: 4
    })

    expect(next.lastRoundWinnerId).toBe(1)
  })

  it('is replaced, not accumulated, when a second round settles', () => {
    const first = playGameReducer(
      stateWith(4, { community: [card('a', 3), card('b', 9), card('c', 2), card('d', 5)] }),
      { type: 'HANDLE_ROUND_COMPLETED', payload: 4 }
    )
    const second = playGameReducer(
      { ...first, community: [card('e', 14), card('f', 2), card('g', 2), card('h', 2)] },
      { type: 'HANDLE_ROUND_COMPLETED', payload: 4 }
    )

    expect(second.lastRoundWinnerId).toBe(0)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"
npm run typecheck
```

Expected: FAIL — `Property 'lastRoundWinnerId' does not exist on type 'GameState'`, reported at the `stateWith` literal and at each `expect`. The type error is the failing test here; `npm test` would also fail to compile.

- [ ] **Step 3: Add the field to `GameState`**

In `src/types.ts`, replace the `GameState` interface with:

```ts
export interface GameState {
  canUserPlay: boolean
  activePlayerId: number
  roundNumber: number
  players: Player[]
  community: Card[]
  gameLeads: Player[]
  // The seat awarded the most recent pot. Purely for the view: the pot ceremony animates
  // toward it, and after the round settles the winner is otherwise unrecoverable from
  // state. No reducer decision reads it.
  lastRoundWinnerId: number | null
}
```

- [ ] **Step 4: Set it in the reducer**

In `src/hooks/use-play-game.tsx`, add the field to `initialState` (line 25-32):

```ts
const initialState: GameState = {
  canUserPlay: true,
  activePlayerId: 0,
  roundNumber: 1,
  players: [],
  community: [],
  gameLeads: [],
  lastRoundWinnerId: null
}
```

and to the object `HANDLE_ROUND_COMPLETED` returns (line 100-107):

```ts
      return {
        ...state,
        canUserPlay: !state.activePlayerId,
        roundNumber: state.roundNumber + 1,
        players: replaceAt(roundWinnerId, roundWinnerUpdated, state.players),
        community: [],
        gameLeads,
        lastRoundWinnerId: roundWinnerId
      }
```

`CARD_DISCARDED` needs no change — its `...state` spread carries the previous round's value through, which is what the pot ghost wants while the next round fills.

- [ ] **Step 5: Run the tests to verify they pass**

```bash
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"
npm test
```

Expected: PASS, `Tests  68 passed (68)`. The three `gameLeads property` tests must be among them — that is the 900-game gate.

- [ ] **Step 6: Drop the pacing constant to 650**

In `src/constants.ts`:

```ts
export const USERS_POSITION = 0
export const NUMBER_OF_CARDS_PER_PLAYER = 10
// 650ms: a card takes --dur-card (300ms) to arrive, leaving ~350ms of dwell before the
// next play. This is the only pacing control; nothing else reads it.
export const TIME_BETWEEN_PLAYS_MS = 650
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 4
```

- [ ] **Step 7: Run the full gate**

```bash
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"
npm run typecheck && npm run lint && npm test && npm run build
```

Expected: all clean, `Tests  68 passed (68)`.

- [ ] **Step 8: Commit**

```bash
git add src/types.ts src/constants.ts src/hooks/use-play-game.tsx src/hooks/use-play-game.test.ts
git commit -m "feat: record the round winner and quicken the pacing to 650ms"
```

---

### Task 3: `useCountUp`

Scores currently snap. This animates them. The interpolation maths and the reduced-motion check are pure and fully tested; the `requestAnimationFrame` loop that drives them is nine lines and is covered by the manual pass.

**Files:**
- Create: `src/hooks/use-count-up.ts`
- Test: `src/hooks/use-count-up.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interpolate(from: number, to: number, progress: number): number` — rounded, progress clamped to `[0, 1]`.
  - `prefersReducedMotion(): boolean` — `false` when there is no `window` or no `matchMedia`.
  - `useCountUp(value: number, durationMs: number): number` — used by Task 8's `NameAndPoints`.

- [ ] **Step 1: Write the failing test**

Create `src/hooks/use-count-up.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest'

import { interpolate, prefersReducedMotion } from '@cg/hooks/use-count-up'

// The node environment has no window at all. These tests install a minimal fake and
// remove it again, so nothing leaks into the DOM-free assumptions of other suites.
interface FakeWindow {
  matchMedia?: (query: string) => { matches: boolean }
}

const withWindow = (fake: FakeWindow | undefined, body: () => void): void => {
  const globals = globalThis as { window?: FakeWindow }
  const had = 'window' in globals
  const previous = globals.window

  if (fake === undefined) {
    delete globals.window
  } else {
    globals.window = fake
  }

  try {
    body()
  } finally {
    if (had) {
      globals.window = previous
    } else {
      delete globals.window
    }
  }
}

afterEach(() => {
  const globals = globalThis as { window?: FakeWindow }
  delete globals.window
})

describe('interpolate', () => {
  it('returns the start value at t=0', () => {
    expect(interpolate(10, 50, 0)).toBe(10)
  })

  it('returns the midpoint at t=0.5', () => {
    expect(interpolate(10, 50, 0.5)).toBe(30)
  })

  it('returns the target at t=1', () => {
    expect(interpolate(10, 50, 1)).toBe(50)
  })

  it('rounds to whole points', () => {
    expect(interpolate(0, 31, 0.5)).toBe(16)
  })

  it('clamps progress past the ends so a late frame cannot overshoot', () => {
    expect(interpolate(10, 50, 1.4)).toBe(50)
    expect(interpolate(10, 50, -0.2)).toBe(10)
  })

  it('counts downward as readily as upward', () => {
    expect(interpolate(50, 10, 0.5)).toBe(30)
  })
})

describe('prefersReducedMotion', () => {
  it('is false when there is no window, which is how the test environment runs', () => {
    withWindow(undefined, () => {
      expect(prefersReducedMotion()).toBe(false)
    })
  })

  it('is false when the browser has no matchMedia', () => {
    withWindow({}, () => {
      expect(prefersReducedMotion()).toBe(false)
    })
  })

  it('is true when the reduce query matches', () => {
    withWindow({ matchMedia: query => ({ matches: query.includes('reduce') }) }, () => {
      expect(prefersReducedMotion()).toBe(true)
    })
  })

  it('is false when the reduce query does not match', () => {
    withWindow({ matchMedia: () => ({ matches: false }) }, () => {
      expect(prefersReducedMotion()).toBe(false)
    })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"
npm test -- src/hooks/use-count-up.test.ts
```

Expected: FAIL — `Failed to resolve import "@cg/hooks/use-count-up"`.

- [ ] **Step 3: Write the implementation**

Create `src/hooks/use-count-up.ts`:

```ts
import { useEffect, useRef, useState } from 'react'

export const interpolate = (from: number, to: number, progress: number): number => {
  const clamped = Math.min(Math.max(progress, 0), 1)

  return Math.round(from + (to - from) * clamped)
}

/*
 * Checked in JS as well as CSS: theme.css collapses the motion tokens under a reduce
 * preference, but a requestAnimationFrame loop is not a CSS transition and would keep
 * running regardless. Guarded on both window and matchMedia because the test environment
 * has neither.
 */
export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const useCountUp = (value: number, durationMs: number): number => {
  const [display, setDisplay] = useState(value)
  // What the number currently reads on screen. Animating from here rather than from the
  // previous target means an interrupted count resumes from where the eye left it.
  const displayedRef = useRef(value)

  useEffect(() => {
    const from = displayedRef.current

    // Idempotent by construction: with nothing to travel this is a no-op, which is what
    // makes StrictMode's double invoke on mount harmless.
    if (from === value) {
      return
    }

    if (prefersReducedMotion() || typeof requestAnimationFrame !== 'function') {
      displayedRef.current = value
      // A single jump to the target, not derived state: there is no animation to run, so
      // this branch is the whole "animation". The rule guards against cascading renders
      // from state derived in an effect; this sets one value once and returns.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplay(value)

      return
    }

    let start = 0
    let frame = 0

    const step = (now: number): void => {
      if (start === 0) {
        start = now
      }

      const next = interpolate(from, value, (now - start) / durationMs)

      displayedRef.current = next
      setDisplay(next)

      if (next !== value) {
        frame = requestAnimationFrame(step)
      }
    }

    frame = requestAnimationFrame(step)

    return () => cancelAnimationFrame(frame)
  }, [value, durationMs])

  return display
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"
npm test
```

Expected: PASS, `Tests  78 passed (78)`.

- [ ] **Step 5: Run the full gate and commit**

```bash
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"
npm run typecheck && npm run lint && npm test && npm run build
git add src/hooks/use-count-up.ts src/hooks/use-count-up.test.ts
git commit -m "feat: add useCountUp for animated scores"
```

**Report honestly:** the rAF loop itself is not unit-tested — there is no `requestAnimationFrame` in the node environment. Only `interpolate` and `prefersReducedMotion` are covered. Say so in the task report.

---

### Task 4: `useDeparted`

A played card leaves `remainingCards`, and the settled pot leaves `community`, **in the same dispatch that awards them** — so in both cases the element is gone from state before it can animate out. This hook holds departed items on screen for a moment so they can. One hook, two uses (Tasks 7's exit ghost and pot ghost).

**Files:**
- Create: `src/hooks/use-departed.ts`
- Test: `src/hooks/use-departed.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `departedFrom<T>(previous: readonly T[], current: readonly T[], keyOf: (item: T) => string): T[]` — items present in `previous` and absent from `current`, in their original order.
  - `useDeparted<T>(items: readonly T[], keyOf: (item: T) => string, holdMs: number): T[]` — used by Task 7.

- [ ] **Step 1: Write the failing test**

Create `src/hooks/use-departed.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { departedFrom } from '@cg/hooks/use-departed'

interface Item {
  id: string
}

const item = (id: string): Item => ({ id })
const idOf = (value: Item): string => value.id

describe('departedFrom', () => {
  it('returns the item that was present last render and is absent now', () => {
    const previous = [item('a'), item('b'), item('c')]
    const current = [item('a'), item('c')]

    expect(departedFrom(previous, current, idOf).map(idOf)).toEqual(['b'])
  })

  it('returns nothing when the list only grows', () => {
    const previous = [item('a')]
    const current = [item('a'), item('b')]

    expect(departedFrom(previous, current, idOf)).toEqual([])
  })

  it('returns nothing when the list is unchanged', () => {
    const previous = [item('a'), item('b')]

    expect(departedFrom(previous, [item('a'), item('b')], idOf)).toEqual([])
  })

  // The pot case: HANDLE_ROUND_COMPLETED empties the whole community in one dispatch.
  it('returns the whole list when it empties at once', () => {
    const previous = [item('a'), item('b'), item('c'), item('d')]

    expect(departedFrom(previous, [], idOf).map(idOf)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('preserves the original order, which is seat order for the community', () => {
    const previous = [item('a'), item('b'), item('c'), item('d')]

    expect(departedFrom(previous, [item('b')], idOf).map(idOf)).toEqual(['a', 'c', 'd'])
  })

  it('returns nothing when the previous list was empty', () => {
    expect(departedFrom([], [item('a')], idOf)).toEqual([])
  })

  it('compares by key, not by identity', () => {
    const previous = [item('a'), item('b')]
    // Fresh objects with the same ids — every render of the game rebuilds its card objects.
    const current = [item('a'), item('b')]

    expect(departedFrom(previous, current, idOf)).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"
npm test -- src/hooks/use-departed.test.ts
```

Expected: FAIL — `Failed to resolve import "@cg/hooks/use-departed"`.

- [ ] **Step 3: Write the implementation**

Create `src/hooks/use-departed.ts`:

```ts
import { useEffect, useRef, useState } from 'react'

export const departedFrom = <T>(
  previous: readonly T[],
  current: readonly T[],
  keyOf: (item: T) => string
): T[] => {
  const currentKeys = new Set(current.map(keyOf))

  return previous.filter(item => !currentKeys.has(keyOf(item)))
}

/*
 * Returns the items that were present on the previous render and are absent now, holding
 * them for holdMs so they can animate out. A played card and a settled pot both vanish in
 * the same dispatch that awards them, so without this there is nothing left to animate.
 */
export const useDeparted = <T>(
  items: readonly T[],
  keyOf: (item: T) => string,
  holdMs: number
): T[] => {
  const previousRef = useRef<readonly T[]>(items)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [held, setHeld] = useState<T[]>([])

  useEffect(() => {
    const gone = departedFrom(previousRef.current, items, keyOf)

    previousRef.current = items

    // No cleanup on this branch, and none needed: the branch does nothing. StrictMode's
    // second invoke on mount sees previousRef already equal to items and takes it again.
    if (gone.length === 0) {
      return
    }

    setHeld(gone)

    /*
     * The timer lives in a ref rather than being cleared by this effect's cleanup. Nothing
     * gates how soon `items` may change again — the user can play their next card the
     * instant a round settles — and an effect-scoped cleanup would cancel the pending
     * clear, while the re-run took the `gone.length === 0` branch above and scheduled no
     * replacement. The held items would then never be released. Holding the handle here
     * means holdMs always elapses from the departure that set it.
     */
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setHeld([]), holdMs)
    // keyOf is a fresh arrow at every call site; depending on it would rerun this on
    // every render and drop the held items immediately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, holdMs])

  // Unmount only. Kept separate so a change of `items` cannot cancel a pending clear.
  useEffect(() => () => clearTimeout(timerRef.current), [])

  return held
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"
npm test
```

Expected: PASS, `Tests  85 passed (85)`.

- [ ] **Step 5: Run the full gate and commit**

```bash
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"
npm run typecheck && npm run lint && npm test && npm run build
git add src/hooks/use-departed.ts src/hooks/use-departed.test.ts
git commit -m "feat: add useDeparted so leaving cards can animate out"
```

**Report honestly:** the `holdMs` timer expiry is not unit-tested — running it needs a React renderer, and none is available in a DOM-free environment. `departedFrom`, which is where every real decision is made, is covered exhaustively. Say so in the task report.

---

### Task 5: Sound

Three cues synthesized at runtime — no files, no bytes. Muted by default, toggleable on both routes, persisted separately from the game. Every entry point fails silently: sound is never allowed to break the game.

**Files:**
- Modify: `src/lib/storage.ts:30-36` (extract a shared read/write seam)
- Create: `src/lib/sound.ts`
- Test: `src/lib/sound.test.ts`
- Create: `src/hooks/use-sound.ts`
- Create: `src/components/sound-toggle.tsx`, `src/components/sound-toggle.module.css`
- Modify: `src/components/playing-table.tsx` (add a `header` slot), `src/components/playing-table.module.css`
- Modify: `src/hooks/use-play-game.tsx` (fire `play` and `win`)
- Modify: `src/hooks/use-create-game.ts` (fire `deal`)
- Modify: `src/pages/game.tsx`, `src/pages/home.tsx` (mount the toggle)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `readItem(key: string): string | null` and `writeItem(key: string, value: string): void` from `@cg/lib/storage` — both swallow a throwing store.
  - `type Cue = 'deal' | 'play' | 'win'`, `play(cue: Cue): void`, `isEnabled(): boolean`, `setEnabled(on: boolean): void` from `@cg/lib/sound`.
  - `useSound(): { isSoundOn: boolean; toggleSound: () => void }` from `@cg/hooks/use-sound`.
  - `<SoundToggle />` from `@cg/components/sound-toggle`.
  - `<PlayingTable header={...}>` — an optional `ReactNode` rendered in an absolutely-positioned bar across the top of the felt. Task 9 puts `<RoundProgress />` in it.

- [ ] **Step 1: Write the failing test**

Create `src/lib/sound.test.ts`. The fake `AudioContext` is deliberately complete enough to run the real synthesis path — that is what proves the node graph wires up and tears down without throwing.

```ts
import { beforeEach, describe, expect, it } from 'vitest'

import { clearGame, setStore } from '@cg/lib/storage'
import { isEnabled, play, setEnabled } from '@cg/lib/sound'

const mem = (): Storage => {
  const m = new Map<string, string>()

  return {
    get length() { return m.size },
    clear: () => m.clear(),
    getItem: (k: string) => m.get(k) ?? null,
    key: (i: number) => [...m.keys()][i] ?? null,
    removeItem: (k: string) => { m.delete(k) },
    setItem: (k: string, v: string) => { m.set(k, v) }
  }
}

// A fake just complete enough for the real synthesis path to run end to end. Every node
// records its disconnect so the test can assert the graph is torn down.
const makeFakeAudio = () => {
  const constructed: string[] = []
  const disconnected: string[] = []

  const node = (kind: string) => ({
    connect: () => undefined,
    disconnect: () => { disconnected.push(kind) }
  })

  const param = () => ({
    value: 0,
    setValueAtTime: () => undefined,
    linearRampToValueAtTime: () => undefined,
    exponentialRampToValueAtTime: () => undefined
  })

  class FakeAudioContext {
    currentTime = 0
    sampleRate = 44100
    state = 'running'
    destination = node('destination')

    constructor() {
      constructed.push('context')
    }

    resume() { return Promise.resolve() }

    createGain() {
      return { ...node('gain'), gain: param() }
    }

    createBuffer(_channels: number, frames: number) {
      const data = new Float32Array(frames)

      return { getChannelData: () => data }
    }

    // stop() fires onended, as a real node does when it finishes. Without that the
    // teardown assertion below would be testing the fake rather than the code.
    createBufferSource() {
      const source = {
        ...node('source'),
        buffer: null as AudioBuffer | null,
        onended: null as (() => void) | null,
        start: () => undefined,
        stop: (): void => undefined
      }

      source.stop = () => { source.onended?.() }

      return source
    }

    createBiquadFilter() {
      return { ...node('filter'), type: 'lowpass', frequency: param() }
    }

    createOscillator() {
      const oscillator = {
        ...node('oscillator'),
        type: 'sine',
        frequency: param(),
        onended: null as (() => void) | null,
        start: () => undefined,
        stop: (): void => undefined
      }

      oscillator.stop = () => { oscillator.onended?.() }

      return oscillator
    }
  }

  return { FakeAudioContext, constructed, disconnected }
}

interface AudioGlobals {
  window?: { AudioContext?: unknown }
}

const setWindow = (value: { AudioContext?: unknown } | undefined): void => {
  const globals = globalThis as AudioGlobals

  if (value === undefined) {
    delete globals.window
  } else {
    globals.window = value
  }
}

beforeEach(() => {
  setStore(mem())
  setWindow(undefined)
})

describe('the sound preference', () => {
  it('defaults to muted', () => {
    expect(isEnabled()).toBe(false)
  })

  it('round-trips through storage', () => {
    setEnabled(true)
    expect(isEnabled()).toBe(true)

    setEnabled(false)
    expect(isEnabled()).toBe(false)
  })

  it('is not disturbed by clearing the game, because it lives under its own key', () => {
    setEnabled(true)
    clearGame()

    expect(isEnabled()).toBe(true)
  })

  it('does not throw when the store throws on read or write', () => {
    const throwing: Storage = {
      get length() { return 0 },
      clear: () => undefined,
      getItem: () => { throw new Error('SecurityError') },
      key: () => null,
      removeItem: () => undefined,
      setItem: () => { throw new Error('QuotaExceededError') }
    }

    setStore(throwing)

    expect(() => setEnabled(true)).not.toThrow()
    expect(isEnabled()).toBe(false)
  })
})

describe('play', () => {
  it('is a no-op and does not throw when there is no AudioContext at all', () => {
    setEnabled(true)

    expect(() => play('deal')).not.toThrow()
    expect(() => play('play')).not.toThrow()
    expect(() => play('win')).not.toThrow()
  })

  it('does not throw when constructing the context throws', () => {
    setEnabled(true)
    setWindow({
      AudioContext: class { constructor() { throw new Error('blocked before a user gesture') } }
    })

    expect(() => play('play')).not.toThrow()
  })

  it('constructs no context while muted, however many cues are requested', () => {
    const { FakeAudioContext, constructed } = makeFakeAudio()

    setWindow({ AudioContext: FakeAudioContext })

    play('deal')
    play('play')
    play('win')

    expect(constructed).toEqual([])
  })

  it('constructs the context on the first cue after sound is enabled, and only once', () => {
    const { FakeAudioContext, constructed } = makeFakeAudio()

    setWindow({ AudioContext: FakeAudioContext })
    setEnabled(true)

    expect(constructed).toEqual([])

    play('play')
    expect(constructed).toEqual(['context'])

    play('win')
    play('deal')
    expect(constructed).toEqual(['context'])
  })

  it('tears its nodes down again after each cue', () => {
    const { FakeAudioContext, disconnected } = makeFakeAudio()

    setWindow({ AudioContext: FakeAudioContext })
    setEnabled(true)

    play('play')

    expect(disconnected).toEqual(['source', 'filter', 'gain'])
  })
})
```

Note for the implementer: `sound.ts` caches its `AudioContext` in a module-level variable, so the last two tests share one across the file — that is precisely what "and only once" asserts. Do not add a reset seam to the module to make the tests tidier; the caching is the behaviour under test.

- [ ] **Step 2: Run the test to verify it fails**

```bash
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"
npm test -- src/lib/sound.test.ts
```

Expected: FAIL — `Failed to resolve import "@cg/lib/sound"`, plus `readItem`/`writeItem` not yet exported.

- [ ] **Step 3: Extract the shared storage seam**

In `src/lib/storage.ts`, replace the `readRaw` helper (lines 30-36) with two exported functions, and update its one caller.

```ts
// Reading localStorage can throw outright, not just return null — Safari private mode and
// blocked-storage settings raise SecurityError on access, and quota limits raise on write.
// Exported so the sound preference shares one test seam and one throwing-store policy;
// use loadGame, not readItem, for the game key.
export const readItem = (key: string): string | null => {
  try {
    return getStore().getItem(key)
  } catch {
    return null
  }
}

export const writeItem = (key: string, value: string): void => {
  try {
    getStore().setItem(key, value)
  } catch {
    // A preference that cannot be persisted is not worth breaking a click over.
  }
}
```

Then in `loadGame`, replace `const raw = readRaw()` with:

```ts
  const raw = readItem(KEY)
```

`saveGame` keeps its deliberately-uncaught `getStore().setItem(...)` — the caller must know a game was not saved. Do not route it through `writeItem`.

- [ ] **Step 4: Write `src/lib/sound.ts`**

```ts
import { readItem, writeItem } from '@cg/lib/storage'

export type Cue = 'deal' | 'play' | 'win'

// Separate from the game's cg.g key, so clearing a game does not reset the preference.
const KEY = 'cg.sound'

const MASTER_GAIN = 0.25
const LOWPASS_HZ = 2000

// Older WebKit only exposes the prefixed constructor.
interface AudioWindow {
  AudioContext?: typeof AudioContext
  webkitAudioContext?: typeof AudioContext
}

let context: AudioContext | null = null
let master: GainNode | null = null
// The constructor a cached context was built from, re-checked against the current
// window.AudioContext on every call. Deliberately NOT a sticky "unavailable" flag: a
// context blocked on the first cue (audio before a user gesture) must be retried on the
// next one, or sound stays dead for the rest of the page's life. Retrying costs one
// caught exception per cue and nothing else.
let contextCtor: (typeof AudioContext) | undefined

// Read through on every call rather than cached: a cache would need a reset seam for the
// tests, and a localStorage read costs nothing at the rate cues fire.
export const isEnabled = (): boolean => readItem(KEY) === 'on'

export const setEnabled = (on: boolean): void => {
  writeItem(KEY, on ? 'on' : 'off')
}

/*
 * Created lazily on the first cue after the user enables sound, never at module load.
 * Browsers block an AudioContext constructed before a user gesture, so an eager one would
 * both fail and leak a suspended context.
 */
const getContext = (): AudioContext | null => {
  const audioWindow = typeof window === 'undefined'
    ? undefined
    : window as unknown as AudioWindow

  const Ctor = audioWindow?.AudioContext ?? audioWindow?.webkitAudioContext

  if (context !== null && Ctor === contextCtor) {
    return context
  }

  if (!Ctor) {
    return null
  }

  try {
    const created = new Ctor()
    const gain = created.createGain()

    // Cues sit under the UI rather than over it.
    gain.gain.value = MASTER_GAIN
    gain.connect(created.destination)

    context = created
    master = gain
    contextCtor = Ctor

    return context
  } catch {
    context = null
    master = null

    return null
  }
}

const noiseBuffer = (ctx: AudioContext, seconds: number): AudioBuffer => {
  const frames = Math.max(1, Math.floor(ctx.sampleRate * seconds))
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate)
  const data = buffer.getChannelData(0)

  for (let index = 0; index < frames; index++) {
    data[index] = Math.random() * 2 - 1
  }

  return buffer
}

// A card landing on felt is essentially filtered noise with a fast decay, which is why
// this reads as convincing rather than synthetic.
const burst = (ctx: AudioContext, out: GainNode, at: number, seconds: number): void => {
  const source = ctx.createBufferSource()
  const filter = ctx.createBiquadFilter()
  const envelope = ctx.createGain()

  source.buffer = noiseBuffer(ctx, seconds)
  filter.type = 'lowpass'
  filter.frequency.value = LOWPASS_HZ

  envelope.gain.setValueAtTime(0.0001, at)
  envelope.gain.linearRampToValueAtTime(1, at + 0.005)
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + seconds)

  source.connect(filter)
  filter.connect(envelope)
  envelope.connect(out)

  source.onended = () => {
    source.disconnect()
    filter.disconnect()
    envelope.disconnect()
  }

  source.start(at)
  source.stop(at + seconds)
}

const tone = (
  ctx: AudioContext,
  out: GainNode,
  at: number,
  hz: number,
  seconds: number
): void => {
  const oscillator = ctx.createOscillator()
  const envelope = ctx.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.value = hz

  envelope.gain.setValueAtTime(0.0001, at)
  envelope.gain.linearRampToValueAtTime(1, at + 0.01)
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + seconds)

  oscillator.connect(envelope)
  envelope.connect(out)

  oscillator.onended = () => {
    oscillator.disconnect()
    envelope.disconnect()
  }

  oscillator.start(at)
  oscillator.stop(at + seconds)
}

/*
 * Fails silently at every entry point — no AudioContext, a construction that throws, a
 * blocked context, an unexpected node error. Sound is never allowed to break the game.
 */
export const play = (cue: Cue): void => {
  if (!isEnabled()) {
    return
  }

  const ctx = getContext()

  if (ctx === null || master === null) {
    return
  }

  try {
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => undefined)
    }

    const now = ctx.currentTime

    switch (cue) {
      case 'deal':
        // A riffle: four short bursts, 45ms apart.
        for (let index = 0; index < 4; index++) {
          burst(ctx, master, now + index * 0.045, 0.06)
        }
        break
      case 'play':
        burst(ctx, master, now, 0.09)
        break
      case 'win':
        tone(ctx, master, now, 660, 0.13)
        tone(ctx, master, now + 0.13, 880, 0.13)
        break
    }
  } catch {
    // A cue that cannot sound is not a reason to stop the game.
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"
npm test
```

Expected: PASS, `Tests  94 passed (94)`.

If the teardown assertion fails with an empty `disconnected`, the implementation is not wiring `source.onended` — that handler is the only thing that releases the nodes, and without it a long game accumulates one dangling filter and gain per card played.

- [ ] **Step 6: Write `src/hooks/use-sound.ts`**

```ts
import { useState } from 'react'

import { isEnabled, setEnabled } from '@cg/lib/sound'

/*
 * Local state, deliberately — the toggle is rendered once per route and play() reads the
 * preference straight from storage, so there is nothing for a provider to synchronise.
 */
export const useSound = (): { isSoundOn: boolean; toggleSound: () => void } => {
  const [isSoundOn, setIsSoundOn] = useState(isEnabled)

  return {
    isSoundOn,
    toggleSound: () => {
      const next = !isSoundOn

      setEnabled(next)
      setIsSoundOn(next)
    }
  }
}
```

- [ ] **Step 7: Write the toggle component**

Create `src/components/sound-toggle.tsx`:

```tsx
import { useSound } from '@cg/hooks/use-sound'

import styles from '@cg/components/sound-toggle.module.css'

export const SoundToggle = () => {
  const { isSoundOn, toggleSound } = useSound()

  return (
    <button
      type="button"
      className={styles.toggle}
      aria-pressed={isSoundOn}
      aria-label="Sound"
      onClick={toggleSound}>
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        aria-hidden="true"
        focusable="false">
        <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
        {isSoundOn
          ? <path
            d="M16 8.5a4.5 4.5 0 0 1 0 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          : <path
            d="M16.5 9.5l5 5m0-5l-5 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        }
      </svg>
    </button>
  )
}
```

Create `src/components/sound-toggle.module.css`:

```css
.toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  background: var(--surface-2);
  border: 1px solid var(--rail);
  border-radius: 50%;
  color: var(--text-lo);
  cursor: pointer;
  transition: color var(--dur-fast) var(--ease-out),
    background var(--dur-fast) var(--ease-out);
}

.toggle:hover {
  color: var(--text-hi);
  background: rgba(255, 255, 255, 0.12);
}

.toggle[aria-pressed='true'] {
  color: var(--accent);
}

/* Never outline: none without a replacement — this is the only focus indicator. */
.toggle:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

- [ ] **Step 8: Give `PlayingTable` a header slot**

The felt is a centred flex row whose single child is the board. A second flex child would sit *beside* the board and break the verified responsive matrix, so the header is absolutely positioned instead. `.table` is already `position: relative` and Task 1 already reserved 56px of top padding for it.

Replace `src/components/playing-table.tsx` with:

```tsx
import type { ReactNode } from 'react'

import styles from '@cg/components/playing-table.module.css'

export const PlayingTable = ({
  hasManyPlayers = false,
  header,
  children
}: {
  hasManyPlayers?: boolean
  header?: ReactNode
  children?: ReactNode
}) => (
  <div className={styles.table} data-many-players={hasManyPlayers}>
    {header
      ? <div className={styles.header}>{header}</div>
      : null
    }
    {children}
  </div>
)
```

Append to `src/components/playing-table.module.css`:

```css
/*
 * Absolute, not a flex child. .table centres a single row; adding a sibling would put the
 * header beside the board and destroy the responsive matrix the rewrite verified. The
 * 56px top padding on .table is what keeps it clear of the board.
 */
.header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
}
```

- [ ] **Step 9: Mount the toggle on both routes and fire the cues**

The deal cue fires on the home screen, so the control has to be reachable there.

In `src/pages/home.tsx`, add the import and the `header` prop (the rest of the file is restyled in Task 11):

```tsx
import { SoundToggle } from '@cg/components/sound-toggle'
```
```tsx
    <PlayingTable header={<SoundToggle />}>
```

In `src/pages/game.tsx`, the same:

```tsx
import { SoundToggle } from '@cg/components/sound-toggle'
```
```tsx
      <PlayingTable
        hasManyPlayers={game.hasMoreThanTwoPlayers}
        header={<SoundToggle />}>
```

In `src/hooks/use-create-game.ts`, import the module and fire `deal` immediately after the hands are saved, before navigating:

```ts
import { play } from '@cg/lib/sound'
```
```ts
      saveGame({
        playerCount,
        hands: chunk(NUMBER_OF_CARDS_PER_PLAYER, codes)
      })

      play('deal')
```

In `src/hooks/use-play-game.tsx`, import the module and fire the other two. `discardACard` covers both the user's click and the bot timer — both are a card being played. **Neither call goes inside `playGameReducer`; it stays pure.**

```ts
import { play as playCue } from '@cg/lib/sound'
```
```ts
  const discardACard = (cardObj: Card): void => {
    playCue('play')
    dispatch({
      type: 'CARD_DISCARDED',
      payload: { cardObj, numberOfPlayers: playerCount }
    })
  }
```

and in the settling timer inside the effect:

```ts
    const timer = setTimeout(() => {
      playCue('win')
      dispatch({ type: 'HANDLE_ROUND_COMPLETED', payload: playerCount })
    }, TIME_BETWEEN_PLAYS_MS)
```

The import is aliased because `play` would shadow nothing here but reads confusingly next to `discardACard`; keep the alias.

- [ ] **Step 10: Run the full gate**

```bash
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"
npm run typecheck && npm run lint && npm test && npm run build
```

Expected: all clean, `Tests  94 passed (94)`. The existing `pages.test.ts` renders both routes through `renderToString`, which now constructs `SoundToggle` — if `isEnabled()` throws in the node environment the smoke tests will say so. It must not: there is no `window`, `readItem` catches, and the preference reads as muted.

- [ ] **Step 11: Commit**

```bash
git add src/lib/storage.ts src/lib/sound.ts src/lib/sound.test.ts src/hooks/use-sound.ts \
  src/components/sound-toggle.tsx src/components/sound-toggle.module.css \
  src/components/playing-table.tsx src/components/playing-table.module.css \
  src/hooks/use-create-game.ts src/hooks/use-play-game.tsx \
  src/pages/home.tsx src/pages/game.tsx
git commit -m "feat: synthesize three sound cues behind a muted-by-default toggle"
```

---

### Task 6: Cards the keyboard can reach

Today a card is a bare `<img>` with an `onClick`: the game cannot be played without a mouse, a screen reader sees nothing meaningful, and during the delay after a play the user's cards still look clickable but silently aren't. This task fixes all three.

**Files:**
- Modify: `src/lib/cards.ts` (add `cardName`)
- Test: `src/lib/cards.test.ts` (extend)
- Modify: `src/components/card.tsx` (full rewrite), `src/components/card.module.css`
- Modify: `src/components/players-cards.tsx` (full rewrite), `src/components/players-cards.module.css`
- Modify: `src/components/player.tsx:27-39`
- Test: `src/pages/pages.test.ts` (extend)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `cardName(card: Card): string` from `@cg/lib/cards` — e.g. `'Seven of Spades'`. Task 9 uses it for announcements.
  - `<Card card isFlipped? isGhost? className? style? />` from `@cg/components/card` — a decorative, `aria-hidden` `<img>`. Task 7 uses `isGhost`, `className` and `style`.
  - `<PlayableCard card isPlayable tabIndex buttonRef onCardClick />` from the same module.
  - `<PlayersCards cards areCardsFlipped? hasBorder? isStacked? onCardClick? />` — unchanged prop surface.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/cards.test.ts`:

```ts
describe('cardName', () => {
  it('names a numeric card', () => {
    expect(cardName(cardFromCode('7S'))).toBe('Seven of Spades')
  })

  it('names the ten, whose code digit is 0', () => {
    expect(cardName(cardFromCode('0H'))).toBe('Ten of Hearts')
  })

  it('names the court cards and the ace', () => {
    expect(cardName(cardFromCode('AD'))).toBe('Ace of Diamonds')
    expect(cardName(cardFromCode('JC'))).toBe('Jack of Clubs')
    expect(cardName(cardFromCode('QS'))).toBe('Queen of Spades')
    expect(cardName(cardFromCode('KH'))).toBe('King of Hearts')
  })

  // Both halves are pinned to a closed alternation. A suit-only pattern would not catch a
  // missing VALUE_NAMES entry: the `?? card.id[0]` fallback renders "3 of Diamonds", which
  // contains no "undefined" and ends in a real suit, so the test would pass over the bug.
  it('names every code in the deck, with no fallback leaking through', () => {
    const NAME =
      /^(Ace|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Jack|Queen|King) of (Spades|Diamonds|Clubs|Hearts)$/

    const names = ALL_CODES.map(code => cardName(cardFromCode(code)))

    names.forEach(name => {
      expect(name).toMatch(NAME)
    })

    // 52 distinct names — catches a value or suit mapped twice.
    expect(new Set(names).size).toBe(ALL_CODES.length)
  })
})
```

Add `cardName` to that file's existing import from `@cg/lib/cards`, and `cardFromCode` and `ALL_CODES` if they are not already imported.

Append to `src/pages/pages.test.ts`, inside `describe('Game renders a dealt game', ...)`:

```ts
  it('renders the user\'s own cards as labelled buttons and the opponents\' as images', () => {
    const hands = [['7S', ...ALL_CODES.slice(1, 10)], ALL_CODES.slice(10, 20)]
    saveGame({ playerCount: 2, hands })

    const html = render(h(Game), '/game')

    // The user's hand is operable; every other card on the table is decorative.
    expect(html).toContain('aria-label="Seven of Spades"')
    expect(html).toContain('<button')
    // The old alt="Card 7S" is gone: opponent and community cards are aria-hidden now.
    expect(html).not.toContain('alt="Card ')
  })
```

Note `ALL_CODES.slice(1, 10)` may or may not contain `7S`; the deck order is value-major, so `ALL_CODES[0]` is `AS` and `7S` appears later. Using an explicit `'7S'` at index 0 is what makes the assertion deterministic.

- [ ] **Step 2: Run the tests to verify they fail**

```bash
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"
npm test
```

Expected: FAIL — `cardName is not exported` from the cards suite, and the pages assertion failing on `aria-label="Seven of Spades"`.

- [ ] **Step 3: Add `cardName`**

Append to `src/lib/cards.ts`:

```ts
const VALUE_NAMES: Record<string, string> = {
  A: 'Ace',
  '2': 'Two',
  '3': 'Three',
  '4': 'Four',
  '5': 'Five',
  '6': 'Six',
  '7': 'Seven',
  '8': 'Eight',
  '9': 'Nine',
  // '0' is the API's code for ten.
  '0': 'Ten',
  J: 'Jack',
  Q: 'Queen',
  K: 'King'
}

const SUIT_NAMES: Record<Suit, string> = {
  S: 'Spades',
  D: 'Diamonds',
  C: 'Clubs',
  H: 'Hearts'
}

// Spoken by the aria-label on every card in the user's hand, and by the live region.
// Falls back to the raw code character rather than rendering "undefined" if a card is
// ever built from something outside the deck.
export const cardName = (card: Card): string =>
  `${VALUE_NAMES[card.id[0]] ?? card.id[0]} of ${SUIT_NAMES[card.suit] ?? card.suit}`
```

- [ ] **Step 4: Rewrite `src/components/card.tsx`**

```tsx
import type { CSSProperties, Ref } from 'react'

import { cardName } from '@cg/lib/cards'
import { cx } from '@cg/lib/utils'
import type { Card as CardType } from '@cg/types'

import styles from '@cg/components/card.module.css'

const sourceFor = (card: CardType, isFlipped: boolean): string => isFlipped
  ? `${import.meta.env.BASE_URL}card-back.jpeg`
  : card.img

/*
 * Decorative by design. Opponent hands are face-down and identical and the community pile
 * is summarised by the live region, so announcing each image would be noise. alt="" plus
 * aria-hidden keeps them out of the accessibility tree entirely.
 */
export const Card = ({
  card,
  isFlipped = false,
  isGhost = false,
  className,
  style
}: {
  card: CardType
  isFlipped?: boolean
  isGhost?: boolean
  className?: string
  style?: CSSProperties
}) => (
  <img
    className={cx(styles.card, isGhost && styles.ghost, className)}
    src={sourceFor(card, isFlipped)}
    alt=""
    aria-hidden="true"
    style={style}
  />
)

/*
 * The user's own hand. aria-disabled rather than the native disabled attribute: a disabled
 * button is removed from the tab order, so the browser would yank focus out of the hand
 * every time a card was played and the delay began. aria-disabled keeps the button
 * focusable and stably placed while still announcing that it cannot be activated; the
 * click is guarded here and pointer-events are dropped in CSS.
 */
export const PlayableCard = ({
  card,
  isPlayable,
  tabIndex,
  buttonRef,
  onCardClick
}: {
  card: CardType
  isPlayable: boolean
  tabIndex: number
  buttonRef?: Ref<HTMLButtonElement>
  onCardClick: (card: CardType) => void
}) => (
  <button
    ref={buttonRef}
    type="button"
    className={cx(styles.cardButton, !isPlayable && styles.notPlayable)}
    aria-label={cardName(card)}
    aria-disabled={!isPlayable}
    tabIndex={tabIndex}
    onClick={isPlayable
      ? () => onCardClick(card)
      : undefined
    }>
    <img className={styles.card} src={card.img} alt="" aria-hidden="true" />
  </button>
)
```

- [ ] **Step 5: Rewrite `src/components/card.module.css`**

```css
.card {
  display: block;
  width: var(--card-w);
  height: var(--card-h);
  border-radius: 6px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);
}

/*
 * The button is a bare wrapper: it must not add width, height, padding or border, because
 * the hand's overlap arithmetic in players-cards.module.css measures --card-w per child.
 */
.cardButton {
  display: block;
  width: var(--card-w);
  height: var(--card-h);
  padding: 0;
  border: 0;
  background: none;
  border-radius: 6px;
  cursor: pointer;
  transition: transform var(--dur-fast) var(--ease-out),
    filter var(--dur-fast) var(--ease-out),
    opacity var(--dur-fast) var(--ease-out);
}

.cardButton:hover,
.cardButton:focus-visible {
  transform: translateY(-10px);
}

.cardButton:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  /* The hand overlaps its cards; a focused card must not be underneath its neighbour. */
  position: relative;
  z-index: 1;
}

/*
 * The explicit answer to "cards that look clickable silently aren't". During the delay
 * after a play the hand dims and stops taking pointer events; it keeps its tab stop so
 * keyboard focus is never yanked mid-play.
 */
.notPlayable {
  opacity: 0.55;
  cursor: default;
  pointer-events: none;
}

.notPlayable:hover {
  transform: none;
}

.ghost {
  pointer-events: none;
}
```

- [ ] **Step 6: Rewrite `src/components/players-cards.tsx` with a roving tabindex**

One tab stop for the whole hand; arrows move within it; Enter and Space play, natively, because each card is a real button.

```tsx
import { useEffect, useRef, useState } from 'react'
import type { FocusEvent, KeyboardEvent } from 'react'

import { Card, PlayableCard } from '@cg/components/card'
import { cx } from '@cg/lib/utils'
import type { Card as CardType } from '@cg/types'

import styles from '@cg/components/players-cards.module.css'

export const PlayersCards = ({
  cards,
  areCardsFlipped = false,
  hasBorder = false,
  isStacked = false,
  isPlayable = false,
  onCardClick
}: {
  cards: CardType[]
  areCardsFlipped?: boolean
  hasBorder?: boolean
  isStacked?: boolean
  isPlayable?: boolean
  onCardClick?: (card: CardType) => void
}) => {
  const [focusedIndex, setFocusedIndex] = useState(0)
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([])
  // Whether the keyboard is currently inside this hand. Without it the effect below would
  // pull focus to the hand for a mouse player who never touched the keyboard at all.
  const hasFocusRef = useRef(false)

  // The hand shrinks all game. Clamping at render rather than storing a clamped value
  // keeps the roving index valid without an effect that fights the user's arrow keys.
  const rovingIndex = Math.min(focusedIndex, Math.max(cards.length - 1, 0))

  /*
   * Put focus back after the played card's button unmounts. `aria-disabled` keeps the hand
   * focusable through the delay, but the reducer removes the played card from
   * remainingCards in the same dispatch that plays it — so that button leaves the DOM and
   * the browser drops focus to <body>. Without this, a keyboard player would have to tab
   * back into the hand after every single play.
   *
   * Gated on state, never a mount latch: it acts only when the hand had focus AND focus is
   * now orphaned, so StrictMode's double invoke on mount is a no-op.
   */
  useEffect(() => {
    if (!hasFocusRef.current || typeof document === 'undefined') {
      return
    }

    if (document.activeElement === null || document.activeElement === document.body) {
      buttonsRef.current[rovingIndex]?.focus()
    }
  }, [cards.length, rovingIndex])

  const handleBlur = (event: FocusEvent<HTMLDivElement>): void => {
    // A null relatedTarget means focus was dropped rather than moved — which is precisely
    // the case the effect above recovers from, so the flag has to survive it.
    if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) {
      hasFocusRef.current = false
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return
    }

    event.preventDefault()

    const delta = event.key === 'ArrowRight' ? 1 : -1
    const next = Math.min(Math.max(rovingIndex + delta, 0), cards.length - 1)

    setFocusedIndex(next)
    buttonsRef.current[next]?.focus()
  }

  if (!onCardClick) {
    return (
      <div className={cx(styles.hand, isStacked && styles.stacked, hasBorder && styles.bordered)}>
        {cards.map(card => (
          <Card
            key={card.id}
            card={card}
            isFlipped={areCardsFlipped}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={styles.hand}
      role="group"
      aria-label="Your hand"
      onFocus={() => { hasFocusRef.current = true }}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}>
      {cards.map((card, index) => (
        <PlayableCard
          key={card.id}
          card={card}
          isPlayable={isPlayable}
          tabIndex={index === rovingIndex ? 0 : -1}
          buttonRef={element => { buttonsRef.current[index] = element }}
          onCardClick={onCardClick}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 7: Pass the playable rule down from `player.tsx`**

The rule is exactly the existing one — `player.id === USERS_POSITION && game.canUserPlay` — but it now decides *appearance* as well as whether the click does anything, so the handler is always passed for the user's own hand and `isPlayable` carries the state.

In `src/components/player.tsx`, replace the `PlayersCards` call for `remainingCards` (lines 28-32) with:

```tsx
        <PlayersCards
          cards={player.remainingCards}
          areCardsFlipped={player.id !== USERS_POSITION}
          isPlayable={canDiscard}
          onCardClick={player.id === USERS_POSITION ? game.discardACard : undefined}
        />
```

`canDiscard` above it stays exactly as it is.

- [ ] **Step 8: Confirm the hand's geometry is unchanged**

Read `src/components/players-cards.module.css` and confirm all four rules are untouched: `.hand` is still `width: calc(var(--card-w) + 9 * var(--card-stick))`, `.hand > * + *` still `margin-left: calc(var(--card-stick) - var(--card-w))`, `.stacked` still `width: var(--card-w)`, `.bordered` still 2px. The overlap rule now applies to `<button>` children instead of `<img>`, which is why `.cardButton` was given exactly `--card-w` by `--card-h` and no padding or border in Step 5. **If any of those four values differs, stop and report.**

- [ ] **Step 9: Run the tests to verify they pass**

```bash
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"
npm test
```

Expected: PASS. Test count rises by 4 (the `cardName` block) plus 1 (the pages assertion) to `Tests  99 passed (99)`.

The existing smoke assertion `expect(html).toContain('card-back.jpeg')` still holds — opponents are still `<img>`. The old `alt={\`Card ${card.id}\`}` is gone, which is what the `not.toContain('alt="Card ')` assertion pins.

- [ ] **Step 10: Verify every `styles.*` lookup exists**

```bash
grep -o 'styles\.[a-zA-Z]*' src/components/card.tsx src/components/players-cards.tsx | sort -u
```

Cross-read each against `card.module.css` and `players-cards.module.css`. A name with no matching class renders `class="undefined"` and CSS modules will not warn you.

- [ ] **Step 11: Run the full gate and commit**

```bash
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"
npm run typecheck && npm run lint && npm test && npm run build
git add src/lib/cards.ts src/lib/cards.test.ts src/components/card.tsx \
  src/components/card.module.css src/components/players-cards.tsx \
  src/components/player.tsx src/pages/pages.test.ts
git commit -m "feat: make the user's hand a labelled, keyboard-operable button group"
```

---

### Task 7: Motion — arrival, exit, and the pot ceremony

Three CSS animations, timed to hand off. FLIP was considered and rejected in spec §4 — do not reintroduce it.

**Files:**
- Modify: `src/components/community-cards.tsx` (full rewrite), `src/components/community-cards.module.css`
- Modify: `src/components/players-cards.tsx` (add the exit ghost), `src/components/players-cards.module.css`
- Create: `src/lib/seats.ts`
- Test: `src/lib/seats.test.ts`

**Interfaces:**
- Consumes: `useDeparted` (Task 4), `lastRoundWinnerId` (Task 2), `Card` with `isGhost`/`className`/`style` (Task 6).
- Produces: `SEAT_OFFSETS: Record<number, { x: string; y: string }>` and `winningIndexOf(cards: readonly Card[]): number` from `@cg/lib/seats`. Task 9 uses `winningIndexOf`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/seats.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { SEAT_OFFSETS, winningIndexOf } from '@cg/lib/seats'
import type { Card } from '@cg/types'

const card = (id: string, rank: number): Card => ({ id, rank, suit: 'S', img: '' })

describe('SEAT_OFFSETS', () => {
  it('has an offset for every seat the game can seat', () => {
    expect(Object.keys(SEAT_OFFSETS)).toEqual(['0', '1', '2', '3'])
  })

  it('puts the two left-hand seats on one side and the two right-hand seats on the other', () => {
    expect(SEAT_OFFSETS[0].x.startsWith('-')).toBe(true)
    expect(SEAT_OFFSETS[1].x.startsWith('-')).toBe(true)
    expect(SEAT_OFFSETS[2].x.startsWith('-')).toBe(false)
    expect(SEAT_OFFSETS[3].x.startsWith('-')).toBe(false)
  })
})

describe('winningIndexOf', () => {
  it('finds the highest rank', () => {
    expect(winningIndexOf([card('a', 3), card('b', 9), card('c', 2), card('d', 5)])).toBe(1)
  })

  // Must match the reducer exactly: its >= comparison hands a rank tie to the later
  // player, so the glow has to land on the same card the pot was awarded for.
  it('breaks a tie in favour of the later card, as the reducer does', () => {
    expect(winningIndexOf([card('a', 9), card('b', 9), card('c', 2)])).toBe(1)
    expect(winningIndexOf([card('a', 9), card('b', 9), card('c', 9)])).toBe(2)
  })

  it('handles a single card', () => {
    expect(winningIndexOf([card('a', 4)])).toBe(0)
  })

  it('returns -1 for an empty pile rather than pointing at a card that is not there', () => {
    expect(winningIndexOf([])).toBe(-1)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"
npm test -- src/lib/seats.test.ts
```

Expected: FAIL — `Failed to resolve import "@cg/lib/seats"`.

- [ ] **Step 3: Write `src/lib/seats.ts`**

```ts
import type { Card } from '@cg/types'

/*
 * Where each seat sits relative to the community pile, as a translation a card animates
 * from on arrival and travels to when the pot is awarded. Seats 0 and 1 share the left
 * column and 2 and 3 the right, which is how game.module.css lays the board out above
 * 1200px. Below that the board stacks vertically and these offsets become approximate —
 * deliberately so. The cue is direction, not a survey, and the alternative is measuring
 * layout, which is exactly the FLIP machinery spec section 4 rejected.
 */
export const SEAT_OFFSETS: Record<number, { x: string; y: string }> = {
  0: { x: '-70px', y: '80px' },
  1: { x: '-70px', y: '-80px' },
  2: { x: '70px', y: '80px' },
  3: { x: '70px', y: '-80px' }
}

/*
 * The index of the card that takes the pot. Mirrors playGameReducer's >= comparison, so a
 * rank tie resolves to the later player — the glow must land on the card the pot was
 * actually awarded for.
 */
export const winningIndexOf = (cards: readonly Card[]): number => {
  let winner = -1

  cards.forEach((card, index) => {
    if (winner === -1 || card.rank >= cards[winner].rank) {
      winner = index
    }
  })

  return winner
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"
npm test -- src/lib/seats.test.ts
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Rewrite `src/components/community-cards.tsx`**

```tsx
import type { CSSProperties } from 'react'

import { Card } from '@cg/components/card'
import { useDeparted } from '@cg/hooks/use-departed'
import { usePlayGameContext } from '@cg/hooks/use-play-game'
import { SEAT_OFFSETS, winningIndexOf } from '@cg/lib/seats'
import { cx, range } from '@cg/lib/utils'
import type { Card as CardType } from '@cg/types'

import styles from '@cg/components/community-cards.module.css'

/*
 * Long enough for the winning card's glow (160ms) plus the pot's travel (--dur-pot, 420ms)
 * to finish — 580ms of ceremony, with 40ms to spare.
 *
 * There is deliberately no upper bound claimed here. Nothing gates when the next round
 * starts: HANDLE_ROUND_COMPLETED leaves activePlayerId at USERS_POSITION and sets
 * canUserPlay true, so the player may click again immediately. TIME_BETWEEN_PLAYS_MS paces
 * bot turns and the settle delay, not this transition. useDeparted therefore has to release
 * the ghosts on its own timer regardless of what `community` does in the meantime.
 */
const POT_HOLD_MS = 620

const keyOf = (card: CardType): string => card.id

export const CommunityCards = () => {
  const game = usePlayGameContext()
  const settled = useDeparted(game.community, keyOf, POT_HOLD_MS)
  const emptySlots = range(0, game.numberOfPlayers - game.community.length)

  // useDeparted preserves order, and within a round players discard in activePlayerId
  // order starting at 0 — so index i is seat i in both lists.
  const winningIndex = winningIndexOf(settled)
  const winnerSeat = game.lastRoundWinnerId ?? 0
  const potTarget = SEAT_OFFSETS[winnerSeat] ?? SEAT_OFFSETS[0]

  return (
    <div className={styles.community}>
      {game.community.map((card, index) => (
        <div key={card.id} className={styles.slot}>
          <Card
            card={card}
            className={styles.arriving}
            style={{
              '--from-x': (SEAT_OFFSETS[index] ?? SEAT_OFFSETS[0]).x,
              '--from-y': (SEAT_OFFSETS[index] ?? SEAT_OFFSETS[0]).y
            } as CSSProperties}
          />
        </div>
      ))}
      {emptySlots.map(slot => (
        <div key={slot} className={styles.slot} />
      ))}
      {settled.map((card, index) => (
        <Card
          key={`ghost-${card.id}`}
          isGhost
          card={card}
          className={cx(styles.potGhost, index === winningIndex && styles.winningGhost)}
          style={{
            '--slot-index': index,
            '--to-x': potTarget.x,
            '--to-y': potTarget.y
          } as CSSProperties}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 6: Rewrite `src/components/community-cards.module.css`**

The `.community` and `.slot` rules keep every dimension they had — read the preserved comment and do not touch the numbers.

```css
.community {
  position: relative;
  display: flex;
  width: fit-content;
  height: var(--card-h);
}

/*
 * content-box is deliberate: the 3px border sits outside the declared width, so each slot
 * occupies exactly card-w + 6px and the row totals `players * (card-w + 6)` — the fixed
 * width the original set on its container. Filled and empty slots are deliberately the
 * SAME size: the original's `+6` on empty slots was absorbed by flex-shrink against that
 * fixed width, so every slot rendered identically. Giving empty slots a wider rule here
 * would make the community frame grow and shrink as the round fills.
 */
.slot {
  box-sizing: content-box;
  width: var(--card-w);
  height: var(--card-h);
  border: 3px solid var(--rail);
  border-radius: 8px;
}

/*
 * Arrival. The card slides in from the direction of the seat that played it, set per slot
 * as --from-x / --from-y by the component. `both` holds the from-state before the first
 * frame so there is no flash of the settled position. React keys these by card id, so the
 * animation runs once when the card mounts and never replays.
 */
.arriving {
  animation: arrive var(--dur-card) var(--ease-out) both;
}

@keyframes arrive {
  from {
    transform: translate(var(--from-x, 0), var(--from-y, 0)) rotate(-7deg);
    opacity: 0;
  }

  to {
    transform: translate(0, 0) rotate(0deg);
    opacity: 1;
  }
}

/*
 * The pot ceremony. The settled pile is already gone from state — useDeparted holds it —
 * so these are absolutely positioned back over the slots they occupied. --slot-index is
 * the seat, and card-w + 6px is one slot's full width including its border.
 */
.potGhost {
  position: absolute;
  top: 0;
  left: calc(var(--slot-index) * (var(--card-w) + 6px) + 3px);
  animation: travel var(--dur-pot) var(--ease-out) 160ms both;
}

/* The winning card is picked out for a beat before the pile leaves. */
.winningGhost {
  animation:
    glow 160ms var(--ease-out) both,
    travel var(--dur-pot) var(--ease-out) 160ms both;
}

@keyframes glow {
  from {
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);
  }

  to {
    box-shadow: 0 0 0 3px var(--accent), 0 0 24px var(--accent);
  }
}

@keyframes travel {
  from {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }

  to {
    transform: translate(var(--to-x, 0), var(--to-y, 0)) scale(0.75);
    opacity: 0;
  }
}
```

- [ ] **Step 7: Add the exit ghost to the hand**

The played card is removed from `remainingCards` by the same dispatch that adds it to the community, so it needs `useDeparted` too. It is rendered just past the last remaining card, which reads as a card lifting off the hand; its exact origin is not recoverable without the layout measurement FLIP would have needed, and for three of four players the cards are identical anyway.

In `src/components/players-cards.tsx`, widen the existing type import rather than adding a second one from `'react'`, and add the hook:

```tsx
import type { CSSProperties, KeyboardEvent } from 'react'

import { useDeparted } from '@cg/hooks/use-departed'
```

and inside the component, above `rovingIndex`:

```tsx
  // Hands off to the community's arrival animation: the exit runs 150ms and the arrival
  // starts as the card leaves, so the eye reads one continuous motion.
  const leaving = useDeparted(cards, card => card.id, 200)
```

Then render the ghosts in **both** returns, immediately after the `cards.map(...)` block. In the non-interactive return:

```tsx
        {leaving.map(card => (
          <Card
            key={`leaving-${card.id}`}
            isGhost
            card={card}
            isFlipped={areCardsFlipped}
            className={styles.leaving}
            style={{ '--leaving-index': cards.length } as CSSProperties}
          />
        ))}
```

and identically in the interactive return (the user's own hand is face up, so drop `isFlipped`):

```tsx
        {leaving.map(card => (
          <Card
            key={`leaving-${card.id}`}
            isGhost
            card={card}
            className={styles.leaving}
            style={{ '--leaving-index': cards.length } as CSSProperties}
          />
        ))}
```

`isStacked` hands (the won pile) only ever grow, so `leaving` is always empty for them and the extra render costs nothing.

- [ ] **Step 8: Add the exit animation**

Append to `src/components/players-cards.module.css` — **do not touch the four existing rules**:

```css
/*
 * The played card, held on screen by useDeparted so it has something to animate. Absolute
 * so it does not re-widen a hand whose fixed width is load-bearing; --leaving-index places
 * it just past the last remaining card, matching the overlap step used by .hand > * + *.
 */
.leaving {
  position: absolute;
  top: 0;
  left: calc(var(--leaving-index) * var(--card-stick));
  animation: lift 150ms var(--ease-out) both;
}

@keyframes lift {
  from {
    transform: translateY(0) scale(1);
    opacity: 1;
  }

  to {
    transform: translateY(-30px) scale(0.94);
    opacity: 0;
  }
}
```

- [ ] **Step 9: Verify every `styles.*` lookup exists**

```bash
grep -o 'styles\.[a-zA-Z]*' src/components/community-cards.tsx src/components/players-cards.tsx | sort -u
```

Expected names, all of which must be present in the two stylesheets: `styles.arriving`, `styles.community`, `styles.potGhost`, `styles.slot`, `styles.winningGhost`, `styles.bordered`, `styles.hand`, `styles.leaving`, `styles.stacked`.

- [ ] **Step 10: Run the full gate and commit**

```bash
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"
npm run typecheck && npm run lint && npm test && npm run build
git add src/lib/seats.ts src/lib/seats.test.ts src/components/community-cards.tsx \
  src/components/community-cards.module.css src/components/players-cards.tsx \
  src/components/players-cards.module.css
git commit -m "feat: animate cards arriving, leaving, and the pot going to its winner"
```

**Report honestly:** none of this motion is unit-tested — it is CSS, and asserting keyframes would test the stylesheet rather than behaviour. `SEAT_OFFSETS` and `winningIndexOf` are covered; the animations themselves are for the manual pass. Say so in the task report.

---

### Task 8: Turn state, the count-up, and the won-pile pulse

The table currently gives no indication of whose turn it is. All of this derives from `activePlayerId`, `canUserPlay` and `lastRoundWinnerId` — no new state.

**Files:**
- Modify: `src/components/name-and-points.tsx` (full rewrite), `src/components/name-and-points.module.css`
- Modify: `src/components/player.tsx`, `src/components/player.module.css`

**Interfaces:**
- Consumes: `useCountUp` (Task 3), `lastRoundWinnerId` (Task 2).
- Produces: `<NameAndPoints player isPlayerLeading isActive isYourTurn />`.

- [ ] **Step 1: Rewrite `src/components/name-and-points.tsx`**

`Name: ${player.name}` and `Score: ${score}` are asserted verbatim by the smoke tests. Do not reword them.

```tsx
import { useCountUp } from '@cg/hooks/use-count-up'
import { cx } from '@cg/lib/utils'
import type { Player } from '@cg/types'

import styles from '@cg/components/name-and-points.module.css'

// Matches --dur-pot, so the score finishes counting as the pot finishes arriving. Read as
// a number here rather than from the token because useCountUp drives rAF, not CSS;
// prefersReducedMotion inside the hook is what honours the reduce preference.
const COUNT_MS = 420

export const NameAndPoints = ({
  player,
  isPlayerLeading,
  isActive,
  isYourTurn
}: {
  player: Player
  isPlayerLeading: boolean
  isActive: boolean
  isYourTurn: boolean
}) => {
  const score = useCountUp(player.score, COUNT_MS)

  return (
    <div
      className={cx(
        styles.nameTag,
        isPlayerLeading && styles.leading,
        isActive && styles.active
      )}>
      <span className={styles.name}>{`Name: ${player.name}`}</span>
      {isYourTurn
        ? <span className={styles.turnCue}>Your turn</span>
        : null
      }
      <span className={styles.score}>{`Score: ${score}`}</span>
    </div>
  )
}
```

- [ ] **Step 2: Rewrite `src/components/name-and-points.module.css`**

```css
.nameTag {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  align-self: stretch;
  background: var(--surface-2);
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: 8px;
  font-size: var(--fs-sm);
  color: var(--text-lo);
  /* Inactive seats sit back; the active one comes forward. */
  opacity: 0.6;
  transition: opacity var(--dur-base) var(--ease-out),
    background var(--dur-base) var(--ease-out),
    border-color var(--dur-base) var(--ease-out),
    box-shadow var(--dur-base) var(--ease-out);
}

.leading {
  background: var(--accent-soft);
  color: var(--text-hi);
}

/* Whose turn it is, at a glance. */
.active {
  opacity: 1;
  color: var(--text-hi);
  background: rgba(255, 255, 255, 0.12);
  border-color: var(--rail);
  box-shadow: 0 0 0 2px var(--accent-soft), 0 6px 20px rgba(0, 0, 0, 0.35);
}

.name {
  font-weight: 600;
  white-space: nowrap;
}

/* tabular-nums so the digits do not jitter while the score counts. */
.score {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.turnCue {
  padding: 2px 8px;
  background: var(--accent);
  color: var(--surface-0);
  border-radius: 999px;
  font-size: var(--fs-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}
```

- [ ] **Step 3: Wire the turn state and the pulse in `src/components/player.tsx`**

Replace the whole file:

```tsx
import { Blank } from '@cg/components/common/blank'
import { NameAndPoints } from '@cg/components/name-and-points'
import { PlayersCards } from '@cg/components/players-cards'
import { USERS_POSITION } from '@cg/constants'
import { usePlayGameContext } from '@cg/hooks/use-play-game'
import { cx } from '@cg/lib/utils'
import type { Player as PlayerType } from '@cg/types'

import styles from '@cg/components/player.module.css'

export const Player = ({ player }: { player?: PlayerType }) => {
  const game = usePlayGameContext()

  if (!player) {
    return <div className={styles.player} />
  }

  const canDiscard = player.id === USERS_POSITION && game.canUserPlay
  const isActive = player.id === game.activePlayerId
  // The pot has settled onto this player when the community is empty again.
  const hasJustWon = game.lastRoundWinnerId === player.id && game.community.length === 0

  return (
    <div className={styles.player}>
      <Blank height={20} />
      <NameAndPoints
        player={player}
        isPlayerLeading={game.getIsPlayerLeading(player)}
        isActive={isActive}
        isYourTurn={canDiscard}
      />
      <Blank height={20} />
      <div className={styles.hands}>
        <PlayersCards
          cards={player.remainingCards}
          areCardsFlipped={player.id !== USERS_POSITION}
          isPlayable={canDiscard}
          onCardClick={player.id === USERS_POSITION ? game.discardACard : undefined}
        />
        {/*
          * Keyed on the round so the pile remounts each round. A CSS animation only runs
          * when its element mounts or the class is added; without the key, a player who
          * won two rounds running would keep the class and pulse only the first time.
          */}
        <div
          key={game.roundNumber}
          className={cx(styles.wonCards, hasJustWon && styles.justWon)}>
          <PlayersCards
            isStacked
            hasBorder
            cards={player.wonCards}
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Add the pulse to `src/components/player.module.css`**

Append — leave the existing three rules and the `max-width: 399px` query alone:

```css
.justWon {
  animation: pulse var(--dur-pot) var(--ease-out) both;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    filter: drop-shadow(0 0 0 rgba(201, 162, 39, 0));
  }

  45% {
    transform: scale(1.08);
    filter: drop-shadow(0 0 14px rgba(201, 162, 39, 0.65));
  }

  100% {
    transform: scale(1);
    filter: drop-shadow(0 0 0 rgba(201, 162, 39, 0));
  }
}
```

- [ ] **Step 5: Verify every `styles.*` lookup exists**

```bash
grep -o 'styles\.[a-zA-Z]*' src/components/player.tsx src/components/name-and-points.tsx | sort -u
```

Expected: `styles.active`, `styles.hands`, `styles.justWon`, `styles.leading`, `styles.name`, `styles.nameTag`, `styles.player`, `styles.score`, `styles.turnCue`, `styles.wonCards`. Every one must appear in the two stylesheets.

- [ ] **Step 6: Run the full gate**

```bash
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"
npm run typecheck && npm run lint && npm test && npm run build
```

Expected: all clean, test count unchanged at `105` (Task 7 added six). The smoke tests still find `Name: User` and `Score: 0` — `useCountUp` initialises its state to the value it is given, so the very first render is the true score and server rendering never sees a transitional number.

- [ ] **Step 7: Commit**

```bash
git add src/components/name-and-points.tsx src/components/name-and-points.module.css \
  src/components/player.tsx src/components/player.module.css
git commit -m "feat: show whose turn it is and count scores up to their new total"
```

---

### Task 9: Round progress and the live region

There is currently no way to know how far through a game you are, and a screen reader is told nothing at all about what happened.

**Files:**
- Create: `src/lib/announce.ts`
- Test: `src/lib/announce.test.ts`
- Create: `src/components/live-region.tsx`, `src/components/live-region.module.css`
- Create: `src/components/round-progress.tsx`, `src/components/round-progress.module.css`
- Modify: `src/pages/game.tsx`

**Interfaces:**
- Consumes: `cardName` (Task 6), `winningIndexOf` (Task 7), `lastRoundWinnerId` (Task 2), `PlayingTable`'s `header` prop (Task 5).
- Produces: `announcementFor(state): string`, `<LiveRegion />`, `<RoundProgress />`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/announce.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { announcementFor } from '@cg/lib/announce'
import type { Card, Player } from '@cg/types'

const card = (id: string, rank: number): Card => ({ id, rank, suit: 'S', img: '' })

const player = (id: number, score = 0, wonCards: Card[] = []): Player => ({
  id,
  name: id === 0 ? 'User' : `Player ${id}`,
  score,
  remainingCards: [],
  wonCards
})

const base = {
  roundNumber: 3,
  community: [] as Card[],
  players: [player(0), player(1), player(2), player(3)],
  gameLeads: [] as Player[],
  lastRoundWinnerId: null as number | null,
  numberOfPlayers: 4
}

describe('announcementFor', () => {
  it('says nothing at the very start of a game', () => {
    expect(announcementFor(base)).toBe('')
  })

  it('names the user\'s own play in the second person', () => {
    expect(announcementFor({ ...base, community: [{ id: '7S', rank: 7, suit: 'S', img: '' }] }))
      .toBe('You played Seven of Spades')
  })

  it('names an opponent by seat', () => {
    const community = [card('a', 3), { id: 'KH', rank: 14, suit: 'H' as const, img: '' }]

    expect(announcementFor({ ...base, community })).toBe('Player 1 played King of Hearts')
  })

  it('reports the round outcome with the winning card and the pot', () => {
    const pot = [card('a', 3), { id: 'KH', rank: 14, suit: 'H' as const, img: '' }, card('c', 2), card('d', 5)]

    expect(announcementFor({
      ...base,
      roundNumber: 4,
      lastRoundWinnerId: 1,
      players: [player(0), player(1, 24, pot), player(2), player(3)]
    })).toBe('Player 1 wins the round with King of Hearts, 24 points')
  })

  it('reports the user\'s own round win in the second person', () => {
    const pot = [{ id: 'KH', rank: 14, suit: 'H' as const, img: '' }, card('b', 2)]

    expect(announcementFor({
      ...base,
      roundNumber: 4,
      lastRoundWinnerId: 0,
      numberOfPlayers: 2,
      players: [player(0, 16, pot), player(1)]
    })).toBe('You win the round with King of Hearts, 16 points')
  })

  // The winner may have won earlier rounds too; only the newest pot is this round's.
  it('reads only the most recent pot from the winner\'s stack', () => {
    const older = [card('old1', 5), card('old2', 6)]
    const pot = [{ id: 'QS', rank: 13, suit: 'S' as const, img: '' }, card('b', 2)]

    expect(announcementFor({
      ...base,
      roundNumber: 4,
      lastRoundWinnerId: 1,
      numberOfPlayers: 2,
      players: [player(0), player(1, 26, [...older, ...pot])]
    })).toBe('Player 1 wins the round with Queen of Spades, 15 points')
  })

  it('announces the user winning the game', () => {
    expect(announcementFor({
      ...base,
      roundNumber: 11,
      gameLeads: [player(0, 84)]
    })).toBe('Game over. You win with 84 points.')
  })

  it('announces an opponent winning the game', () => {
    expect(announcementFor({
      ...base,
      roundNumber: 11,
      gameLeads: [player(2, 91)]
    })).toBe('Game over. Player 2 wins with 91 points.')
  })

  it('announces a tie', () => {
    expect(announcementFor({
      ...base,
      roundNumber: 11,
      gameLeads: [player(0, 70), player(3, 70)]
    })).toBe('Game over. User and Player 3 tie with 70 points.')
  })

  it('prefers the game-over line even though the community is empty', () => {
    expect(announcementFor({
      ...base,
      roundNumber: 11,
      lastRoundWinnerId: 1,
      gameLeads: [player(1, 60)],
      players: [player(0), player(1, 60, [card('a', 9), card('b', 2), card('c', 2), card('d', 2)])]
    })).toBe('Game over. Player 1 wins with 60 points.')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"
npm test -- src/lib/announce.test.ts
```

Expected: FAIL — `Failed to resolve import "@cg/lib/announce"`.

- [ ] **Step 3: Write `src/lib/announce.ts`**

```ts
import { NUMBER_OF_CARDS_PER_PLAYER, USERS_POSITION } from '@cg/constants'
import { cardName } from '@cg/lib/cards'
import { winningIndexOf } from '@cg/lib/seats'
import type { Card, Player } from '@cg/types'

export interface AnnounceState {
  roundNumber: number
  community: Card[]
  players: Player[]
  gameLeads: Player[]
  lastRoundWinnerId: number | null
  numberOfPlayers: number
}

/*
 * A pure function of state, deliberately. The live region renders whatever this returns;
 * assistive technology announces it when it changes, so there is no "has this already been
 * said" bookkeeping to get wrong — and the whole thing is testable without a DOM.
 *
 * Every play is announced, not only the user's: outcomes alone would leave a screen-reader
 * user unable to follow the table at all.
 *
 * The cost of that choice is unverified. `aria-live="polite"` controls WHEN a change is
 * spoken — the AT waits until the user is idle — not WHETHER a superseded change is
 * dropped. ARIA guarantees no coalescing, and screen readers differ: several queue every
 * distinct mutation. At TIME_BETWEEN_PLAYS_MS (650ms) with sentences that take seconds to
 * speak, a four-player round could build a backlog and end up reading stale plays.
 *
 * This needs a real screen reader to settle and is on the manual-pass list. If a backlog
 * shows up, the fix is to narrow the second branch below to `seat === USERS_POSITION`, so
 * only the user's own play and the round and game outcomes are announced — the spec's own
 * three examples are exactly those.
 */
export const announcementFor = ({
  roundNumber,
  community,
  players,
  gameLeads,
  lastRoundWinnerId,
  numberOfPlayers
}: AnnounceState): string => {
  if (roundNumber > NUMBER_OF_CARDS_PER_PLAYER) {
    if (gameLeads.length === 0) {
      return ''
    }

    const names = gameLeads.map(lead => lead.name).join(' and ')
    const { score } = gameLeads[0]

    if (gameLeads.length > 1) {
      return `Game over. ${names} tie with ${score} points.`
    }

    return gameLeads[0].id === USERS_POSITION
      ? `Game over. You win with ${score} points.`
      : `Game over. ${names} wins with ${score} points.`
  }

  // Within a round players discard in activePlayerId order starting at 0, so the card just
  // added is at index community.length - 1 and was played by that seat.
  if (community.length > 0) {
    const seat = community.length - 1
    const name = cardName(community[seat])

    return seat === USERS_POSITION
      ? `You played ${name}`
      : `${players[seat].name} played ${name}`
  }

  if (lastRoundWinnerId === null) {
    return ''
  }

  const winner = players[lastRoundWinnerId]
  // The pot was appended to wonCards whole, so the newest numberOfPlayers cards are it.
  const pot = winner.wonCards.slice(-numberOfPlayers)

  if (pot.length === 0) {
    return ''
  }

  const total = pot.reduce((sum, card) => sum + card.rank, 0)
  const best = cardName(pot[winningIndexOf(pot)])

  return winner.id === USERS_POSITION
    ? `You win the round with ${best}, ${total} points`
    : `${winner.name} wins the round with ${best}, ${total} points`
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"
npm test -- src/lib/announce.test.ts
```

Expected: PASS, 10 tests.

- [ ] **Step 5: Write the live region**

Create `src/components/live-region.tsx`:

```tsx
import { usePlayGameContext } from '@cg/hooks/use-play-game'
import { announcementFor } from '@cg/lib/announce'

import styles from '@cg/components/live-region.module.css'

export const LiveRegion = () => {
  const game = usePlayGameContext()

  return (
    <div className={styles.live} aria-live="polite" aria-atomic="true">
      {announcementFor(game)}
    </div>
  )
}
```

`PlayGameValue` extends `GameState` and adds `numberOfPlayers`, so the context value already satisfies `AnnounceState` structurally — no mapping needed.

Create `src/components/live-region.module.css`:

```css
/*
 * Visible to assistive technology, not to the eye. display: none or visibility: hidden
 * would take it out of the accessibility tree entirely and nothing would ever be
 * announced — this is the standard clip-rect technique instead.
 */
.live {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
```

- [ ] **Step 6: Write the round indicator**

Create `src/components/round-progress.tsx`:

```tsx
import { NUMBER_OF_CARDS_PER_PLAYER } from '@cg/constants'
import { usePlayGameContext } from '@cg/hooks/use-play-game'

import styles from '@cg/components/round-progress.module.css'

export const RoundProgress = () => {
  const game = usePlayGameContext()
  // roundNumber runs to 11 to signal the game is over; the indicator stops at 10.
  const round = Math.min(game.roundNumber, NUMBER_OF_CARDS_PER_PLAYER)

  return (
    <p className={styles.progress}>
      <span className={styles.label}>Round</span>
      <span className={styles.count}>{`${round} / ${NUMBER_OF_CARDS_PER_PLAYER}`}</span>
    </p>
  )
}
```

Create `src/components/round-progress.module.css`:

```css
.progress {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 0;
  padding: 6px 12px;
  background: var(--surface-2);
  border: 1px solid var(--rail);
  border-radius: 999px;
}

.label {
  font-size: var(--fs-xs);
  color: var(--text-lo);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.count {
  font-size: var(--fs-sm);
  font-weight: 700;
  color: var(--text-hi);
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 7: Mount both in `src/pages/game.tsx`**

Add the imports:

```tsx
import { LiveRegion } from '@cg/components/live-region'
import { RoundProgress } from '@cg/components/round-progress'
```

Change the `PlayingTable` header to carry both controls, and mount the live region beside the modal:

```tsx
      <PlayingTable
        hasManyPlayers={game.hasMoreThanTwoPlayers}
        header={
          <>
            <RoundProgress />
            <SoundToggle />
          </>
        }>
```

and after `<Modal />`:

```tsx
      <Modal />
      <LiveRegion />
```

The header is `justify-content: space-between`, so the round indicator sits left and the toggle right.

- [ ] **Step 8: Run the full gate**

```bash
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"
npm run typecheck && npm run lint && npm test && npm run build
```

Expected: all clean, `Tests  115 passed (115)`.

- [ ] **Step 9: Commit**

```bash
git add src/lib/announce.ts src/lib/announce.test.ts src/components/live-region.tsx \
  src/components/live-region.module.css src/components/round-progress.tsx \
  src/components/round-progress.module.css src/pages/game.tsx
git commit -m "feat: announce play and show how far through the game you are"
```

---

### Task 10: The modal as a real dialog

It keeps its always-mounted, `data-open`-driven mechanism — that was verified not to intercept clicks when closed and there is no reason to change it. What it gains is dialog semantics, a focus trap, Escape, and a surface that belongs to the new palette.

**Files:**
- Modify: `src/components/modal.tsx` (full rewrite), `src/components/modal.module.css` (full rewrite)
- Test: `src/pages/pages.test.ts` (extend)

**Interfaces:**
- Consumes: `usePlayGameContext` and the existing `gameLeads` / `playersSortedByPoints`.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Write the failing test**

The modal only opens after eleven rounds, which server rendering cannot reach — no timers run. Rendering `Modal` directly inside a hand-built provider is what makes it observable. Append to `src/pages/pages.test.ts`:

```ts
describe('Modal names the winner', () => {
  const player = (id: number, score: number): Player => ({
    id,
    name: id === 0 ? 'User' : `Player ${id}`,
    score,
    remainingCards: [],
    wonCards: []
  })

  const finished = (leads: Player[], players: Player[]): PlayGameValue => ({
    canUserPlay: false,
    activePlayerId: 0,
    roundNumber: NUMBER_OF_CARDS_PER_PLAYER + 1,
    players,
    community: [],
    gameLeads: leads,
    lastRoundWinnerId: leads[0].id,
    numberOfPlayers: players.length,
    hasMoreThanTwoPlayers: players.length > 2,
    playersSortedByPoints: [...players].sort((first, second) => second.score - first.score),
    getIsPlayerLeading: candidate => leads.some(lead => lead.id === candidate.id),
    discardACard: () => undefined
  })

  // children goes inside the props object, not as createElement's third argument. JSX and
  // createElement differ here: PlayGameContextProvider declares `children` as a required
  // prop, and the variadic overload does not satisfy it, so the third-argument form fails
  // typecheck with "Property 'children' is missing".
  const renderModal = (value: PlayGameValue) =>
    render(h(PlayGameContextProvider, { value, children: h(Modal) }))

  it('names a single winner and lists the final scores', () => {
    const players = [player(0, 84), player(1, 61)]
    const html = renderModal(finished([players[0]], players))

    expect(html).toContain('User wins!')
    expect(html).toContain('Final scores')
    expect(html).toContain('84')
    expect(html).toContain('61')
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
  })

  it('names both winners on a tie', () => {
    const players = [player(0, 70), player(1, 70)]
    const html = renderModal(finished(players, players))

    expect(html).toContain('User &amp; Player 1')
  })
})
```

Add the imports this block needs at the top of the file:

```ts
import { NUMBER_OF_CARDS_PER_PLAYER } from '@cg/constants'
import { Modal } from '@cg/components/modal'
import { PlayGameContextProvider } from '@cg/hooks/use-play-game'
import type { PlayGameValue } from '@cg/hooks/use-play-game'
import type { Player } from '@cg/types'
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"
npm test -- src/pages/pages.test.ts
```

Expected: FAIL on `role="dialog"` and on `Final scores` — the current modal has neither the attribute nor a rows table, and its heading markup differs.

- [ ] **Step 3: Rewrite `src/components/modal.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useNavigate } from 'react-router'

import { NUMBER_OF_CARDS_PER_PLAYER } from '@cg/constants'
import { usePlayGameContext } from '@cg/hooks/use-play-game'
import { cx } from '@cg/lib/utils'

import styles from '@cg/components/modal.module.css'

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export const Modal = () => {
  const navigate = useNavigate()
  const game = usePlayGameContext()
  const [isDismissed, setIsDismissed] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const restoreToRef = useRef<HTMLElement | null>(null)

  const isOpen = game.roundNumber > NUMBER_OF_CARDS_PER_PLAYER && !isDismissed
  const winners = game.gameLeads.map(lead => lead.name).join(' & ')

  /*
   * Gated on isOpen, not on a mount flag: when the modal is closed this effect does
   * nothing and registers no cleanup, so StrictMode's double invoke on mount is a no-op.
   * The capture and the restore are a matched pair on the same state transition.
   */
  useEffect(() => {
    if (!isOpen) {
      return
    }

    restoreToRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null

    panelRef.current?.focus()

    return () => {
      restoreToRef.current?.focus()
    }
  }, [isOpen])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      setIsDismissed(true)

      return
    }

    if (event.key !== 'Tab') {
      return
    }

    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)

    if (!focusable || focusable.length === 0) {
      return
    }

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    // Wrap at both ends. Without this, Tab walks straight out of the dialog and onto the
    // table behind it, which is exactly what aria-modal promises it will not do.
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div className={styles.overlay} data-open={isOpen}>
      <div
        ref={panelRef}
        className={styles.content}
        data-open={isOpen}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-heading"
        tabIndex={-1}
        onKeyDown={handleKeyDown}>
        <h2 id="modal-heading" className={styles.heading}>
          {game.gameLeads.length > 1
            ? `It's a tie — ${winners} win!`
            : `${winners} wins!`
          }
        </h2>
        <p className={styles.subheading}>Final scores</p>
        <table className={styles.scores}>
          <tbody>
            {game.playersSortedByPoints.map(player => (
              <tr
                key={player.id}
                className={cx(game.getIsPlayerLeading(player) && styles.winnerRow)}>
                <td className={styles.scoreName}>{player.name}</td>
                <td className={styles.scoreValue}>{player.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          className={styles.newGame}
          onClick={() => void navigate('/')}>
          New game
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Rewrite `src/components/modal.module.css`**

```css
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(5, 7, 6, 0.72);
  backdrop-filter: blur(6px);
  opacity: 0;
  transition: opacity var(--dur-base) var(--ease-out);
  /*
   * The mechanism the rewrite verified: parked behind everything when closed so it cannot
   * intercept a click, brought forward when open. Do not replace it with conditional
   * mounting — the transition needs both states to exist.
   */
  z-index: -9999;
}

.overlay[data-open='true'] {
  opacity: 1;
  z-index: 9999;
}

.content {
  position: fixed;
  top: 50%;
  left: 50%;
  box-sizing: border-box;
  width: 460px;
  max-width: calc(100vw - 32px);
  padding: 28px;
  background: var(--surface-1);
  border: 1px solid var(--rail);
  border-radius: 14px;
  box-shadow: 0 32px 80px rgba(0, 0, 0, 0.6);
  transform: translate(-50%, -46%) scale(0.96);
  opacity: 0;
  visibility: hidden;
  transition: transform var(--dur-base) var(--ease-out),
    opacity var(--dur-base) var(--ease-out),
    visibility var(--dur-base) var(--ease-out);
}

/* visibility: hidden is what keeps the New game button out of the tab order when closed. */
.content[data-open='true'] {
  transform: translate(-50%, -50%) scale(1);
  opacity: 1;
  visibility: visible;
}

.content:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 4px;
}

.heading {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--fs-xl);
  font-weight: 500;
  color: var(--text-hi);
  text-align: center;
}

.subheading {
  margin: 20px 0 8px;
  font-size: var(--fs-xs);
  color: var(--text-lo);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  text-align: center;
}

.scores {
  width: 100%;
  border-collapse: collapse;
}

.scores td {
  padding: 10px 12px;
  font-size: var(--fs-base);
  color: var(--text-lo);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.winnerRow td {
  background: var(--accent-soft);
  color: var(--text-hi);
  font-weight: 700;
}

.winnerRow td:first-child {
  border-radius: 8px 0 0 8px;
}

.winnerRow td:last-child {
  border-radius: 0 8px 8px 0;
}

.scoreName {
  text-align: left;
}

.scoreValue {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.newGame {
  display: block;
  width: 100%;
  margin-top: 24px;
  padding: 14px 20px;
  background: var(--accent);
  color: var(--surface-0);
  border: 0;
  border-radius: 10px;
  font-family: inherit;
  font-size: var(--fs-base);
  font-weight: 700;
  cursor: pointer;
  transition: filter var(--dur-fast) var(--ease-out);
}

.newGame:hover {
  filter: brightness(1.1);
}

.newGame:focus-visible {
  outline: 2px solid var(--text-hi);
  outline-offset: 2px;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"
npm test
```

Expected: PASS, `Tests  117 passed (117)`.

If the tie assertion fails, check how `renderToString` escapes `&` — the test expects `User &amp; Player 1`. If React emits a different escape, change the assertion to match what the renderer actually produces; do not change the separator in the component to dodge it.

- [ ] **Step 6: Verify every `styles.*` lookup exists**

```bash
grep -o 'styles\.[a-zA-Z]*' src/components/modal.tsx | sort -u
```

Expected, all present in `modal.module.css`: `styles.content`, `styles.heading`, `styles.newGame`, `styles.overlay`, `styles.scoreName`, `styles.scoreValue`, `styles.scores`, `styles.subheading`, `styles.winnerRow`.

Nine names, nine classes. A lookup with no matching class resolves to `undefined` and renders `class="undefined"` in silence — CSS modules will not warn you, and neither will the compiler.

- [ ] **Step 7: Run the full gate and commit**

```bash
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"
npm run typecheck && npm run lint && npm test && npm run build
git add src/components/modal.tsx src/components/modal.module.css src/pages/pages.test.ts
git commit -m "feat: make the end-of-game modal a real, trapping dialog"
```

**Report honestly:** the focus trap, the Escape dismissal and the focus restore are not unit-tested — all three need a live DOM. Only the rendered semantics (`role`, `aria-modal`, the heading, the scores table) are covered. They are on the manual pass list.

---

### Task 11: The home screen

Three uppercase gold buttons floating on the felt become a proper menu panel, and the loading and error states get real treatment instead of a bare line of text.

**Files:**
- Modify: `src/pages/home.tsx` (full rewrite)
- Create: `src/pages/home.module.css`
- Test: `src/pages/pages.test.ts` (update the Home assertions)

**Interfaces:**
- Consumes: `useCreateNewGame` (unchanged), `<SoundToggle />` (Task 5), `PlayingTable`'s `header` prop (Task 5).
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Update the Home smoke test to the new copy**

The prompt text changes, so the assertion must. The three button labels do not change. Replace the `describe('Home renders', ...)` block in `src/pages/pages.test.ts` with:

```ts
describe('Home renders', () => {
  it('shows the title, the instruction and all three player-count buttons', () => {
    const html = render(h(Home))

    expect(html).toContain('Card Game')
    expect(html).toContain('Highest card takes the pot. Ten rounds — the best score wins.')
    expect(html).toContain('Select number of players')
    expect(html).toContain('2 Players')
    expect(html).toContain('3 Players')
    expect(html).toContain('4 Players')
  })

  it('renders the sound toggle, which the deal cue needs to be reachable from here', () => {
    expect(render(h(Home))).toContain('aria-label="Sound"')
  })
})
```

Note: `renderToString` escapes the en dash as itself, not an entity, so the instruction can be asserted literally. If it comes back escaped, match what the renderer emits.

- [ ] **Step 2: Run the test to verify it fails**

```bash
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"
npm test -- src/pages/pages.test.ts
```

Expected: FAIL on `Card Game` and the instruction line — the page still says `Select Number Of Players`.

- [ ] **Step 3: Rewrite `src/pages/home.tsx`**

```tsx
import { PlayingTable } from '@cg/components/playing-table'
import { SoundToggle } from '@cg/components/sound-toggle'
import { MAX_PLAYERS, MIN_PLAYERS } from '@cg/constants'
import { useCreateNewGame } from '@cg/hooks/use-create-game'
import { range } from '@cg/lib/utils'

import styles from '@cg/pages/home.module.css'

export const Home = () => {
  const { isLoading, error, startNewGame } = useCreateNewGame()

  return (
    <PlayingTable header={<SoundToggle />}>
      <div className={styles.panel}>
        <h1 className={styles.title}>Card Game</h1>
        <p className={styles.instruction}>
          Highest card takes the pot. Ten rounds — the best score wins.
        </p>
        <p className={styles.prompt} id="player-count-label">Select number of players</p>
        <div className={styles.segmented} role="group" aria-labelledby="player-count-label">
          {range(MIN_PLAYERS, MAX_PLAYERS + 1).map(count => (
            <button
              key={count}
              type="button"
              className={styles.segment}
              disabled={isLoading}
              onClick={() => void startNewGame(count)}>
              {`${count} Players`}
            </button>
          ))}
        </div>
        {isLoading
          ? <p className={styles.loading}>
            <span className={styles.spinner} aria-hidden="true" />
            Dealing…
          </p>
          : null
        }
        {error
          ? <p className={styles.error} role="alert">{error}</p>
          : null
        }
      </div>
    </PlayingTable>
  )
}
```

The buttons here use the native `disabled` attribute, unlike the cards in Task 6. That is correct: the row disables as a unit while dealing, there is no focus to preserve within it mid-play, and the page navigates away a moment later.

- [ ] **Step 4: Create `src/pages/home.module.css`**

```css
.panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  max-width: 520px;
  padding: 36px 28px;
  background: rgba(9, 12, 11, 0.5);
  border: 1px solid var(--rail);
  border-radius: 16px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.45);
  text-align: center;
}

.title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--fs-2xl);
  font-weight: 500;
  color: var(--text-hi);
}

.instruction {
  margin: 12px 0 0;
  font-size: var(--fs-base);
  color: var(--text-lo);
}

.prompt {
  margin: 28px 0 12px;
  font-size: var(--fs-xs);
  color: var(--text-lo);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

/* A segmented row: one control made of three, rather than three floating buttons. */
.segmented {
  display: flex;
  overflow: hidden;
  background: var(--surface-2);
  border: 1px solid var(--rail);
  border-radius: 12px;
}

.segment {
  padding: 14px 22px;
  background: none;
  border: 0;
  border-left: 1px solid var(--rail);
  color: var(--text-hi);
  font-family: inherit;
  font-size: var(--fs-base);
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out),
    color var(--dur-fast) var(--ease-out);
}

.segment:first-child {
  border-left: 0;
}

.segment:hover:not(:disabled) {
  background: var(--accent-soft);
}

.segment:active:not(:disabled) {
  background: var(--accent);
  color: var(--surface-0);
}

.segment:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.segment:disabled {
  opacity: 0.5;
  cursor: default;
}

.loading {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 20px 0 0;
  font-size: var(--fs-sm);
  color: var(--text-lo);
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--accent-soft);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 700ms linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error {
  margin: 20px 0 0;
  font-size: var(--fs-sm);
  color: var(--danger);
}

@media (max-width: 460px) {
  /* Three segments will not fit in a row on a phone; stack them rather than overflow. */
  .segmented {
    flex-direction: column;
  }

  .segment {
    border-left: 0;
    border-top: 1px solid var(--rail);
  }

  .segment:first-child {
    border-top: 0;
  }
}
```

Note the reduced-motion block in `theme.css` sets `animation-iteration-count: 1`, which stops the spinner after one turn. That is intended: under a reduce preference the spinner is a static ring and the `Dealing…` text carries the state.

- [ ] **Step 5: Verify every `styles.*` lookup exists**

```bash
grep -o 'styles\.[a-zA-Z]*' src/pages/home.tsx | sort -u
```

Expected, all present in `home.module.css`: `styles.error`, `styles.instruction`, `styles.loading`, `styles.panel`, `styles.prompt`, `styles.segment`, `styles.segmented`, `styles.spinner`, `styles.title`.

- [ ] **Step 6: Run the full gate**

```bash
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"
npm run typecheck && npm run lint && npm test && npm run build
```

Expected: all clean, `Tests  118 passed (118)`.

- [ ] **Step 7: Commit**

```bash
git add src/pages/home.tsx src/pages/home.module.css src/pages/pages.test.ts
git commit -m "feat: rebuild the home menu as a panel with real loading and error states"
```

---

### Task 12: Remove what nothing imports, and verify the whole branch

`Text`, `Button` and `Wrap` existed to serve the old chrome. Every component that used them has been restyled, and leaving them behind leaves a second, contradictory styling system in the tree. This task deletes what is genuinely unreferenced, then verifies the branch as a whole — including the sums that per-file review cannot see.

**Files:**
- Delete (only if unreferenced): `src/components/common/text.tsx`, `src/components/common/text.module.css`, `src/components/common/button.tsx`, `src/components/common/button.module.css`, `src/components/common/wrap.tsx`, `src/components/common/wrap.module.css`
- Modify: `docs/superpowers/HANDOFF-ui-overhaul.md`

**Interfaces:**
- Consumes: everything.
- Produces: a branch ready for review.

- [ ] **Step 1: Find out what is actually still imported**

```bash
grep -rn "common/text\|common/button\|common/wrap\|common/blank" src --include=*.tsx --include=*.ts
```

`common/blank` **is** still imported by `player.tsx` and `game.tsx` — it stays. For each of the other three, delete the pair only if this grep shows no importer. **If something still imports one of them, do not delete it and do not rewrite the importer to force the deletion** — report it instead; an unexpected importer means an earlier task left work behind.

- [ ] **Step 2: Delete the unreferenced components**

```bash
git rm src/components/common/text.tsx src/components/common/text.module.css \
  src/components/common/button.tsx src/components/common/button.module.css \
  src/components/common/wrap.tsx src/components/common/wrap.module.css
```

- [ ] **Step 3: Verify nothing broke**

```bash
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"
npm run typecheck && npm run lint && npm test && npm run build
```

Expected: all clean, `Tests  118 passed (118)`. A deleted module that something still imported is a typecheck failure naming the importer.

- [ ] **Step 4: Verify the branch-level invariants**

These are the checks per-file review misses. Run each and confirm the stated expectation.

```bash
# 1. No stale palette token anywhere.
grep -rn -- "--color-" src
```
Expected: no output.

```bash
# 2. The card geometry is untouched — three declarations, the original values.
grep -rn -- "--card-w:\|--card-h:\|--card-stick:" src/styles/theme.css
```
Expected: `75px`/`104px`/`20px` at `:root`, `113px`/`157px`/`30px` in the 700-1199 query, `113px`/`157px` in the 1500 query. Nothing else.

```bash
# 3. The three load-bearing sums are intact.
grep -n "width: calc(var(--card-w) + 9 \* var(--card-stick))" src/components/players-cards.module.css
grep -n "margin-left: calc(var(--card-stick) - var(--card-w))" src/components/players-cards.module.css
grep -n "border: 3px solid" src/components/community-cards.module.css
```
Expected: one hit each. A miss means the hand or the community row will drift as cards are played — see Trap 3.

```bash
# 4. Runtime dependencies are still exactly three.
node -e "console.log(Object.keys(require('./package.json').dependencies))"
```
Expected: `[ 'react', 'react-dom', 'react-router' ]`.

```bash
# 5. No new asset bytes.
git diff --stat main -- public/
```
Expected: no output.

```bash
# 6. No vulnerabilities.
npm audit
```
Expected: `found 0 vulnerabilities`. This one needs network access — if it cannot reach the registry, say the check did not run rather than reporting it clean.

```bash
# 7. The property test ran, and passed.
npm test 2>&1 | grep -c "always reports the true max-score set"
```
Expected: a non-zero count, and `npm test` green — this is the 900-game gate on `playGameReducer`.

- [ ] **Step 5: Strike the completed item from the handoff and record the manual pass**

In `docs/superpowers/HANDOFF-ui-overhaul.md`, replace the "Outstanding — remind the owner" section with a single combined manual-pass checklist, so one browser sitting covers both the rewrite's leftover check and this overhaul's:

```markdown
## Outstanding — one browser sitting covers all of it

Nothing below can be verified by an agent in this project; all of it needs a human at a
browser. Run `npm run dev` and work down the list.

**Left over from the TypeScript rewrite — the deck-fetch error message.**
When `createDeck`/`drawCards` fail, Home should show *"Could not deal a new game. Please
try again."* The fetch rejection has unit coverage; the catch → dispatch → rendered-string
chain has never been observed in a browser.

- Load the app on the home screen with the network normal, **then** set DevTools Network to
  Offline, then click a player-count button. Do not reload while offline — the dev server
  is on localhost and Offline blocks that too, which just yields Chrome's dinosaur page.
- Or: click a button once so a `deckofcardsapi.com` request appears in the Network list,
  right-click it, **Block request domain**, then click again.

**From the UI overhaul (spec §11).**

- [ ] whose turn it is, is obvious at a glance, at every player count (2, 3 and 4)
- [ ] a played card visibly travels from its owner's side of the table
- [ ] the pot visibly goes to the winner, and their score counts rather than snaps
- [ ] the round indicator advances 1 → 10
- [ ] the whole game is playable with the keyboard only, focus always visible
- [ ] arrow keys move within the hand; Enter and Space play; focus is not lost after a play
- [ ] with OS "reduce motion" enabled, nothing animates and nothing breaks
- [ ] with sound enabled, cues fire and never overlap harshly; muted is genuinely silent;
      enabling mid-game works (the context is created on the first cue, not at load)
- [ ] the modal traps focus, Escape closes it, and focus returns to the table
- [ ] the layout is unchanged from the rewrite at all three breakpoints — check the
      700-1199px band in particular, where the hand and community row are widest
```

- [ ] **Step 6: Commit**

```bash
git add -A src docs/superpowers/HANDOFF-ui-overhaul.md
git commit -m "chore: drop the components the old chrome needed and fold the manual pass into the handoff"
```

- [ ] **Step 7: Request review**

Use `superpowers:requesting-code-review` for a **whole-branch** review, not per-file. State plainly in the request:

- what was verified automatically (typecheck, lint, 118 tests, build, audit, the seven branch-level invariants above)
- what was **not**: all motion, the focus trap, the roving tabindex, sound, reduced motion, and the layout at every breakpoint. No agent in this project has been able to drive a browser. **Do not claim any of it works.**

---

## Self-Review

Run against the spec, section by section.

| Spec section | Covered by |
| --- | --- |
| §1 the constraint — `TIME_BETWEEN_PLAYS_MS`, `lastRoundWinnerId`, property test | Task 2, and Task 12 step 4 check 7 |
| §2 palette, felt, type, motion tokens | Task 1 |
| §3 pacing 650ms | Task 2 step 6 |
| §4 arrival + exit handoff, `useDeparted`, pot ceremony, count-up, reduced motion | Tasks 3, 4, 7, 8; reduced motion in Task 1 step 2 and `prefersReducedMotion` in Task 3 |
| §5 turn state, playable cards, round progress | Tasks 8, 6, 9 |
| §6 three synthesized cues, lazy context, muted default, toggle on both routes, fails silently | Task 5 |
| §7 button semantics, aria-labels, roving tabindex, live region, focus rings, `aria-pressed` | Tasks 6, 9; focus rings in Tasks 5, 6, 10, 11 |
| §8 modal dialog + focus trap; home panel, segmented row, loading, error | Tasks 10, 11 |
| §9 file inventory | Every file listed appears in the File Structure table, plus the two documented departures |
| §10 testing — `use-count-up`, `use-departed`, `sound`, `use-play-game`, `pages` smoke tests | Tasks 3, 4, 5, 2, 6/10/11 |
| §11 verification | Task 12 |

**Known limits, stated rather than hidden:**

- The spec's test table asks for `hooks/use-count-up.test.ts` and `hooks/use-departed.test.ts` to cover the *hooks*. In a DOM-free Node environment a React hook cannot be executed at all. The plan tests the pure core of each (`interpolate`, `prefersReducedMotion`, `departedFrom`) exhaustively and leaves the rAF loop and the hold timer to the manual pass. Every task that does this says so in its own report step.
- Seat-direction offsets (Task 7) are approximate below 1200px, where the board stacks vertically. Measuring the real geometry is the FLIP machinery §4 rejected.
- Announcing every play rather than only the user's is a judgment call recorded in `announce.ts`'s comment: outcomes alone would leave a screen-reader user unable to follow the table.
