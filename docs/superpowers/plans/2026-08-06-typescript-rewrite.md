# Card Game TypeScript Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the unmaintained `react-scripts` toolchain with Vite + TypeScript, eliminating the recurring Dependabot alerts, while porting the existing card game behaviour intact.

**Architecture:** A static React SPA. Pure logic (card tokens, storage, game reducer) lives in `src/lib` and `src/hooks` as dependency-free modules covered by Vitest. Presentation uses CSS Modules with CSS custom properties, so all responsive behaviour is media queries rather than a JS resize listener. Game state moves from URL params into a single obfuscated `localStorage` key.

**Tech Stack:** Vite 8.2.1, React 19.2.8, TypeScript 6.0.3, react-router 8.3.0, Vitest 4.1.10, ESLint 10.8.0 + typescript-eslint 8.66.0, CSS Modules.

**Spec:** `docs/superpowers/specs/2026-08-06-typescript-rewrite-design.md`

## Global Constraints

- **Code style — match the existing codebase:** no semicolons, single quotes, 2-space indent, arrow-function components. Every code block in this plan already follows it.
- **Absolute imports only.** All intra-project imports use `@cg/...`. The single exception is a sibling `./x.module.css`, which CSS Modules require. An ESLint rule enforces this.
- **Exact versions, pinned (no `^`):** react 19.2.8, react-dom 19.2.8, react-router 8.3.0, vite 8.2.1, @vitejs/plugin-react 6.0.5, typescript 6.0.3, vitest 4.1.10, eslint 10.8.0, typescript-eslint 8.66.0, @eslint/js 10.0.1, eslint-plugin-react-hooks 7.1.1, globals 17.9.0, @types/node 24.13.3, @types/react 19.2.18, @types/react-dom 19.2.4.
- **TypeScript is 6.0.3, NOT 7.x.** TS 7 exists but `typescript-eslint@8.66.0` requires `>=4.8.4 <6.1.0`. Installing TS 7 breaks linting entirely. Do not "helpfully" upgrade it.
- **Runtime dependencies are exactly three:** `react`, `react-dom`, `react-router`. Adding any other `dependencies` entry defeats the purpose of this rewrite. Everything else is a `devDependency`.
- **Use `react-router`, NOT `react-router-dom`.** `react-router-dom` is a frozen legacy shim: its latest release (7.18.2) hard-pins `react-router: 7.18.2`, which carries the high-severity advisory GHSA-qwww-vcr4-c8h2 (`>=7.12.0 <8.3.0`). v8 absorbed the DOM package, so `react-router@8.3.0` is both the patched version and the current one. It exports `BrowserRouter`, `Routes`, `Route`, `Navigate` and `useNavigate` — verified. Import every router symbol from `'react-router'`.
- **Forbidden packages:** `ramda`, `axios`, `styled-components`, `prop-types`, `web-vitals`, `react-scripts`, `@testing-library/*`, `jsdom`, `happy-dom`. Do not reintroduce them.
- **`strict: true`.** No `any`, no `@ts-ignore`, no non-null assertions (`!`) — narrow explicitly instead.
- **Node:** develop on v24.19.0. If `node -v` reports v22, the shell has not picked up nvm's default; use `~/.nvm/versions/node/v24.19.0/bin/node` explicitly.
- **Tests are logic-only.** Vitest runs in the `node` environment. No component rendering, no DOM library.
- **Behaviour is preserved exactly**, except the three approved fixes: remove the dead `isDealingCards` branch (§8.1), reword the modal heading to match its list (§8.2), surface deck-fetch errors (§8.4). Port quirks faithfully — including rank 11 not existing and empty community slots being 6px wider than filled ones.

## File Structure

| Path | Responsibility |
| --- | --- |
| `index.html` | Vite entry document (moves from `public/`) |
| `vite.config.ts` | Build config, `@cg` alias, Vitest config |
| `tsconfig.json` | Strict TS config, `@cg/*` paths |
| `eslint.config.js` | Flat ESLint config, absolute-import rule |
| `src/main.tsx` | React root mount |
| `src/app.tsx` | Router and routes |
| `src/constants.ts` | Gameplay constants |
| `src/types.ts` | Shared domain types |
| `src/styles/theme.css` | Colour + card-size custom properties, breakpoints |
| `src/lib/utils.ts` | `range`, `replaceAt`, `chunk`, `cx` |
| `src/lib/cards.ts` | Token map, rank parsing, `Card` construction |
| `src/lib/storage.ts` | `localStorage` read/write with validation |
| `src/services/deck-api.ts` | `fetch` wrappers for deckofcardsapi.com |
| `src/hooks/use-create-game.ts` | Deck creation flow + loading/error state |
| `src/hooks/use-play-game.tsx` | Game reducer, context, turn timing |
| `src/components/common/*` | `Wrap`, `Text`, `Button`, `Blank` + CSS Modules |
| `src/components/*` | Card/player/table/modal presentation + CSS Modules |
| `src/pages/{home,game}.tsx` | Screens |

**Transitional rule:** legacy `src/**/*.js` files stay in place until the task that replaces them deletes them. `eslint.config.js` ignores `src/**/*.js` for the duration; Task 11 removes that ignore once none remain.

---

### Task 1: Toolchain bootstrap

Replaces CRA with Vite. Ends with a minimal but genuinely running app and all five npm scripts working.

**Files:**
- Modify: `package.json`
- Create: `vite.config.ts`, `tsconfig.json`, `eslint.config.js`, `index.html`, `src/vite-env.d.ts`, `src/main.tsx`, `src/app.tsx`, `src/styles/theme.css`
- Delete: `public/index.html`, `babel.config.js`, `jsconfig.json`, `.eslintrc.js`, `src/index.js`, `src/App.js`, `src/App.test.js`, `src/setupTests.js`, `src/reportWebVitals.js`

**Interfaces:**
- Consumes: nothing
- Produces: `@cg/*` alias resolution; `App` exported from `@cg/app`; CSS custom properties `--card-w`, `--card-h`, `--card-stick`, `--color-*`

- [ ] **Step 1: Replace `package.json`**

```json
{
  "name": "card-game",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": "^20.19.0 || ^22.13.0 || >=24"
  },
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "eslint ."
  },
  "dependencies": {
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "react-router": "8.3.0"
  },
  "devDependencies": {
    "@eslint/js": "10.0.1",
    "@types/node": "24.13.3",
    "@types/react": "19.2.18",
    "@types/react-dom": "19.2.4",
    "@vitejs/plugin-react": "6.0.5",
    "eslint": "10.8.0",
    "eslint-plugin-react-hooks": "7.1.1",
    "globals": "17.9.0",
    "typescript": "6.0.3",
    "typescript-eslint": "8.66.0",
    "vite": "8.2.1",
    "vitest": "4.1.10"
  }
}
```

- [ ] **Step 2: Wipe the old dependency tree and install**

```bash
rm -rf node_modules package-lock.json
npm install
```

Expected: completes with no `ERESOLVE` error. `@vitejs/plugin-react`'s `@rolldown/plugin-babel` and `babel-plugin-react-compiler` peers are declared optional, so they are correctly absent.

- [ ] **Step 3: Verify the alert baseline is clean**

```bash
npm audit
```

Expected: `found 0 vulnerabilities`. This is the objective that motivated the whole rewrite — if it is not clean here, stop and report before continuing.

- [ ] **Step 4: Create `vite.config.ts`**

```ts
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@cg': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
})
```

- [ ] **Step 5: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true,
    "paths": {
      "@cg/*": ["./src/*"]
    },
    "types": ["vite/client", "node"]
  },
  "include": ["src", "vite.config.ts"]
}
```

Three details here are load-bearing and were each verified against TypeScript 6.0.3 — do not "tidy" them:

- **There is no `baseUrl`.** TS 6.0.3 rejects it outright: `TS5101: Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0`. Silencing it with `"ignoreDeprecations": "6.0"` only defers the breakage to TS 7, so the option is dropped instead.
- **Path targets therefore need the `./` prefix.** Without `baseUrl`, a bare `"src/*"` fails with `TS5090: Non-relative paths are not allowed when 'baseUrl' is not set`. With no `baseUrl`, `paths` resolve relative to this file's directory, so `"./src/*"` is correct.
- **`"node"` is in `types`.** `vite.config.ts` imports `node:url`, which `vite/client` does not type; without it, `TS2591: Cannot find name 'node:url'`.

- [ ] **Step 6: Create `src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />
```

This is what gives `*.module.css` imports and `import.meta.env` their types.

- [ ] **Step 7: Create `eslint.config.js`**

```js
import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'src/**/*.js'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['./*', '../*', '!./*.module.css'],
          message: 'Use @cg/ absolute imports (only ./*.module.css siblings are allowed).'
        }]
      }]
    }
  }
)
```

> **If `npm run lint` throws reading `reactHooks.configs.recommended.rules`:** the plugin's flat-config export moved. Run
> `node -e "import('eslint-plugin-react-hooks').then(m => console.log(Object.keys(m.default.configs)))"`
> and substitute the correct key (likely `'recommended-latest'` or `flat.recommended`). Do not silently drop the plugin.

- [ ] **Step 8: Move `index.html` to the repo root**

```bash
git mv public/index.html index.html
```

Then replace its contents (Vite has no `%PUBLIC_URL%` substitution, and needs an explicit module script):

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="/ace-of-spades.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="A simple card game" />
    <link rel="apple-touch-icon" href="/ace-of-spades.png" />
    <link rel="manifest" href="/manifest.json" />
    <title>Card Game</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 9: Create `src/styles/theme.css`**

```css
:root {
  --color-primary: #daa520;
  --color-secondary: #255adf;
  --color-white: #fff;
  --color-black: #000;
  --color-silver: #c0c0c0;
  --color-dark-slate-gray: #2f4f4f;
  --color-name-tag: #2f4f4f1f;
  --color-name-tag-lead: #2f4f4f66;
  --color-green: #1e6b03;

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
}
```

The two large-card ranges are deliberately non-contiguous: cards are large at 700–1199px **and** at ≥1500px, small elsewhere. That reproduces `mapSizesToProps` exactly.

- [ ] **Step 10: Create `src/app.tsx` (temporary shell, replaced in Task 10)**

```tsx
export const App = () => (
  <div>Card Game</div>
)
```

- [ ] **Step 11: Create `src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@cg/app'
import '@cg/styles/theme.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element #root not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 12: Delete the CRA scaffolding**

```bash
git rm -f babel.config.js jsconfig.json .eslintrc.js \
  src/index.js src/App.js src/App.test.js src/setupTests.js src/reportWebVitals.js
```

- [ ] **Step 13: Verify the toolchain end to end**

```bash
npm run typecheck && npm run lint && npm run build
```

Expected: all three exit 0, and `dist/` is produced.

```bash
npm run dev
```

Expected: dev server starts, `http://localhost:5173` renders the text "Card Game". Stop it afterwards.

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "build: replace react-scripts with Vite, TypeScript and ESLint flat config"
```

---

### Task 2: Core utilities

**Files:**
- Create: `src/lib/utils.ts`, `src/lib/utils.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `range(start: number, end: number): number[]` — half-open, `[start, end)`
  - `replaceAt<T>(index: number, value: T, xs: readonly T[]): T[]` — immutable; out-of-range returns an unchanged copy
  - `chunk<T>(size: number, xs: readonly T[]): T[][]`
  - `cx(...classes: (string | false | null | undefined)[]): string`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/utils.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { chunk, cx, range, replaceAt } from '@cg/lib/utils'

describe('range', () => {
  it('produces a half-open range', () => {
    expect(range(2, 5)).toEqual([2, 3, 4])
  })

  it('returns empty when start is not less than end', () => {
    expect(range(3, 3)).toEqual([])
    expect(range(4, 1)).toEqual([])
  })
})

describe('replaceAt', () => {
  it('replaces the element at the index', () => {
    expect(replaceAt(1, 'x', ['a', 'b', 'c'])).toEqual(['a', 'x', 'c'])
  })

  it('does not mutate the input', () => {
    const original = ['a', 'b', 'c']
    replaceAt(1, 'x', original)
    expect(original).toEqual(['a', 'b', 'c'])
  })

  it('returns an unchanged copy when the index is out of range', () => {
    const original = ['a', 'b']
    const result = replaceAt(5, 'x', original)
    expect(result).toEqual(['a', 'b'])
    expect(result).not.toBe(original)
  })
})

describe('chunk', () => {
  it('splits into equal groups', () => {
    expect(chunk(2, [1, 2, 3, 4])).toEqual([[1, 2], [3, 4]])
  })

  it('leaves a short final group', () => {
    expect(chunk(2, [1, 2, 3])).toEqual([[1, 2], [3]])
  })

  it('returns empty for an empty input', () => {
    expect(chunk(3, [])).toEqual([])
  })
})

describe('cx', () => {
  it('joins truthy class names and drops the rest', () => {
    expect(cx('a', false, null, undefined, 'b')).toBe('a b')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test -- src/lib/utils.test.ts
```

Expected: FAIL — cannot resolve `@cg/lib/utils`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/utils.ts`:

```ts
export const range = (start: number, end: number): number[] => {
  const result: number[] = []

  for (let index = start; index < end; index++) {
    result.push(index)
  }

  return result
}

export const replaceAt = <T>(index: number, value: T, xs: readonly T[]): T[] => {
  const result = [...xs]

  if (index >= 0 && index < result.length) {
    result[index] = value
  }

  return result
}

export const chunk = <T>(size: number, xs: readonly T[]): T[][] => {
  const result: T[][] = []

  for (let index = 0; index < xs.length; index += size) {
    result.push(xs.slice(index, index + size))
  }

  return result
}

export const cx = (...classes: (string | false | null | undefined)[]): string =>
  classes.filter(Boolean).join(' ')
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test -- src/lib/utils.test.ts
```

Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils.ts src/lib/utils.test.ts
git commit -m "feat: add own utilities replacing ramda's range, update and helpers"
```

---

### Task 3: Card tokens and rank parsing

**Files:**
- Create: `src/constants.ts`, `src/types.ts`, `src/lib/cards.ts`, `src/lib/cards.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `type Suit = 'S' | 'D' | 'C' | 'H'`
  - `interface Card { id: string; rank: number; suit: Suit; img: string }`
  - `interface Player { id: number; name: string; score: number; remainingCards: Card[]; wonCards: Card[] }`
  - `ALL_CODES: readonly string[]` — all 52 codes
  - `rankOf(code: string): number`
  - `encodeCard(code: string): string | undefined`
  - `decodeCard(token: string): string | undefined`
  - `cardFromCode(code: string): Card`
  - constants `USERS_POSITION`, `NUMBER_OF_CARDS_PER_PLAYER`, `TIME_BETWEEN_PLAYS_MS`, `MIN_PLAYERS`, `MAX_PLAYERS`

- [ ] **Step 1: Create `src/constants.ts`**

```ts
export const USERS_POSITION = 0
export const NUMBER_OF_CARDS_PER_PLAYER = 10
export const TIME_BETWEEN_PLAYS_MS = 1000
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 4
```

- [ ] **Step 2: Create `src/types.ts`**

```ts
export type Suit = 'S' | 'D' | 'C' | 'H'

export interface Card {
  id: string
  rank: number
  suit: Suit
  img: string
}

export interface Player {
  id: number
  name: string
  score: number
  remainingCards: Card[]
  wonCards: Card[]
}

export interface GameState {
  canUserPlay: boolean
  activePlayerId: number
  roundNumber: number
  players: Player[]
  community: Card[]
  gameLeads: Player[]
}

export type GameAction =
  | { type: 'CARD_DISCARDED'; payload: { cardObj: Card; numberOfPlayers: number } }
  | { type: 'HANDLE_ROUND_COMPLETED'; payload: number }
```

- [ ] **Step 3: Write the failing tests**

Create `src/lib/cards.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { ALL_CODES, cardFromCode, decodeCard, encodeCard, rankOf } from '@cg/lib/cards'

describe('ALL_CODES', () => {
  it('contains all 52 distinct cards', () => {
    expect(ALL_CODES).toHaveLength(52)
    expect(new Set(ALL_CODES).size).toBe(52)
  })
})

describe('token map', () => {
  it('assigns a unique token to every card', () => {
    const tokens = ALL_CODES.map(code => encodeCard(code))
    expect(new Set(tokens).size).toBe(52)
  })

  it('round-trips every card losslessly', () => {
    ALL_CODES.forEach(code => {
      const token = encodeCard(code)
      expect(token).toBeDefined()
      expect(decodeCard(token as string)).toBe(code)
    })
  })

  it('produces tokens that do not leak the card code', () => {
    ALL_CODES.forEach(code => {
      const token = encodeCard(code) as string
      expect(token.toUpperCase()).not.toContain(code)
    })
  })

  it('returns undefined for unknown input', () => {
    expect(encodeCard('ZZ')).toBeUndefined()
    expect(decodeCard('nope!!')).toBeUndefined()
  })

  // The lookup tables are consulted with untrusted values straight out of localStorage,
  // so inherited Object.prototype keys must not resolve to anything.
  it('returns undefined for Object.prototype property names', () => {
    const inherited = ['constructor', 'toString', 'hasOwnProperty', 'valueOf', '__proto__']

    inherited.forEach(name => {
      expect(encodeCard(name)).toBeUndefined()
      expect(decodeCard(name)).toBeUndefined()
    })
  })
})

describe('rankOf', () => {
  it('maps numeric cards to their face value', () => {
    expect(rankOf('2H')).toBe(2)
    expect(rankOf('9S')).toBe(9)
  })

  it('maps the API ten code to 10', () => {
    expect(rankOf('0D')).toBe(10)
  })

  it('maps court cards and the ace, leaving no rank 11', () => {
    expect(rankOf('AC')).toBe(1)
    expect(rankOf('JH')).toBe(12)
    expect(rankOf('QH')).toBe(13)
    expect(rankOf('KH')).toBe(14)
    expect(ALL_CODES.map(rankOf)).not.toContain(11)
  })
})

describe('cardFromCode', () => {
  it('builds a card with its remote image', () => {
    expect(cardFromCode('7S')).toEqual({
      id: '7S',
      rank: 7,
      suit: 'S',
      img: 'https://deckofcardsapi.com/static/img/7S.png'
    })
  })

  it('uses the local image for the ace of diamonds', () => {
    expect(cardFromCode('AD').img).toBe('/ace-of-diamonds.png')
  })
})
```

The ace-of-diamonds case preserves the fix from commit `d9e4966` — that card's remote image is broken upstream.

- [ ] **Step 4: Run the tests to verify they fail**

```bash
npm test -- src/lib/cards.test.ts
```

Expected: FAIL — cannot resolve `@cg/lib/cards`.

- [ ] **Step 5: Write the implementation**

Create `src/lib/cards.ts`:

```ts
import type { Card, Suit } from '@cg/types'

const SALT = 'cg.v1.'

const SUITS: readonly Suit[] = ['S', 'D', 'C', 'H']

const VALUES: readonly string[] = [
  'A', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'J', 'Q', 'K'
]

// '0' is the API's code for ten. Note the original mapping skips 11 entirely.
const RANKS: Record<string, number> = {
  '0': 10,
  A: 1,
  J: 12,
  Q: 13,
  K: 14
}

export const ALL_CODES: readonly string[] =
  VALUES.flatMap(value => SUITS.map(suit => `${value}${suit}`))

export const rankOf = (code: string): number => Number(code[0]) || RANKS[code[0]]

// FNV-1a, salted, rendered as 6 base36 chars. Not cryptographic — this only has to
// stop a stored value from visibly reading as a card. See spec section 6.
const tokenFor = (code: string): string => {
  let hash = 0x811c9dc5

  for (const character of SALT + code) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 0x01000193)
  }

  return (hash >>> 0).toString(36).padStart(7, '0').slice(-6)
}

// Object.create(null), not {} — these are looked up with untrusted input. A plain object
// literal inherits from Object.prototype, so decodeCard('constructor') would return the
// Object constructor instead of undefined, and Task 4's storage validation (which rejects
// a token when decodeCard returns undefined) would accept it as a card code.
const CODE_TO_TOKEN: Record<string, string> = Object.create(null)
const TOKEN_TO_CODE: Record<string, string> = Object.create(null)

ALL_CODES.forEach(code => {
  const token = tokenFor(code)

  CODE_TO_TOKEN[code] = token
  TOKEN_TO_CODE[token] = code
})

export const encodeCard = (code: string): string | undefined => CODE_TO_TOKEN[code]

export const decodeCard = (token: string): string | undefined => TOKEN_TO_CODE[token]

export const cardFromCode = (code: string): Card => ({
  id: code,
  rank: rankOf(code),
  suit: code[1] as Suit,
  img: code === 'AD'
    ? `${import.meta.env.BASE_URL}ace-of-diamonds.png`
    : `https://deckofcardsapi.com/static/img/${code}.png`
})
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
npm test -- src/lib/cards.test.ts
```

Expected: PASS, 9 tests. If the uniqueness test fails, two codes collided — change `SALT` (e.g. to `'cg.v2.'`) and rerun. That is exactly what the test exists to catch.

- [ ] **Step 7: Commit**

```bash
git add src/constants.ts src/types.ts src/lib/cards.ts src/lib/cards.test.ts
git commit -m "feat: add card token map, rank parsing and domain types"
```

---

### Task 4: Obfuscated localStorage persistence

**Files:**
- Create: `src/lib/storage.ts`, `src/lib/storage.test.ts`

**Interfaces:**
- Consumes: `encodeCard`, `decodeCard`, `ALL_CODES` from `@cg/lib/cards`; `NUMBER_OF_CARDS_PER_PLAYER`, `MIN_PLAYERS`, `MAX_PLAYERS` from `@cg/constants`
- Produces:
  - `interface StoredGame { playerCount: number; hands: string[][] }` — `hands` holds plain card codes; tokenisation is internal
  - `saveGame(game: StoredGame): void`
  - `loadGame(): StoredGame | null`
  - `clearGame(): void`
  - `setStore(store: Storage | null): void` — test seam only

- [ ] **Step 1: Write the failing tests**

Create `src/lib/storage.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { ALL_CODES } from '@cg/lib/cards'
import { clearGame, loadGame, saveGame, setStore } from '@cg/lib/storage'

const KEY = 'cg.g'

// Node has no localStorage (verified on v24.19.0), and its experimental Web Storage is
// file-backed, so it would leak state between tests. A tiny in-memory stub avoids both.
const createMemoryStore = (): Storage => {
  const map = new Map<string, string>()

  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => {
      map.delete(key)
    },
    setItem: (key: string, value: string) => {
      map.set(key, value)
    }
  }
}

let store: Storage

const handOf = (offset: number): string[] => ALL_CODES.slice(offset, offset + 10)

beforeEach(() => {
  store = createMemoryStore()
  setStore(store)
})

describe('saveGame / loadGame', () => {
  it('round-trips a four player game', () => {
    const game = {
      playerCount: 4,
      hands: [handOf(0), handOf(10), handOf(20), handOf(30)]
    }

    saveGame(game)

    expect(loadGame()).toEqual(game)
  })

  it('does not store readable card codes', () => {
    saveGame({ playerCount: 2, hands: [handOf(0), handOf(10)] })

    const raw = store.getItem(KEY) as string

    expect(raw).not.toContain('AD')
    expect(raw).not.toContain('KH')
  })

  it('returns null when nothing is stored', () => {
    expect(loadGame()).toBeNull()
  })
})

describe('loadGame validation', () => {
  const cases: [string, string][] = [
    ['malformed JSON', 'not json at all'],
    ['a non-object payload', '42'],
    ['a wrong version', JSON.stringify({ v: 99, p: 2, h: [[], []] })],
    ['a player count below the minimum', JSON.stringify({ v: 1, p: 1, h: [[]] })],
    ['a player count above the maximum', JSON.stringify({ v: 1, p: 9, h: [[]] })],
    ['a hand count that disagrees with the player count', JSON.stringify({ v: 1, p: 4, h: [[], []] })]
  ]

  cases.forEach(([label, raw]) => {
    it(`returns null for ${label}`, () => {
      store.setItem(KEY, raw)
      expect(loadGame()).toBeNull()
    })
  })

  it('returns null for a short hand', () => {
    saveGame({ playerCount: 2, hands: [handOf(0), handOf(10)] })

    const payload = JSON.parse(store.getItem(KEY) as string)
    payload.h[1] = payload.h[1].slice(0, 9)
    store.setItem(KEY, JSON.stringify(payload))

    expect(loadGame()).toBeNull()
  })

  it('returns null for an unknown token', () => {
    saveGame({ playerCount: 2, hands: [handOf(0), handOf(10)] })

    const payload = JSON.parse(store.getItem(KEY) as string)
    payload.h[0][0] = 'zzzzzz'
    store.setItem(KEY, JSON.stringify(payload))

    expect(loadGame()).toBeNull()
  })
})

describe('clearGame', () => {
  it('removes a stored game', () => {
    saveGame({ playerCount: 2, hands: [handOf(0), handOf(10)] })
    clearGame()

    expect(loadGame()).toBeNull()
  })
})

describe('saveGame rejects unencodable input', () => {
  it('throws rather than writing a placeholder token', () => {
    expect(() => saveGame({ playerCount: 2, hands: [['ZZ', ...handOf(0).slice(1)], handOf(10)] }))
      .toThrow(/unknown card code/)
  })

  it('throws for a prototype property name posing as a code', () => {
    expect(() => saveGame({ playerCount: 2, hands: [['constructor', ...handOf(0).slice(1)], handOf(10)] }))
      .toThrow(/unknown card code/)
  })
})

// Safari private mode and blocked-storage settings make localStorage throw on access.
describe('an unavailable store', () => {
  const throwingStore = (): Storage => ({
    get length(): number {
      throw new DOMException('denied', 'SecurityError')
    },
    clear: () => {
      throw new DOMException('denied', 'SecurityError')
    },
    getItem: () => {
      throw new DOMException('denied', 'SecurityError')
    },
    key: () => {
      throw new DOMException('denied', 'SecurityError')
    },
    removeItem: () => {
      throw new DOMException('denied', 'SecurityError')
    },
    setItem: () => {
      throw new DOMException('denied', 'SecurityError')
    }
  })

  it('makes loadGame return null instead of throwing', () => {
    setStore(throwingStore())

    expect(loadGame()).toBeNull()
  })

  it('makes clearGame a no-op instead of throwing', () => {
    setStore(throwingStore())

    expect(() => clearGame()).not.toThrow()
  })

  it('lets saveGame throw, so the caller can report the failure', () => {
    setStore(throwingStore())

    expect(() => saveGame({ playerCount: 2, hands: [handOf(0), handOf(10)] })).toThrow()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test -- src/lib/storage.test.ts
```

Expected: FAIL — cannot resolve `@cg/lib/storage`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/storage.ts`:

```ts
import { MAX_PLAYERS, MIN_PLAYERS, NUMBER_OF_CARDS_PER_PLAYER } from '@cg/constants'
import { decodeCard, encodeCard } from '@cg/lib/cards'

const KEY = 'cg.g'
const VERSION = 1

export interface StoredGame {
  playerCount: number
  hands: string[][]
}

interface StoredPayload {
  v: number
  p: number
  h: string[][]
}

let injectedStore: Storage | null = null

// Test seam: Node has no localStorage, so tests inject an in-memory Storage.
export const setStore = (store: Storage | null): void => {
  injectedStore = store
}

const getStore = (): Storage => injectedStore ?? window.localStorage

// Reading localStorage can throw outright, not just return null — Safari private mode and
// blocked-storage settings raise SecurityError on access, and quota limits raise on write.
// A missing game is a normal state, so a throwing store is treated as "no game stored".
const readRaw = (): string | null => {
  try {
    return getStore().getItem(KEY)
  } catch {
    return null
  }
}

const isStoredPayload = (value: unknown): value is StoredPayload => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const payload = value as Record<string, unknown>

  return payload.v === VERSION
    && typeof payload.p === 'number'
    && Array.isArray(payload.h)
}

export const saveGame = (game: StoredGame): void => {
  // Throw rather than writing a placeholder for an unencodable code. Writing '' would
  // produce a payload that loadGame later rejects, bouncing the player back to the home
  // screen with no explanation; throwing lets the caller's catch surface a real message.
  const h = game.hands.map(hand => hand.map(code => {
    const token = encodeCard(code)

    if (token === undefined) {
      throw new Error(`Cannot save game: unknown card code ${JSON.stringify(code)}`)
    }

    return token
  }))

  // Deliberately not caught: if the store is unavailable, the caller must know the game
  // was not saved rather than navigate to a game screen that cannot load.
  getStore().setItem(KEY, JSON.stringify({ v: VERSION, p: game.playerCount, h } satisfies StoredPayload))
}

export const loadGame = (): StoredGame | null => {
  const raw = readRaw()

  if (raw === null) {
    return null
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  if (!isStoredPayload(parsed)) {
    return null
  }

  if (parsed.p < MIN_PLAYERS || parsed.p > MAX_PLAYERS || parsed.h.length !== parsed.p) {
    return null
  }

  const hands: string[][] = []

  for (const hand of parsed.h) {
    if (!Array.isArray(hand) || hand.length !== NUMBER_OF_CARDS_PER_PLAYER) {
      return null
    }

    const codes: string[] = []

    for (const token of hand) {
      const code = typeof token === 'string'
        ? decodeCard(token)
        : undefined

      if (code === undefined) {
        return null
      }

      codes.push(code)
    }

    hands.push(codes)
  }

  return { playerCount: parsed.p, hands }
}

export const clearGame = (): void => {
  try {
    getStore().removeItem(KEY)
  } catch {
    // an unavailable store has nothing to clear
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test -- src/lib/storage.test.ts
```

Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage.ts src/lib/storage.test.ts
git commit -m "feat: store the dealt game in localStorage as opaque tokens"
```

---

### Task 5: Deck API over fetch

**Files:**
- Create: `src/services/deck-api.ts`, `src/services/deck-api.test.ts`
- Delete: `src/services/index.js`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `createDeck(): Promise<string>` — resolves to a deck id
  - `drawCards(deckId: string, count: number): Promise<string[]>` — resolves to card codes

Returning primitives rather than raw response envelopes keeps the API shape out of the rest of the app.

- [ ] **Step 1: Write the failing tests**

Create `src/services/deck-api.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDeck, drawCards } from '@cg/services/deck-api'

const mockFetch = (body: unknown, ok = true, status = 200) => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body)
  })

  vi.stubGlobal('fetch', fetchMock)

  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createDeck', () => {
  it('returns the deck id', async () => {
    mockFetch({ deck_id: 'abc123' })

    await expect(createDeck()).resolves.toBe('abc123')
  })

  it('requests a single shuffled deck', async () => {
    const fetchMock = mockFetch({ deck_id: 'abc123' })

    await createDeck()

    expect(fetchMock).toHaveBeenCalledWith(
      'https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1'
    )
  })

  it('rejects on a failed response', async () => {
    mockFetch({}, false, 500)

    await expect(createDeck()).rejects.toThrow('Deck request failed: 500')
  })
})

describe('drawCards', () => {
  it('returns just the card codes', async () => {
    mockFetch({ cards: [{ code: 'AD' }, { code: '7S' }] })

    await expect(drawCards('abc123', 2)).resolves.toEqual(['AD', '7S'])
  })

  it('requests the requested count from the given deck', async () => {
    const fetchMock = mockFetch({ cards: Array.from({ length: 40 }, () => ({ code: 'AS' })) })

    await drawCards('abc123', 40)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://deckofcardsapi.com/api/deck/abc123/draw/?count=40'
    )
  })
})

// A 200 response with the wrong shape must fail here, attributably, rather than sending a
// bad value onward — storage throws on an unknown card code, but several frames removed
// from the cause.
describe('malformed responses', () => {
  it('rejects a deck response with no deck id', async () => {
    mockFetch({})

    await expect(createDeck()).rejects.toThrow('Deck response did not contain a deck id')
  })

  it('rejects a deck response whose deck id is not a string', async () => {
    mockFetch({ deck_id: 42 })

    await expect(createDeck()).rejects.toThrow('Deck response did not contain a deck id')
  })

  it('rejects a draw response with no cards array', async () => {
    mockFetch({})

    await expect(drawCards('abc123', 2)).rejects.toThrow('Deck response did not contain a cards array')
  })

  it('rejects a draw that returned fewer cards than requested', async () => {
    mockFetch({ cards: [{ code: 'AD' }, { code: '7S' }] })

    await expect(drawCards('abc123', 40)).rejects.toThrow('returned 2 cards, expected 40')
  })

  it('rejects a draw response containing a card without a code', async () => {
    mockFetch({ cards: [{ code: 'AD' }, {}] })

    await expect(drawCards('abc123', 2)).rejects.toThrow('Deck response contained a card without a code')
  })

  it('propagates a network failure, so the caller can report it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(createDeck()).rejects.toThrow('Failed to fetch')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test -- src/services/deck-api.test.ts
```

Expected: FAIL — cannot resolve `@cg/services/deck-api`.

- [ ] **Step 3: Write the implementation**

Create `src/services/deck-api.ts`:

```ts
const BASE_URL = 'https://deckofcardsapi.com/api/deck'

// The response shapes are declared as `unknown` fields rather than asserted types: this is
// a third-party API and the JSON is untrusted. Validating here means a malformed response
// fails with an attributable message, instead of surfacing several frames later as a
// TypeError or a smuggled `undefined` inside a string[].
const getJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Deck request failed: ${response.status}`)
  }

  return await response.json() as T
}

const hasCode = (value: unknown): value is { code: string } =>
  typeof value === 'object'
    && value !== null
    && typeof (value as { code?: unknown }).code === 'string'

export const createDeck = async (): Promise<string> => {
  const deck = await getJson<{ deck_id?: unknown }>(`${BASE_URL}/new/shuffle/?deck_count=1`)

  if (typeof deck.deck_id !== 'string' || deck.deck_id === '') {
    throw new Error('Deck response did not contain a deck id')
  }

  return deck.deck_id
}

export const drawCards = async (deckId: string, count: number): Promise<string[]> => {
  const drawn = await getJson<{ cards?: unknown }>(`${BASE_URL}/${deckId}/draw/?count=${count}`)

  if (!Array.isArray(drawn.cards)) {
    throw new Error('Deck response did not contain a cards array')
  }

  // A short draw must fail here. Downstream, chunk() would silently produce a final
  // hand with fewer than ten cards, saveGame would accept it, and loadGame would then
  // reject the whole payload — bouncing the player home with no explanation.
  if (drawn.cards.length !== count) {
    throw new Error(`Deck response returned ${drawn.cards.length} cards, expected ${count}`)
  }

  return drawn.cards.map(card => {
    if (!hasCode(card)) {
      throw new Error('Deck response contained a card without a code')
    }

    return card.code
  })
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test -- src/services/deck-api.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Remove the axios service and commit**

```bash
git rm -f src/services/index.js
git add src/services/deck-api.ts src/services/deck-api.test.ts
git commit -m "feat: replace axios deck service with typed fetch wrappers"
```

---

### Task 6: Game reducer

The heart of the port. The reducer is exported separately from the hook so it can be tested as a pure function with no React involved.

**Files:**
- Create: `src/hooks/use-play-game.tsx`, `src/hooks/use-play-game.test.ts`
- Delete: `src/hooks/use-play-game.js`, `src/utils/helpers.js`, `src/utils/variables.js`

**Interfaces:**
- Consumes: `Card`, `Player`, `GameState`, `GameAction` from `@cg/types`; `cardFromCode` from `@cg/lib/cards`; `replaceAt` from `@cg/lib/utils`; constants from `@cg/constants`
- Produces:
  - `playGameReducer(state: GameState, action: GameAction): GameState`
  - `buildPlayers(hands: string[][]): Player[]`
  - `usePlayGame({ playerCount, hands }: { playerCount: number; hands: string[][] }): PlayGameValue`
  - `PlayGameContextProvider`, `usePlayGameContext(): PlayGameValue`
  - `PlayGameValue` = `GameState` plus `numberOfPlayers: number`, `hasMoreThanTwoPlayers: boolean`, `playersSortedByPoints: Player[]`, `getIsPlayerLeading(player: Player): boolean`, `discardACard(cardObj: Card): void`

**Porting note — spec §8.3.** The original spread `state.gameLeads` in the final tie branch while using a local `gameLeads` everywhere else. That was investigated and is *not* a bug, but it relies on an unstated invariant. The port uses the local variable consistently. The property test in Step 1 proves the two are equivalent, so this is a clarity change with no behaviour change.

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/use-play-game.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { NUMBER_OF_CARDS_PER_PLAYER } from '@cg/constants'
import { replaceAt } from '@cg/lib/utils'
import type { Card, GameState, Player } from '@cg/types'
import { buildPlayers, playGameReducer } from '@cg/hooks/use-play-game'

const card = (id: string, rank: number): Card =>
  ({ id, rank, suit: 'S', img: '' })

const emptyPlayer = (id: number): Player => ({
  id,
  name: id === 0 ? 'User' : `Player ${id}`,
  score: 0,
  remainingCards: [],
  wonCards: []
})

const stateWith = (numberOfPlayers: number, overrides: Partial<GameState> = {}): GameState => ({
  canUserPlay: true,
  activePlayerId: 0,
  roundNumber: 1,
  players: Array.from({ length: numberOfPlayers }, (_, id) => emptyPlayer(id)),
  community: [],
  gameLeads: [],
  ...overrides
})

describe('buildPlayers', () => {
  it('creates one player per hand, naming the user first', () => {
    const hands = [['AD', '2D'], ['3D', '4D']]
    const players = buildPlayers(hands)

    expect(players).toHaveLength(2)
    expect(players[0].name).toBe('User')
    expect(players[1].name).toBe('Player 1')
    expect(players[0].remainingCards.map(c => c.id)).toEqual(['AD', '2D'])
    expect(players[0].score).toBe(0)
    expect(players[0].wonCards).toEqual([])
  })
})

describe('CARD_DISCARDED', () => {
  it('moves the card to the community and advances the active player', () => {
    const discarded = card('7S', 7)
    const initial = stateWith(4)
    const withHand = {
      ...initial,
      players: replaceAt(0, { ...initial.players[0], remainingCards: [discarded] }, initial.players)
    }

    const next = playGameReducer(withHand, {
      type: 'CARD_DISCARDED',
      payload: { cardObj: discarded, numberOfPlayers: 4 }
    })

    expect(next.community).toEqual([discarded])
    expect(next.players[0].remainingCards).toEqual([])
    expect(next.activePlayerId).toBe(1)
    expect(next.canUserPlay).toBe(false)
  })

  it('wraps the active player back to zero', () => {
    const discarded = card('7S', 7)
    const initial = stateWith(4, { activePlayerId: 3 })
    const withHand = {
      ...initial,
      players: replaceAt(3, { ...initial.players[3], remainingCards: [discarded] }, initial.players)
    }

    const next = playGameReducer(withHand, {
      type: 'CARD_DISCARDED',
      payload: { cardObj: discarded, numberOfPlayers: 4 }
    })

    expect(next.activePlayerId).toBe(0)
  })
})

describe('HANDLE_ROUND_COMPLETED', () => {
  it('awards the whole community to the highest rank', () => {
    const community = [card('a', 3), card('b', 9), card('c', 2), card('d', 5)]
    const next = playGameReducer(stateWith(4, { community }), {
      type: 'HANDLE_ROUND_COMPLETED',
      payload: 4
    })

    expect(next.players[1].score).toBe(19)
    expect(next.players[1].wonCards).toEqual(community)
    expect(next.community).toEqual([])
    expect(next.roundNumber).toBe(2)
    expect(next.gameLeads.map(p => p.id)).toEqual([1])
  })

  it('breaks a rank tie in favour of the later player', () => {
    const community = [card('a', 9), card('b', 9), card('c', 2), card('d', 5)]
    const next = playGameReducer(stateWith(4, { community }), {
      type: 'HANDLE_ROUND_COMPLETED',
      payload: 4
    })

    expect(next.players[1].score).toBe(25)
    expect(next.players[0].score).toBe(0)
  })

  // Reachable if the settling effect ever fires before a round has been played — which
  // StrictMode's double mount-invoke provoked when this was gated on a mount flag.
  it('states the invariant when the community is empty', () => {
    expect(() => playGameReducer(stateWith(4), { type: 'HANDLE_ROUND_COMPLETED', payload: 4 }))
      .toThrow('HANDLE_ROUND_COMPLETED dispatched with an empty community')
  })
})

// Ported from the harness that investigated spec section 8.3. It refuted the suspected
// bug over 9,000 games; keeping it here pins gameLeads permanently.
describe('gameLeads property', () => {
  const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14]

  const makeRng = (initialSeed: number) => {
    let seed = initialSeed

    return (max: number) => {
      seed = (seed * 1664525 + 1013904223) % 4294967296

      return Math.floor((seed / 4294967296) * max)
    }
  }

  const playFullGame = (numberOfPlayers: number, seed: number): void => {
    const nextInt = makeRng(seed)
    let state = stateWith(numberOfPlayers)

    for (let round = 1; round <= NUMBER_OF_CARDS_PER_PLAYER; round++) {
      for (let playerId = 0; playerId < numberOfPlayers; playerId++) {
        const played = card(`r${round}p${playerId}`, RANKS[nextInt(RANKS.length)])

        state = {
          ...state,
          players: replaceAt(
            playerId,
            { ...state.players[playerId], remainingCards: [played] },
            state.players
          )
        }
        state = playGameReducer(state, {
          type: 'CARD_DISCARDED',
          payload: { cardObj: played, numberOfPlayers }
        })
      }

      state = playGameReducer(state, {
        type: 'HANDLE_ROUND_COMPLETED',
        payload: numberOfPlayers
      })

      const best = Math.max(...state.players.map(player => player.score))
      const expected = state.players.filter(player => player.score === best).map(player => player.id)
      const reported = state.gameLeads.map(player => player.id)

      expect([...reported].sort()).toEqual([...expected].sort())
      expect(new Set(reported).size).toBe(reported.length)

      state.gameLeads.forEach(lead => {
        expect(lead.score).toBe(state.players[lead.id].score)
      })
    }
  }

  ;[2, 3, 4].forEach(numberOfPlayers => {
    it(`always reports the true max-score set with ${numberOfPlayers} players`, () => {
      for (let seed = 1; seed <= 300; seed++) {
        playFullGame(numberOfPlayers, seed)
      }
    })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test -- src/hooks/use-play-game.test.ts
```

Expected: FAIL — cannot resolve `@cg/hooks/use-play-game`.

- [ ] **Step 3: Write the implementation**

Create `src/hooks/use-play-game.tsx`:

```tsx
import {
  createContext,
  useContext,
  useEffect,
  useReducer
} from 'react'
import type { ReactNode } from 'react'

import { TIME_BETWEEN_PLAYS_MS, USERS_POSITION } from '@cg/constants'
import { cardFromCode } from '@cg/lib/cards'
import { replaceAt } from '@cg/lib/utils'
import type { Card, GameAction, GameState, Player } from '@cg/types'

export const buildPlayers = (hands: string[][]): Player[] =>
  hands.map((hand, index) => ({
    id: index,
    name: index === USERS_POSITION
      ? 'User'
      : `Player ${index}`,
    score: 0,
    remainingCards: hand.map(cardFromCode),
    wonCards: []
  }))

const initialState: GameState = {
  canUserPlay: true,
  activePlayerId: 0,
  roundNumber: 1,
  players: [],
  community: [],
  gameLeads: []
}

export const playGameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'CARD_DISCARDED': {
      const activePlayer = state.players[state.activePlayerId]

      return {
        ...state,
        // there is a delay between a discard and the next play; block clicks during it
        canUserPlay: false,
        activePlayerId: (state.activePlayerId + 1) % action.payload.numberOfPlayers,
        players: replaceAt(state.activePlayerId, {
          ...activePlayer,
          remainingCards: activePlayer.remainingCards.filter(
            card => card.id !== action.payload.cardObj.id
          )
        }, state.players),
        community: [...state.community, action.payload.cardObj]
      }
    }
    case 'HANDLE_ROUND_COMPLETED': {
      const numberOfPlayers = action.payload

      // Only ever dispatched once a full round has been played. State the invariant
      // rather than reading community[0] of an empty pile, which fails with an opaque
      // "Cannot read properties of undefined (reading 'rank')".
      if (state.community.length === 0) {
        throw new Error('HANDLE_ROUND_COMPLETED dispatched with an empty community')
      }

      let communitySum = state.community[0].rank
      let roundWinnerId = 0
      let gameLeads: Player[] = [state.players[USERS_POSITION]]

      // Walk the community pile once: total the pot, find this round's winner, and
      // rebuild the lead set from scores as they stood before the pot was awarded.
      for (let index = 1; index < numberOfPlayers; index++) {
        communitySum += state.community[index].rank

        // >= means a rank tie goes to the later player
        if (state.community[index].rank >= state.community[roundWinnerId].rank) {
          roundWinnerId = index
        }

        if (state.roundNumber > 1) {
          if (state.players[index].score > gameLeads[0].score) {
            gameLeads = [state.players[index]]
          } else if (state.players[index].score === gameLeads[0].score) {
            gameLeads = [...gameLeads, state.players[index]]
          }
        }
      }

      const roundWinnerUpdated: Player = {
        ...state.players[roundWinnerId],
        wonCards: [...state.players[roundWinnerId].wonCards, ...state.community],
        score: state.players[roundWinnerId].score + communitySum
      }

      // Now fold the winner's new score in. The pot is always > 0, so a player who was
      // already leading necessarily takes the first branch and cannot be duplicated.
      if (roundWinnerUpdated.score > gameLeads[0].score) {
        gameLeads = [roundWinnerUpdated]
      } else if (roundWinnerUpdated.score === gameLeads[0].score) {
        gameLeads = [...gameLeads, roundWinnerUpdated]
      }

      return {
        ...state,
        canUserPlay: !state.activePlayerId,
        roundNumber: state.roundNumber + 1,
        players: replaceAt(roundWinnerId, roundWinnerUpdated, state.players),
        community: [],
        gameLeads
      }
    }
    default: {
      const unhandled: never = action

      throw new Error(`Invalid action in playGameReducer: ${JSON.stringify(unhandled)}`)
    }
  }
}

export interface PlayGameValue extends GameState {
  numberOfPlayers: number
  hasMoreThanTwoPlayers: boolean
  playersSortedByPoints: Player[]
  getIsPlayerLeading: (player: Player) => boolean
  discardACard: (cardObj: Card) => void
}

export const usePlayGame = ({
  playerCount,
  hands
}: {
  playerCount: number
  hands: string[][]
}): PlayGameValue => {
  const [state, dispatch] = useReducer(playGameReducer, hands, initialHands => ({
    ...initialState,
    players: buildPlayers(initialHands)
  }))

  const discardACard = (cardObj: Card): void => {
    dispatch({
      type: 'CARD_DISCARDED',
      payload: { cardObj, numberOfPlayers: playerCount }
    })
  }

  useEffect(() => {
    if (state.activePlayerId !== USERS_POSITION) {
      // Read state directly, not through a ref. The effect closure captures this render's
      // state, which is current at the moment the effect runs, so a ref adds nothing — and
      // writing one during render is what eslint-plugin-react-hooks' `refs` rule forbids.
      const active = state.players[state.activePlayerId]
      const cardIndex = Math.floor(Math.random() * active.remainingCards.length)
      const chosen = active.remainingCards[cardIndex]

      const timer = setTimeout(() => {
        discardACard(chosen)
      }, TIME_BETWEEN_PLAYS_MS)

      return () => clearTimeout(timer)
    }

    // Back round to the user — settle the round before they may play again. Gate on the
    // community actually holding cards rather than on a "have I mounted yet" ref: an
    // empty pile means the game has only just started. A mount flag cannot express this
    // safely, because StrictMode invokes the effect twice on mount and the flag's branch
    // has no cleanup to undo, so the second invocation would fall through and settle a
    // round that was never played.
    if (state.community.length === 0) {
      return
    }

    const timer = setTimeout(() => {
      dispatch({ type: 'HANDLE_ROUND_COMPLETED', payload: playerCount })
    }, TIME_BETWEEN_PLAYS_MS)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.activePlayerId])

  return {
    ...state,
    numberOfPlayers: playerCount,
    hasMoreThanTwoPlayers: playerCount > 2,
    playersSortedByPoints: [...state.players].sort((first, second) => second.score - first.score),
    getIsPlayerLeading: player => state.gameLeads.some(lead => lead.id === player.id),
    discardACard
  }
}

const GameContext = createContext<PlayGameValue | null>(null)

export const PlayGameContextProvider = ({
  value,
  children
}: {
  value: PlayGameValue
  children: ReactNode
}) => (
  <GameContext.Provider value={value}>
    {children}
  </GameContext.Provider>
)

export const usePlayGameContext = (): PlayGameValue => {
  const value = useContext(GameContext)

  if (value === null) {
    throw new Error('usePlayGameContext must be used inside PlayGameContextProvider')
  }

  return value
}
```

Two deliberate improvements over the original, both invisible to the player: the timers are now cleared on unmount (the original leaked a `setTimeout` per turn), and the context throws instead of yielding `undefined` when used outside a provider.

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test -- src/hooks/use-play-game.test.ts
```

Expected: PASS, 8 tests. The three property tests each play 300 full games.

- [ ] **Step 5: Delete the superseded modules and commit**

```bash
git rm -f src/hooks/use-play-game.js src/utils/helpers.js src/utils/variables.js
git add src/hooks/use-play-game.tsx src/hooks/use-play-game.test.ts
git commit -m "feat: port game reducer to TypeScript with a gameLeads property test"
```

---

### Task 7: Game creation hook

**Files:**
- Create: `src/hooks/use-create-game.ts`
- Delete: `src/hooks/use-create-game.js`

**Interfaces:**
- Consumes: `createDeck`, `drawCards` from `@cg/services/deck-api`; `saveGame` from `@cg/lib/storage`; `chunk` from `@cg/lib/utils`; `NUMBER_OF_CARDS_PER_PLAYER` from `@cg/constants`
- Produces: `useCreateNewGame(): { isLoading: boolean; error: string | null; startNewGame: (playerCount: number) => Promise<void> }`

This carries approved fix §8.4: a failed deck request now reports an error instead of silently resetting.

- [ ] **Step 1: Write the implementation**

Create `src/hooks/use-create-game.ts`:

```ts
import { useEffect, useReducer, useRef } from 'react'
import { useNavigate } from 'react-router'

import { NUMBER_OF_CARDS_PER_PLAYER } from '@cg/constants'
import { saveGame } from '@cg/lib/storage'
import { chunk } from '@cg/lib/utils'
import { createDeck, drawCards } from '@cg/services/deck-api'

interface CreateGameState {
  isLoading: boolean
  error: string | null
}

type CreateGameAction =
  | { type: 'REQUEST' }
  | { type: 'ERROR'; payload: string }

const initialState: CreateGameState = {
  isLoading: false,
  error: null
}

const createNewGameReducer = (
  state: CreateGameState,
  action: CreateGameAction
): CreateGameState => {
  switch (action.type) {
    case 'REQUEST':
      return { ...state, isLoading: true, error: null }
    case 'ERROR':
      return { ...state, isLoading: false, error: action.payload }
    default: {
      const unhandled: never = action

      throw new Error(`Invalid action in createNewGameReducer: ${JSON.stringify(unhandled)}`)
    }
  }
}

export const useCreateNewGame = () => {
  const [state, dispatch] = useReducer(createNewGameReducer, initialState)
  const navigate = useNavigate()

  // A second click can land before the dispatch above has re-rendered the buttons as
  // disabled — state updates are not synchronous, so the UI alone cannot prevent a
  // double start. This ref closes that window.
  const isStartingRef = useRef(false)
  const isMountedRef = useRef(true)

  useEffect(() => {
    // Assign on setup, not just on cleanup. StrictMode runs setup, cleanup, then setup
    // again on mount; without this line the cleanup would leave the flag false forever
    // and every navigation would be silently skipped.
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
    }
  }, [])

  const startNewGame = async (playerCount: number): Promise<void> => {
    if (isStartingRef.current) {
      return
    }

    isStartingRef.current = true
    dispatch({ type: 'REQUEST' })

    try {
      const deckId = await createDeck()
      const codes = await drawCards(deckId, playerCount * NUMBER_OF_CARDS_PER_PLAYER)

      saveGame({
        playerCount,
        hands: chunk(NUMBER_OF_CARDS_PER_PLAYER, codes)
      })

      // Navigation is router-level, not component-level, so an in-flight request could
      // otherwise yank a user who has already left this screen over to /game.
      if (isMountedRef.current) {
        navigate('/game')
      }
    } catch (error) {
      // The player sees one generic line, but swallowing the cause entirely would leave
      // nothing to diagnose a failed deal with.
      console.error('Failed to start a new game', error)
      dispatch({ type: 'ERROR', payload: 'Could not deal a new game. Please try again.' })
    } finally {
      isStartingRef.current = false
    }
  }

  return { ...state, startNewGame }
}
```

- [ ] **Step 2: Verify it type-checks**

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 3: Delete the old hook and commit**

```bash
git rm -f src/hooks/use-create-game.js
git add src/hooks/use-create-game.ts
git commit -m "feat: deal games into localStorage and surface deck errors"
```

---

### Task 8: Common components

**Files:**
- Create: `src/components/common/{wrap,text,button,blank}.tsx` and matching `.module.css`
- Delete: `src/components/common/{wrap,text,button,blank}.js`

**Interfaces:**
- Consumes: `cx` from `@cg/lib/utils`
- Produces:
  - `Wrap` — props `direction`, `align`, `alignSelf`, `justify`, `flex`, `order`, `wrap`, `style`, `onClick`, `className`, `children`
  - `Text` — props `size`, `height`, `color`, `weight`, `align`, `style`, `children`
  - `Button` — props `isDisabled`, `textColor`, `color`, `onClick`, `children`
  - `Blank` — props `width`, `height`

Public prop APIs match the styled-components originals so call sites port unchanged, with
one deliberate exception: `Wrap`'s `wrap` prop becomes a boolean. The original took a raw
string fed straight to `flex-wrap`, and the only call site passed `wrap="wrap"`. Nothing
used `wrap-reverse`, so the boolean carries the same meaning with a narrower type — the
same reasoning as the `align`/`justify` narrowing above. Task 10's Home passes it as the
boolean shorthand `wrap`.

- [ ] **Step 1: Create `src/components/common/wrap.module.css`**

```css
.wrap {
  position: relative;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
}

.dirRow { flex-direction: row; }
.dirRowRev { flex-direction: row-reverse; }
.dirCol { flex-direction: column; }
.dirColRev { flex-direction: column-reverse; }

/*
 * The original ALIGN map fed all six values to all three properties, producing
 * invalid declarations (align-items: space-between, justify-content: stretch) that
 * browsers silently dropped. Only the valid combinations are kept here; the TypeScript
 * unions below are narrowed to match, so a bad value is a compile error rather than a
 * rule the browser ignores. No call site used the dropped combinations.
 */
.alignStart { align-items: flex-start; }
.alignEnd { align-items: flex-end; }
.alignCenter { align-items: center; }
.alignStretch { align-items: stretch; }

.selfStart { align-self: flex-start; }
.selfEnd { align-self: flex-end; }
.selfCenter { align-self: center; }
.selfStretch { align-self: stretch; }

.justifyStart { justify-content: flex-start; }
.justifyEnd { justify-content: flex-end; }
.justifyCenter { justify-content: center; }
.justifyBetween { justify-content: space-between; }
.justifyAround { justify-content: space-around; }

.wrapping { flex-wrap: wrap; }
.clickable { cursor: pointer; }
```

- [ ] **Step 2: Create `src/components/common/wrap.tsx`**

```tsx
import type { CSSProperties, ReactNode } from 'react'

import { cx } from '@cg/lib/utils'

import styles from './wrap.module.css'

export type Direction = 'row' | 'row-rev' | 'col' | 'col-rev'
export type AlignItems = 'start' | 'end' | 'center' | 'stretch'
export type JustifyContent = 'start' | 'end' | 'center' | 'between' | 'around'

const DIRECTION: Record<Direction, string> = {
  'row': styles.dirRow,
  'row-rev': styles.dirRowRev,
  'col': styles.dirCol,
  'col-rev': styles.dirColRev
}

const ALIGN_ITEMS: Record<AlignItems, string> = {
  start: styles.alignStart,
  end: styles.alignEnd,
  center: styles.alignCenter,
  stretch: styles.alignStretch
}

const ALIGN_SELF: Record<AlignItems, string> = {
  start: styles.selfStart,
  end: styles.selfEnd,
  center: styles.selfCenter,
  stretch: styles.selfStretch
}

const JUSTIFY: Record<JustifyContent, string> = {
  start: styles.justifyStart,
  end: styles.justifyEnd,
  center: styles.justifyCenter,
  between: styles.justifyBetween,
  around: styles.justifyAround
}

export const Wrap = ({
  direction = 'row',
  align,
  alignSelf,
  justify,
  flex,
  order,
  wrap = false,
  style,
  className,
  onClick,
  children
}: {
  direction?: Direction
  align?: AlignItems
  alignSelf?: AlignItems
  justify?: JustifyContent
  flex?: number
  order?: number
  wrap?: boolean
  style?: CSSProperties
  className?: string
  onClick?: () => void
  children?: ReactNode
}) => (
  <div
    className={cx(
      styles.wrap,
      DIRECTION[direction],
      align && ALIGN_ITEMS[align],
      alignSelf && ALIGN_SELF[alignSelf],
      justify && JUSTIFY[justify],
      wrap && styles.wrapping,
      onClick && styles.clickable,
      className
    )}
    style={{ flex, order, ...style }}
    onClick={onClick}>
    {children}
  </div>
)
```

`flex` and `order` stay inline: they are numeric and unrelated to the viewport, so they are not a media-query concern.

- [ ] **Step 3: Create `src/components/common/text.tsx` and its stylesheet**

`src/components/common/text.module.css`:

```css
.text {
  font-family: Helvetica;
  font-size: var(--text-size);
  line-height: var(--text-height);
  color: var(--text-color);
  font-weight: var(--text-weight);
}
```

`src/components/common/text.tsx`:

```tsx
import type { CSSProperties, ReactNode } from 'react'

import styles from './text.module.css'

export type TextColor =
  | 'primary'
  | 'secondary'
  | 'white'
  | 'black'
  | 'silver'
  | 'darkSlateGray'

// Exported so button.tsx shares one definition — a second copy is a second place to
// update whenever a colour is added or renamed.
export const COLOR_VARIABLE: Record<TextColor, string> = {
  primary: 'var(--color-primary)',
  secondary: 'var(--color-secondary)',
  white: 'var(--color-white)',
  black: 'var(--color-black)',
  silver: 'var(--color-silver)',
  darkSlateGray: 'var(--color-dark-slate-gray)'
}

export const Text = ({
  size = 16,
  height = 1.6,
  color = 'primary',
  weight = 'normal',
  align,
  style,
  children
}: {
  size?: number | string
  height?: number
  color?: TextColor
  weight?: number | string
  align?: CSSProperties['textAlign']
  style?: CSSProperties
  children?: ReactNode
}) => (
  <div
    className={styles.text}
    style={{
      '--text-size': typeof size === 'number' ? `${size}px` : size,
      '--text-height': height,
      '--text-color': COLOR_VARIABLE[color],
      '--text-weight': weight,
      textAlign: align,
      ...style
    } as CSSProperties}>
    {children}
  </div>
)
```

- [ ] **Step 4: Create `src/components/common/button.tsx` and its stylesheet**

`src/components/common/button.module.css`:

```css
.button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 40px;
  border: 2px solid var(--color-white);
  border-radius: 10px;
  font-size: 1em;
  margin: 1em;
  text-transform: uppercase;
  font-weight: 600;
  background-color: var(--button-bg);
  color: var(--button-fg);
  cursor: pointer;
}

.button:disabled {
  opacity: 0.6;
  cursor: auto;
}
```

`src/components/common/button.tsx`:

```tsx
import type { CSSProperties, ReactNode } from 'react'

import { COLOR_VARIABLE, type TextColor } from '@cg/components/common/text'

import styles from './button.module.css'

export const Button = ({
  isDisabled = false,
  textColor = 'secondary',
  color = 'primary',
  onClick,
  children
}: {
  isDisabled?: boolean
  textColor?: TextColor
  color?: TextColor
  onClick?: () => void
  children?: ReactNode
}) => (
  <button
    type="button"
    className={styles.button}
    disabled={isDisabled}
    style={{
      '--button-bg': COLOR_VARIABLE[color],
      '--button-fg': COLOR_VARIABLE[textColor]
    } as CSSProperties}
    onClick={onClick}>
    {children}
  </button>
)
```

- [ ] **Step 5: Create `src/components/common/blank.tsx`**

```tsx
export const Blank = ({
  width = 0,
  height = 0
}: {
  width?: number
  height?: number
}) => (
  <div
    style={width
      ? { paddingRight: width }
      : { paddingTop: height }
    }
  />
)
```

This reproduces the original's behaviour exactly, including that a non-zero `width` wins over `height`.

- [ ] **Step 6: Verify and commit**

```bash
npm run typecheck && npm run lint
```

Expected: both exit 0.

```bash
git rm -f src/components/common/wrap.js src/components/common/text.js \
  src/components/common/button.js src/components/common/blank.js
git add src/components/common
git commit -m "feat: port common components to CSS Modules"
```

---

### Task 9: Card presentation

Where `with-window-size` actually dies. Card sizing and overlap become CSS entirely.

**Files:**
- Create: `src/components/card.tsx` + `card.module.css`, `src/components/players-cards.tsx` + `players-cards.module.css`, `src/components/community-cards.tsx` + `community-cards.module.css`
- Delete: `src/components/{card,players-cards,community-cards}.js`, `src/hooks/with-window-size.js`

**Interfaces:**
- Consumes: `Card` type; `usePlayGameContext`; `range` from `@cg/lib/utils`
- Produces:
  - `Card` component — props `card`, `isFlipped?`, `onCardClick?`
  - `PlayersCards` — props `cards`, `areCardsFlipped?`, `hasBorder?`, `isStacked?`, `onCardClick?`
  - `CommunityCards` — no props; reads context

- [ ] **Step 1: Create `src/components/card.module.css`**

```css
.card {
  width: var(--card-w);
  height: var(--card-h);
  box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2);
  transition: 0.3s;
}

.card:hover,
.card:active {
  box-shadow: 0 8px 16px 0 rgba(0, 0, 0, 0.2);
}

.clickable {
  cursor: pointer;
}
```

- [ ] **Step 2: Create `src/components/card.tsx`**

```tsx
import { cx } from '@cg/lib/utils'
import type { Card as CardType } from '@cg/types'

import styles from './card.module.css'

export const Card = ({
  card,
  isFlipped = false,
  onCardClick
}: {
  card: CardType
  isFlipped?: boolean
  onCardClick?: (card: CardType) => void
}) => (
  <img
    className={cx(styles.card, onCardClick && styles.clickable)}
    src={isFlipped
      ? `${import.meta.env.BASE_URL}card-back.jpeg`
      : card.img
    }
    alt={`Card ${card.id}`}
    onClick={onCardClick
      ? () => onCardClick(card)
      : undefined
    }
  />
)
```

The original avoided optional chaining here so that non-clickable cards do not get `cursor: pointer`; the `clickable` class preserves that intent.

- [ ] **Step 3: Create `src/components/players-cards.module.css`**

```css
.hand {
  position: relative;
  display: flex;
  width: fit-content;
  height: var(--card-h);
  border-radius: 8px;
}

/* Overlap: each card after the first slides back so only --card-stick shows. */
.hand > * + * {
  margin-left: calc(var(--card-stick) - var(--card-w));
}

/*
 * Won cards sit fully stacked on top of one another, in a box that is always exactly
 * one card wide. The explicit width reproduces the original's `totalWidth={cardWidth}`:
 * the pile keeps its full-size outline even while empty, which is how every player's
 * table looks before the first trick is won. Do not replace this with fit-content.
 */
.stacked {
  width: var(--card-w);
}

.stacked > * + * {
  margin-left: calc(-1 * var(--card-w));
}

.bordered {
  border: 2px solid var(--color-white);
}
```

`width: fit-content` plus the negative margins replaces the original's `totalWidth` arithmetic — the container now measures itself.

- [ ] **Step 4: Create `src/components/players-cards.tsx`**

```tsx
import { Card } from '@cg/components/card'
import { cx } from '@cg/lib/utils'
import type { Card as CardType } from '@cg/types'

import styles from './players-cards.module.css'

export const PlayersCards = ({
  cards,
  areCardsFlipped = false,
  hasBorder = false,
  isStacked = false,
  onCardClick
}: {
  cards: CardType[]
  areCardsFlipped?: boolean
  hasBorder?: boolean
  isStacked?: boolean
  onCardClick?: (card: CardType) => void
}) => (
  <div className={cx(styles.hand, isStacked && styles.stacked, hasBorder && styles.bordered)}>
    {cards.map(card => (
      <Card
        key={card.id}
        isFlipped={areCardsFlipped}
        card={card}
        onCardClick={onCardClick}
      />
    ))}
  </div>
)
```

- [ ] **Step 5: Create `src/components/community-cards.module.css`**

```css
.community {
  position: relative;
  display: flex;
  width: fit-content;
  height: var(--card-h);
}

/*
 * content-box is deliberate: it reproduces the original styled-components sizing,
 * where the 3px border sat outside the declared width. Empty slots really are 6px
 * wider than filled ones — a quirk of the original, kept for a faithful port.
 */
.slot {
  box-sizing: content-box;
  width: var(--card-w);
  height: var(--card-h);
  border: 3px solid var(--color-white);
  border-radius: 8px;
}

.empty {
  width: calc(var(--card-w) + 6px);
}
```

- [ ] **Step 6: Create `src/components/community-cards.tsx`**

```tsx
import { Card } from '@cg/components/card'
import { usePlayGameContext } from '@cg/hooks/use-play-game'
import { cx, range } from '@cg/lib/utils'

import styles from './community-cards.module.css'

export const CommunityCards = () => {
  const game = usePlayGameContext()
  const emptySlots = range(0, game.numberOfPlayers - game.community.length)

  return (
    <div className={styles.community}>
      {game.community.map(card => (
        <div key={card.id} className={styles.slot}>
          <Card card={card} />
        </div>
      ))}
      {emptySlots.map(slot => (
        <div key={slot} className={cx(styles.slot, styles.empty)} />
      ))}
    </div>
  )
}
```

- [ ] **Step 7: Delete `with-window-size` and verify**

```bash
git rm -f src/hooks/with-window-size.js src/components/card.js \
  src/components/players-cards.js src/components/community-cards.js
npm run typecheck && npm run lint
```

Expected: both exit 0. Confirm nothing references the deleted hook:

```bash
grep -rn "with-window-size\|withWindowSize\|mapSizesToProps" src/ || echo "clean"
```

Expected: `clean`.

- [ ] **Step 8: Commit**

```bash
git add src/components
git commit -m "feat: size cards with CSS custom properties, removing with-window-size"
```

---

### Task 10: Table, players, modal, pages and routing

Brings the app back to life end to end.

**Files:**
- Create: `src/components/playing-table.tsx` + `.module.css`, `src/components/name-and-points.tsx` + `.module.css`, `src/components/player.tsx` + `.module.css`, `src/components/modal.tsx` + `.module.css`, `src/pages/home.tsx`, `src/pages/game.tsx` + `game.module.css`
- Modify: `src/app.tsx`
- Delete: `src/components/{playing-table,name-and-points,player,modal}.js`, `src/pages/{home,game}.js`

**Interfaces:**
- Consumes: everything from Tasks 2–9
- Produces: `App` with routes `/` and `/game`

- [ ] **Step 1: Create the playing table**

`src/components/playing-table.module.css`:

```css
.table {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: var(--color-green);
  border: 10px solid var(--color-primary);
  padding: 20px;
}

@media (min-width: 1200px) {
  .table[data-many-players='true'] {
    align-items: stretch;
  }
}
```

`src/components/playing-table.tsx`:

```tsx
import type { ReactNode } from 'react'

import styles from './playing-table.module.css'

export const PlayingTable = ({
  hasManyPlayers = false,
  children
}: {
  hasManyPlayers?: boolean
  children?: ReactNode
}) => (
  <div className={styles.table} data-many-players={hasManyPlayers}>
    {children}
  </div>
)
```

- [ ] **Step 2: Create the name-and-points strip**

`src/components/name-and-points.module.css`:

```css
.nameTag {
  display: flex;
  justify-content: space-between;
  align-self: stretch;
  background: var(--color-name-tag);
  padding: 10px;
  border-radius: 5px;
}

.leading {
  background: var(--color-name-tag-lead);
}
```

`src/components/name-and-points.tsx`:

```tsx
import { Text } from '@cg/components/common/text'
import { cx } from '@cg/lib/utils'
import type { Player } from '@cg/types'

import styles from './name-and-points.module.css'

export const NameAndPoints = ({
  player,
  isPlayerLeading
}: {
  player: Player
  isPlayerLeading: boolean
}) => (
  <div className={cx(styles.nameTag, isPlayerLeading && styles.leading)}>
    <Text weight="bold">{`Name: ${player.name}`}</Text>
    <Text weight="bold">{`Score: ${player.score}`}</Text>
  </div>
)
```

- [ ] **Step 3: Create the player component**

`src/components/player.module.css`:

```css
.player {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.hands {
  display: flex;
}

.wonCards {
  margin-left: 10px;
}

/* Replaces shouldShowWonCards (ww >= 400) from mapSizesToProps. */
@media (max-width: 399px) {
  .wonCards {
    display: none;
  }
}
```

The original also shifted the won-cards group by `10 + (10 - remainingCards.length) * cardStickingOutPx` to clear the shrinking hand. That is no longer needed: the hand is `width: fit-content`, so it already shrinks as cards are played and a flat `10px` gap is correct.

`src/components/player.tsx`:

```tsx
import { Blank } from '@cg/components/common/blank'
import { NameAndPoints } from '@cg/components/name-and-points'
import { PlayersCards } from '@cg/components/players-cards'
import { USERS_POSITION } from '@cg/constants'
import { usePlayGameContext } from '@cg/hooks/use-play-game'
import type { Player as PlayerType } from '@cg/types'

import styles from './player.module.css'

export const Player = ({ player }: { player?: PlayerType }) => {
  const game = usePlayGameContext()

  if (!player) {
    return <div className={styles.player} />
  }

  const canDiscard = player.id === USERS_POSITION && game.canUserPlay

  return (
    <div className={styles.player}>
      <Blank height={20} />
      <NameAndPoints
        player={player}
        isPlayerLeading={game.getIsPlayerLeading(player)}
      />
      <Blank height={20} />
      <div className={styles.hands}>
        <PlayersCards
          cards={player.remainingCards}
          areCardsFlipped={player.id !== USERS_POSITION}
          onCardClick={canDiscard ? game.discardACard : undefined}
        />
        <div className={styles.wonCards}>
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

- [ ] **Step 4: Create the end-of-game modal**

`src/components/modal.module.css`:

```css
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  z-index: -9999;
}

.overlay[data-open='true'] {
  z-index: 9999;
}

.content {
  position: fixed;
  top: 50%;
  left: 50%;
  width: 500px;
  max-width: calc(100vw - 10px);
  height: auto;
  background: var(--color-white);
  border: 1px solid #ccc;
  transition: 1.1s ease-out;
  box-shadow: -32px 0 0 rgba(0, 0, 0, 0.2);
  filter: blur(8px);
  transform: scale(0.33) translate(-50%, -50%);
  opacity: 0;
  visibility: hidden;
}

.content[data-open='true'] {
  box-shadow: 16px 32px 32px rgba(0, 0, 0, 0.2);
  filter: blur(0);
  transform: scale(1) translate(-50%, -50%);
  opacity: 1;
  visibility: visible;
}

.rows {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.row {
  display: flex;
  flex-direction: column;
}
```

`src/components/modal.tsx`:

```tsx
import { useNavigate } from 'react-router'

import { Blank } from '@cg/components/common/blank'
import { Button } from '@cg/components/common/button'
import { Text } from '@cg/components/common/text'
import { NUMBER_OF_CARDS_PER_PLAYER } from '@cg/constants'
import { usePlayGameContext } from '@cg/hooks/use-play-game'

import styles from './modal.module.css'

export const Modal = () => {
  const navigate = useNavigate()
  const game = usePlayGameContext()

  const isOpen = game.roundNumber > NUMBER_OF_CARDS_PER_PLAYER
  const winners = game.gameLeads.map(lead => lead.name).join(' & ')

  return (
    <div className={styles.overlay} data-open={isOpen}>
      <div className={styles.content} data-open={isOpen}>
        <div className={styles.rows}>
          <Blank height={20} />
          <Text size={20} weight="bold">
            {game.gameLeads.length > 1
              ? `It's a tie — ${winners} win!`
              : `${winners} wins!`
            }
          </Text>
          <Blank height={20} />
          <Text size={16} color="silver">Final scores</Text>
          <Blank height={10} />
          {game.playersSortedByPoints.map(player => (
            <div key={player.id} className={styles.row}>
              <Blank height={10} />
              <Text
                size={18}
                weight="bold"
                color="silver">
                {`${player.name} - ${player.score} points`}
              </Text>
              <Blank height={10} />
            </div>
          ))}
          <Blank height={20} />
          <Button onClick={() => navigate('/')}>NEW GAME</Button>
        </div>
      </div>
    </div>
  )
}
```

This is approved fix §8.2: the heading now names the winners and the list is explicitly labelled "Final scores", so the two agree.

- [ ] **Step 5: Create the home page**

`src/pages/home.tsx`:

```tsx
import { Blank } from '@cg/components/common/blank'
import { Button } from '@cg/components/common/button'
import { Text } from '@cg/components/common/text'
import { Wrap } from '@cg/components/common/wrap'
import { PlayingTable } from '@cg/components/playing-table'
import { MAX_PLAYERS, MIN_PLAYERS } from '@cg/constants'
import { useCreateNewGame } from '@cg/hooks/use-create-game'
import { range } from '@cg/lib/utils'

export const Home = () => {
  const { isLoading, error, startNewGame } = useCreateNewGame()

  return (
    <PlayingTable>
      <Wrap direction="col" align="center">
        <Text size={30} align="center">Select Number Of Players</Text>
        <Blank height={50} />
        <Wrap align="center" justify="center" wrap>
          {range(MIN_PLAYERS, MAX_PLAYERS + 1).map(count => (
            <Wrap key={count}>
              <Blank width={20} />
              <Button
                onClick={() => void startNewGame(count)}
                textColor="darkSlateGray"
                isDisabled={isLoading}>
                {`${count} Players`}
              </Button>
              <Blank width={20} />
            </Wrap>
          ))}
        </Wrap>
        {isLoading
          ? <Text size={18} color="white">Dealing…</Text>
          : null
        }
        {error
          ? <Text size={18} color="white">{error}</Text>
          : null
        }
      </Wrap>
    </PlayingTable>
  )
}
```

- [ ] **Step 6: Create the game layout stylesheet**

`src/pages/game.module.css`:

```css
.board {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  max-width: 1400px;
}

.colA,
.colC {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
}

.colB {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
}

.colA { order: 2; }
.colB { order: 1; }
.colC { order: 3; }

/* Replaces isLargeScreen (ww >= 1200) from mapSizesToProps. */
@media (min-width: 1200px) {
  .board {
    flex-direction: column-reverse;
  }

  .colA { order: 1; }
  .colB { order: 2; }

  .spacer { display: none; }

  .board[data-many-players='true'] {
    flex-direction: row;
    align-items: stretch;
  }

  .board[data-many-players='true'] .colA {
    flex-direction: column-reverse;
  }
}
```

- [ ] **Step 7: Create the game page**

`src/pages/game.tsx`:

```tsx
import { Navigate } from 'react-router'

import { Blank } from '@cg/components/common/blank'
import { CommunityCards } from '@cg/components/community-cards'
import { Modal } from '@cg/components/modal'
import { Player } from '@cg/components/player'
import { PlayingTable } from '@cg/components/playing-table'
import { PlayGameContextProvider, usePlayGame } from '@cg/hooks/use-play-game'
import { loadGame } from '@cg/lib/storage'
import type { StoredGame } from '@cg/lib/storage'

import styles from './game.module.css'

const Board = ({ game: stored }: { game: StoredGame }) => {
  const game = usePlayGame({
    playerCount: stored.playerCount,
    hands: stored.hands
  })

  return (
    <PlayGameContextProvider value={game}>
      <PlayingTable hasManyPlayers={game.hasMoreThanTwoPlayers}>
        <div className={styles.board} data-many-players={game.hasMoreThanTwoPlayers}>
          <div className={styles.colA}>
            <Player player={game.players[0]} />
            <Blank height={40} />
            <Player player={game.players[1]} />
          </div>
          <div className={styles.colB}>
            <CommunityCards />
            <div className={styles.spacer}>
              <Blank height={20} />
            </div>
          </div>
          {game.hasMoreThanTwoPlayers
            ? <div className={styles.colC}>
              <Player player={game.players[2]} />
              <Blank height={40} />
              <Player player={game.players[3]} />
            </div>
            : null
          }
        </div>
      </PlayingTable>
      <Modal />
    </PlayGameContextProvider>
  )
}

export const Game = () => {
  const stored = loadGame()

  if (!stored) {
    return <Navigate to="/" replace />
  }

  return <Board game={stored} />
}
```

`Game` reads storage and `Board` owns the hook, so `usePlayGame` is never called before the deal is known to exist — hooks cannot run conditionally.

- [ ] **Step 8: Replace `src/app.tsx`**

```tsx
import { BrowserRouter, Route, Routes } from 'react-router'

import { Game } from '@cg/pages/game'
import { Home } from '@cg/pages/home'

export const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/game" element={<Game />} />
    </Routes>
  </BrowserRouter>
)
```

- [ ] **Step 9: Delete the superseded files and verify**

```bash
git rm -f src/components/playing-table.js src/components/name-and-points.js \
  src/components/player.js src/components/modal.js \
  src/pages/home.js src/pages/game.js
npm run typecheck && npm run lint && npm test && npm run build
```

Expected: all four exit 0.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: port table, players, modal and pages with media-query layout"
```

---

### Task 11: Cleanup and full verification

**Files:**
- Modify: `eslint.config.js`, `README.md`
- Delete: any remaining `src/**/*.js`

**Interfaces:**
- Consumes: everything
- Produces: a verified, alert-free build

- [ ] **Step 1: Confirm no legacy JavaScript remains**

```bash
find src -name '*.js' -o -name '*.jsx' | sort
```

Expected: no output. If anything is listed, port or delete it before continuing.

- [ ] **Step 2: Drop the transitional ESLint ignore**

In `eslint.config.js`, change the ignores line from:

```js
  { ignores: ['dist', 'node_modules', 'src/**/*.js'] },
```

to:

```js
  { ignores: ['dist', 'node_modules'] },
```

- [ ] **Step 3: Confirm the forbidden packages are gone**

```bash
grep -nE '"(ramda|axios|styled-components|prop-types|web-vitals|react-scripts)"' package.json || echo "clean"
```

Expected: `clean`.

```bash
node -e "const p=require('./package.json'); const d=Object.keys(p.dependencies); console.log(d); if (d.length !== 3) { throw new Error('expected exactly 3 runtime deps, got ' + d.length) }"
```

Expected: `[ 'react', 'react-dom', 'react-router' ]`.

- [ ] **Step 4: Confirm absolute imports are used throughout**

```bash
grep -rnE "from '\.\./" src/ || echo "no parent-relative imports"
grep -rnE "from '\./" src/ | grep -v '\.module\.css' || echo "no sibling imports outside CSS modules"
```

Expected: both fallback messages.

- [ ] **Step 5: Run the full verification suite**

```bash
npm run typecheck && npm run lint && npm test && npm run build && npm audit
```

Expected: all exit 0, and `npm audit` reports **0 vulnerabilities**. This is the goal that motivated the rewrite — do not declare the task done without this output.

- [ ] **Step 6: Manual verification**

```bash
npm run dev
```

Check each of these against `http://localhost:5173`:

- Start a 2-player game; play a card; the opponent responds after ~1s; the pot is awarded.
- Start a 3-player and a 4-player game; the layout gains a third column at ≥1200px.
- Play a game to completion (10 rounds); the modal opens, names the winner, and lists all players' final scores.
- In DevTools → Application → Local Storage, confirm the `cg.g` value shows no readable card codes.
- Refresh `/game`; the same deal restarts from round 1.
- Delete the `cg.g` key and reload `/game`; it redirects to `/`.
- Resize through 375px, 800px, 1280px and 1600px: cards are small, large, small, large respectively; won cards disappear below 400px.
- Block network requests and click a player-count button; the error message appears.

- [ ] **Step 7: Update `README.md`**

```markdown
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
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: remove transitional lint ignore and document the new toolchain"
```

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
| --- | --- |
| §1 Toolchain, TS 6.0.3 constraint, Node | Task 1 |
| §2 `@cg/` imports | Task 1 (config), Task 11 Step 4 (enforcement) |
| §3 File layout, `variables.js` dissolution | Tasks 1, 3, 8 (`ALIGN`/`DIRECTION` → `wrap.module.css`) |
| §4 Media queries, deleted layout arithmetic | Tasks 1, 9, 10 |
| §5 ramda removal | Task 2 (own utils), Tasks 6–10 (native replacements) |
| §6 Token map, storage, routing, persistence scope | Tasks 3, 4, 7, 10 |
| §7 Types, exhaustiveness, guarded context | Tasks 3, 6 |
| §8.1 dead loading branch | Task 10 Step 7 (no `isDealingCards` in the port) |
| §8.2 modal heading | Task 10 Step 4 |
| §8.3 retraction + property test | Task 6 |
| §8.4 silent API failure | Task 7 |
| §9 Tests incl. `localStorage` stub | Tasks 2–6 |
| §11 Verification | Task 11 |

**Known deviations from the spec, both deliberate:**

1. `cx` is a fourth util beyond the spec's `range`/`replaceAt`/`chunk`. CSS Modules need class-name joining; writing four lines is preferable to adding a `classnames` dependency.
2. The reducer lives in `hooks/use-play-game.tsx` (exported for tests) rather than a separate `lib/game.ts`. This matches the spec's stated file layout and keeps the test import path the spec names.

**Type consistency check:** `StoredGame.playerCount` / `.hands` are used identically in Tasks 4, 7 and 10. `PlayGameValue` members consumed in Tasks 9 and 10 (`numberOfPlayers`, `community`, `canUserPlay`, `discardACard`, `getIsPlayerLeading`, `hasMoreThanTwoPlayers`, `playersSortedByPoints`, `gameLeads`, `roundNumber`, `players`) all appear in its Task 6 definition. `TextColor` is defined in `text.tsx` and imported by `button.tsx`. `PlayersCards` props (`cards`, `areCardsFlipped`, `hasBorder`, `isStacked`, `onCardClick`) match between Task 9's definition and Task 10's usage.
