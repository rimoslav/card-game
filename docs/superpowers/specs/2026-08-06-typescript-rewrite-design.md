# Card Game — TypeScript Rewrite Design

**Date:** 2026-08-06
**Status:** Approved (pending spec review)

## Motivation

The repository generates continuous GitHub/Dependabot security alerts. The cause is
`react-scripts@5.0.0`: Create React App is unmaintained, so its transitive tree
(`nth-check`, `postcss`, `svgo`, `loader-utils`, `webpack-dev-server`) never receives
upstream patches. Bumping individual packages cannot fix this — the build tool has to go.

Alongside that, this rewrite delivers six explicit requirements:

1. Rewrite in TypeScript.
2. Use current package versions.
3. Absolute imports rooted at `@cg/`.
4. Remove `with-window-size.js`; use CSS media queries instead.
5. Remove `ramda`; write our own utilities.
6. Move the game out of URL params into `localStorage`, obfuscated so that a stored
   value does not visibly correspond to a card (e.g. `AD` → Ace of Diamonds).

## Goals

- Eliminate the unmaintained dependency tree causing the alerts.
- Preserve current gameplay behaviour, apart from the three approved fixes in §10.
- Leave the app a static SPA — same build-and-serve deployment story.

## Non-Goals

- No new gameplay features, no visual redesign.
- No server component; the app stays fully client-side.
- No mid-game persistence (see "Persistence scope").

---

## 1. Toolchain

| Removed | Replacement | Version |
| --- | --- | --- |
| `react-scripts` 5.0.0 | `vite` + `@vitejs/plugin-react` | 8.2.1 / 6.0.5 |
| `ramda` 0.28 | `src/lib/utils.ts` (3 functions) | — |
| `axios` 0.25 | native `fetch` | — |
| `styled-components` 5 + `babel-plugin-styled-components` | CSS Modules (Vite-native) | — |
| `prop-types` | TypeScript | 6.0.3 |
| `web-vitals` + `reportWebVitals.js` | deleted (CRA boilerplate) | — |
| `@testing-library/*` | `vitest` | 4.1.10 |
| `.eslintrc.js` + `@babel/eslint-parser` | `eslint.config.js` (flat) + `typescript-eslint` | 10.8.0 / 8.66.0 |
| `babel.config.js`, `jsconfig.json` | `vite.config.ts`, `tsconfig.json` | — |

Retained: `react` / `react-dom` 19.2.8, `react-router` 8.3.0.

Runtime dependencies drop from **12 to 3**.

### TypeScript version constraint

`typescript` latest is **7.0.2** (the native Go compiler), but `typescript-eslint@8.66.0`
declares `typescript: ">=4.8.4 <6.1.0"` — the canary (`8.66.1-alpha.8`) has the same cap.
No published `typescript-eslint` supports TS 7, and ESLint cannot parse `.ts`/`.tsx`
without it.

**Decision: pin `typescript@6.0.3`** — the newest release inside the supported range.
This gives a clean install with no peer overrides and retains type-aware lint rules.
Revisit when `typescript-eslint` ships TS 7 support.

### Node

Development targets Node 24 (`v24.19.0`, npm 11.17.0). `engines.node` is set to
`^20.19.0 || ^22.13.0 || >=24` — the intersection of the toolchain's own requirements
(vite `^20.19.0 || >=22.12.0`, eslint `^20.19.0 || ^22.13.0 || >=24`,
vitest `^20 || ^22 || >=24`).

---

## 2. Absolute imports

`tsconfig.json`:

```jsonc
{
  "compilerOptions": {
    "paths": { "@cg/*": ["./src/*"] }
  }
}
```

Deliberately no `baseUrl`: TypeScript 6.0.3 rejects it (`TS5101`, removed in TS 7). Without
it, `paths` resolve relative to `tsconfig.json`, and the targets need the `./` prefix or TS
raises `TS5090`.

`vite.config.ts` carries the matching runtime alias:

```ts
resolve: { alias: { '@cg': path.resolve(__dirname, 'src') } }
```

Vitest reads `vite.config.ts`, so a single definition serves the editor, the build,
and the test runner. All intra-project imports use `@cg/...`; relative imports are
disallowed by an ESLint `no-restricted-imports` rule permitting only `./*.module.css`
siblings.

---

## 3. File layout

```
index.html                    (moves to repo root — Vite convention)
vite.config.ts
tsconfig.json
eslint.config.js
public/                       (unchanged: card-back.jpeg, ace-of-*.png, manifest, robots)
src/
  main.tsx
  app.tsx
  types.ts
  constants.ts                gameplay constants
  styles/theme.css            CSS custom properties + breakpoints + colors
  components/
    common/{wrap,text,button,blank}.tsx + .module.css
    card.tsx  players-cards.tsx  community-cards.tsx
    player.tsx  name-and-points.tsx  playing-table.tsx  modal.tsx
  hooks/
    use-create-game.ts
    use-play-game.tsx
  lib/
    cards.ts                  token map, encode/decode, rank parsing
    storage.ts                localStorage read/write + validation
    utils.ts                  range, replaceAt, chunk
  pages/{home,game}.tsx
  services/deck-api.ts
```

Deleted outright: `src/hooks/with-window-size.js`, `src/reportWebVitals.js`,
`src/setupTests.js`, `src/App.test.js`, `src/utils/helpers.js` (split into `lib/`).

`src/utils/variables.js` is dissolved by kind rather than moved wholesale:

| Export | Destination |
| --- | --- |
| `COLORS`, `CARD_SIZE` | `styles/theme.css` as custom properties (`--color-primary`, `--card-w`, …) |
| `ALIGN`, `DIRECTION` | `components/common/wrap.module.css` — the same vocabulary (`col`, `row-rev`, `between`, …) becomes modifier classes that `wrap.tsx` looks up, so `Wrap`'s public prop API is unchanged |
| `USERS_POSITION`, `NUMBER_OF_CARDS_PER_PLAYER`, `TIME_BETWEEN_PLAYS_MS` | `src/constants.ts` |
| `CARDS_MAP` | `src/lib/cards.ts`, as the `RANKS` table (§6) |

---

## 4. Removing `with-window-size`

`mapSizesToProps(ww)` currently derives four values from a debounced `resize` listener,
re-rendering every consumer on resize. All four become CSS.

Existing breakpoint behaviour, preserved exactly:

| Value | Rule today |
| --- | --- |
| card size | large (113×157) when `ww ≥ 1500` **or** `700 ≤ ww < 1200`; else small (75×104) |
| `cardStickingOutPx` | 30 when `700 ≤ ww < 1200`; else 20 |
| `shouldShowWonCards` | `ww ≥ 400` |
| `isLargeScreen` | `ww ≥ 1200` |

`src/styles/theme.css`:

```css
:root { --card-w: 75px; --card-h: 104px; --card-stick: 20px; }

@media (min-width: 700px) and (max-width: 1199px) {
  :root { --card-w: 113px; --card-h: 157px; --card-stick: 30px; }
}
@media (min-width: 1500px) {
  :root { --card-w: 113px; --card-h: 157px; }
}
```

`shouldShowWonCards` (`ww ≥ 400`) becomes a rule in `player.module.css` rather than
`theme.css`, since `.wonCards` is a CSS Modules class and would not match from a
global stylesheet:

```css
@media (max-width: 399px) { .wonCards { display: none; } }
```

### Layout branching

`isLargeScreen` drove direction / `align` / `order` across three columns in `game.js`.
That moves into `game.module.css` behind `@media (min-width: 1200px)`. The
"more than two players" variant is **not** a viewport concern, so it is selected by a
`data-many-players` attribute derived from the player count:

```css
.board  { display: flex; flex-direction: column; align-items: center; flex: 1; max-width: 1400px; }
.colA   { order: 2; } .colB { order: 1; } .colC { order: 3; }

@media (min-width: 1200px) {
  .board { flex-direction: column-reverse; }
  .colA  { order: 1; } .colB { order: 2; }
  .spacer { display: none; }

  .board[data-many-players='true']       { flex-direction: row; align-items: stretch; }
  .board[data-many-players='true'] .colA { flex-direction: column-reverse; }
}
```

### Deleted layout arithmetic

Because card dimensions are now CSS variables, the JS layout maths disappears:

- `left: index * moveCardValue` → `margin-left: calc(var(--card-stick) - var(--card-w))`
  on `.card + .card`. The won-cards stack uses `calc(-1 * var(--card-w))`.
- `totalWidth = cardWidth + (length(cards) - 1) * cardStickingOutPx` → `width: fit-content`.
  Negative sibling margins make the flex container measure correctly on its own.
- `width: numberOfPlayers * (cardWidth + 6)` on community cards → `width: fit-content`.
- The `Blank width={10 + (10 - length(player.remainingCards)) * cardStickingOutPx}`
  spacer in `player.js` → a static `margin-left: 10px` on the won-cards group.

Net effect: no resize listener, no `debounce`, no re-render on resize, and all five
current `withWindowSize` consumers — `card`, `community-cards`, `player`,
`players-cards` and `pages/game` — stop taking size props entirely.

---

## 5. Replacing ramda

Fifteen ramda functions are in use. Thirteen map to natives:

| ramda | replacement |
| --- | --- |
| `length` | `.length` |
| `map`, `forEach`, `find`, `includes`, `join` | array methods |
| `addIndex(map)` / `addIndex(forEach)` | `.map((x, i) => …)` / `.forEach` |
| `any` | `.some` |
| `reject(p, xs)` | `xs.filter(x => !p(x))` |
| `sort(cmp, xs)` | `[...xs].sort(cmp)` — spread preserves immutability |
| `modulo(a, b)` | `a % b` — operands are never negative here |
| `match(re, s)` | `s.match(re)` |
| `is(Number, v)` | `typeof v === 'number'` |

The remaining two (`range`, `update`) are rewritten in `src/lib/utils.ts`, joined by
`chunk`, which is new — it deals the drawn cards into hands, replacing the flat-string
slicing that `mapCardsToPlayers` did with `match(/.{1,2}/g, …)`:

```ts
export const range = (start: number, end: number): number[] => …
export const replaceAt = <T>(index: number, value: T, xs: readonly T[]): T[] => …  // ramda `update`
export const chunk = <T>(size: number, xs: readonly T[]): T[][] => …               // deals hands
```

`debounce` is deleted along with the resize listener.

---

## 6. Card obfuscation and storage

### Threat model

This is a fully client-side app; anything the browser decodes, a determined user can
decode. This is **obfuscation, not security**. The goal is that inspecting
`localStorage` in DevTools does not reveal the hand. A keyed token map achieves that
with zero dependencies and no async API.

### `src/lib/cards.ts`

The 52 deckofcardsapi codes are values `A 2 3 4 5 6 7 8 9 0 J Q K` × suits `S D C H`.

A salted FNV-1a 32-bit hash produces a 6-character base36 token per code. Both
directions of the map are built once at module load:

```ts
const token = (code: string): string => {
  let h = 0x811c9dc5
  for (const ch of SALT + code) {
    h ^= ch.charCodeAt(0)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36).padStart(7, '0').slice(-6)
}
```

36⁶ ≈ 2.2 billion over 52 items makes collision vanishingly unlikely, and a test
asserts all 52 tokens are unique — a collision fails CI rather than the game.
The token contains no substring of the code, so `AD` is not recoverable by inspection.

Rank parsing preserves the original mapping exactly, including its quirks
(`'0'` → 10, `'A'` → 1, `'J'` → 12, `'Q'` → 13, `'K'` → 14 — note there is no rank 11):

```ts
const RANKS: Record<string, number> = { '0': 10, A: 1, J: 12, Q: 13, K: 14 }
const rankOf = (code: string): number => Number(code[0]) || RANKS[code[0]]
```

The Ace of Diamonds keeps the local-image special case introduced in `d9e4966`;
`process.env.PUBLIC_URL` becomes `import.meta.env.BASE_URL`.

### `src/lib/storage.ts`

Single key `cg.g`:

```jsonc
{ "v": 1, "p": 4, "h": [["k3f9x1", …10 tokens], …4 hands] }
```

`loadGame()` validates on every read — version is 1, `p` is 2–4, `h.length === p`,
each hand holds exactly 10 tokens, every token is a known key. **Any** failure returns
`null` rather than throwing, covering absent, corrupt, hand-edited, and stale-schema
data. `saveGame()` and `clearGame()` complete the module.

This also removes a live crash: today a hand-edited URL with mismatched
`:numberOfPlayers` and `:cards` indexes past the end of `players`.

### Routing and persistence scope

Routes become `/` (Home) and `/game`. `/game` calls `loadGame()`; a `null` result
renders `<Navigate to="/" replace />`.

**Persistence scope: the deal only.** Storage holds exactly what the URL held —
the dealt hands. Refreshing mid-game restarts the same deal from round 1, matching
today's behaviour. Scores, round number, and active player are *not* persisted, so
the reducer stays pure with no write-on-dispatch effect.

Flow: `startNewGame(n)` → create deck → draw `n × 10` cards → `chunk` into `n` hands
→ `saveGame` → `navigate('/game')`.

---

## 7. Types

```ts
type Suit = 'S' | 'D' | 'C' | 'H'

interface Card   { id: string; rank: number; suit: Suit; img: string }
interface Player { id: number; name: string; score: number; remainingCards: Card[]; wonCards: Card[] }

interface GameState {
  canUserPlay: boolean
  activePlayerId: number
  roundNumber: number
  players: Player[]
  community: Card[]
  gameLeads: Player[]
}

type GameAction =
  | { type: 'CARD_DISCARDED'; payload: { cardObj: Card; numberOfPlayers: number } }
  | { type: 'HANDLE_ROUND_COMPLETED'; payload: number }
```

The discriminated union turns the reducer's `default: throw new Error(…)` into a
compile-time `never` exhaustiveness check.

`GameContext` is created with an explicit type and a `usePlayGameContext` hook that
throws outside a provider — today `createContext()` with no argument yields
`undefined` and every consumer accesses it unguarded.

---

## 8. Known defects

Three suspected issues were investigated, plus one found while writing this design.
**Findings are recorded as they came out, including one that turned out to be a false
alarm.**

### 8.1 Dead loading branch — CONFIRMED, will fix

`src/pages/game.js:43` branches on `gameHookObj.isDealingCards`. `usePlayGame` never
sets that key; it is the only occurrence in the codebase, so the branch is permanently
`undefined` and the loading state is unreachable.

**Fix:** remove the branch. Loading already surfaces on Home via `use-create-game`'s
`isLoading`, which is where the network call actually happens.

### 8.2 Modal winner count vs. list — CONFIRMED, will fix

`src/components/modal.js:77` renders `We have {gameLeads.length} winner(s)!` but the
list beneath it (line 91) maps `playersSortedByPoints` — every player, not the winners.
A single-winner game announces "1 winner" and then lists all four.

**Fix:** keep the full scoreboard (it is the more useful screen) and reword the heading
to name the winner(s), so heading and list agree.

### 8.3 `gameLeads` reducer logic — NOT A BUG, retracted

Line 98 spreads `state.gameLeads` (the previous round's value) where the surrounding
code uses the freshly computed local `gameLeads`, which reads like a stale-state bug.

**It was empirically refuted.** The reducer was extracted verbatim and run over 9,000
randomized games (2, 3 and 4 players, all 10 rounds, seeded RNG), asserting after every
round that `gameLeads` equals the true set of max-score players, contains no duplicates,
and holds no stale score snapshots. **Zero defects.** Branch-coverage counters confirm
the suspect line executed 907 times and the loop's tie branch 7,510 times, so the result
is not vacuous.

The reason it is correct: a round winner's score always strictly exceeds the prior
maximum (card ranks are ≥ 1, so the pot is always > 0), meaning the winner always takes
the `>` branch. `state.gameLeads` is therefore always already equal to the freshly
computed set when line 98 runs.

**Action:** no behaviour change. The port will use the local variable consistently for
clarity, since the current form depends on an unstated invariant, and the property test
below pins the behaviour permanently.

### 8.4 Silent API failure — minor, will fix

`CREATE_DECK_AND_DRAW_CARDS_ERROR` only clears `isLoading`; a failed deck request
leaves Home looking idle with no feedback. An `error` field and an inline message are
added. Flagged as a small scope addition beyond a pure port.

---

## 9. Testing

Vitest, logic-only — no DOM rendering, no jsdom.

**`localStorage` in the node environment.** Verified on Node 24.19.0:
`globalThis.localStorage` is still `undefined` by default. Node's Web Storage
implementation exists but requires `--experimental-webstorage` *and*
`--localstorage-file=<path>` (omitting the path throws `ERR_INVALID_ARG_VALUE`), emits
an `ExperimentalWarning`, and is **file-backed** — so state would persist across test
runs and leak between cases. Upgrading Node further does not help.

Therefore `storage.ts` reads its backing store through a module-level
`getStore(): Storage` indirection defaulting to `window.localStorage`, and
`storage.test.ts` installs a ~15-line in-memory `Storage` stub. This keeps the test
environment `node`, needs no flags, adds no dependency, and gives each test a clean
store.

| File | Coverage |
| --- | --- |
| `lib/cards.test.ts` | all 52 codes produce unique tokens; encode→decode roundtrip is lossless; no token contains its source code as a substring; rank parsing incl. `'0'`→10, `'A'`→1, `'K'`→14 |
| `lib/storage.test.ts` | save/load roundtrip; `null` for absent, malformed JSON, wrong version, wrong hand count, short hand, and unknown token |
| `lib/utils.test.ts` | `range`, `replaceAt` (immutability), `chunk` |
| `hooks/use-play-game.test.ts` | discard moves a card to community and advances the active player; the pot goes to the highest rank; ties go to the later player; **property test** — over seeded randomized games at 2/3/4 players, `gameLeads` always equals the true max-score set |

The property test is a direct port of the harness that refuted §8.3, so that
investigation becomes a permanent regression guard.

---

## 10. Behaviour changes

Only three, all fixes, all listed above: the dead loading branch is removed (§8.1),
the modal heading is reworded to match its list (§8.2), and deck-fetch failures now
show a message (§8.4). Gameplay, scoring, layout and visual design are otherwise
unchanged.

## 11. Verification

- `npm run build` succeeds.
- `npm run typecheck` (`tsc --noEmit`) reports no errors under `strict`.
- `npm run lint` clean.
- `npm test` all green.
- `npm audit` reports zero vulnerabilities — the objective that motivated the rewrite.
- Manual pass: start a 2-, 3- and 4-player game; play a full round; confirm the
  end-of-game modal; refresh `/game` and confirm the deal resumes; clear `localStorage`
  and confirm `/game` redirects home; check layout at 375px, 800px, 1280px and 1600px.
