# Card Game — UI/UX Overhaul Design

**Date:** 2026-08-11
**Status:** Approved (pending spec review)
**Builds on:** `docs/superpowers/specs/2026-08-06-typescript-rewrite-design.md`

## Motivation

The TypeScript rewrite preserved the old game's behaviour exactly, including its 2022 chrome. The result reads as a real card game — the green felt and photographic cards do a lot of work — but the surface is dated and the table gives almost no feedback. You cannot tell whose turn it is, cards that look clickable silently aren't, the pot vanishes without explanation, scores snap, and there is no way to know how far through a game you are.

This overhaul keeps what works and fixes what the table fails to say.

**Kept, deliberately:** the green felt, the photographic card faces, and the overall column layout with its verified media-query matrix.

**Replaced:** the gold-and-blue chrome, the flat background, the absence of motion, and the absence of feedback.

## Goals

- Make the table say what it wants from the player at all times.
- Make winning a round legible rather than instantaneous.
- Modernise the surface without flattening the realism.
- Make the game playable without a mouse.

## Non-Goals

- No change to game rules, scoring, or the reducer's decision logic.
- No layout re-architecture — the responsive matrix stays as verified.
- No new runtime dependency. Runtime dependencies remain exactly `react`, `react-dom`, `react-router`.
- No webfont.

---

## 1. The constraint that shapes the work

`playGameReducer` is pure and pinned by a property test playing 900 seeded games against ground truth. **Motion and feedback are view-layer concerns and must not alter its decisions.** Everything the UI needs is already exposed: `activePlayerId`, `canUserPlay`, `roundNumber`, `players`, `community`, `gameLeads`.

Two changes touch non-view code, both deliberate and both listed here so they are not mistaken for drift:

1. `TIME_BETWEEN_PLAYS_MS` becomes **650** (was 1000). See §3.
2. `GameState` gains **`lastRoundWinnerId: number | null`**, set by `HANDLE_ROUND_COMPLETED`, `null` initially. This is additive — no existing assertion changes, and no decision depends on it. It exists because the pot ceremony (§4) must animate toward the winner, and after the round settles the winner is otherwise unrecoverable from state. Reconstructing it in the view by diffing scores would be fragile.

The property test must continue to pass unchanged. If it fails, the change is wrong.

---

## 2. Visual system

All tokens live in `src/styles/theme.css` as custom properties. No component hardcodes a colour.

### Palette

| Token | Value | Use |
| --- | --- | --- |
| `--surface-0` | `#0d0f0e` | page background |
| `--surface-1` | `#14181a` | panels, modal |
| `--surface-2` | `rgba(255,255,255,0.06)` | nameplates, inset panels |
| `--felt-lit` | `#2b8a10` | felt centre |
| `--felt-base` | `#1e6b03` | felt mid — the existing green, kept |
| `--felt-edge` | `#123f03` | felt vignette |
| `--rail` | `rgba(201,162,39,0.35)` | hairline rail |
| `--text-hi` | `#f2efe6` | primary text |
| `--text-lo` | `#a9a49a` | secondary text |
| `--accent` | `#c9a227` | muted gold, used sparingly |
| `--accent-soft` | `rgba(201,162,39,0.16)` | lead highlight fill |
| `--danger` | `#e0705a` | error message |

The old `#daa520` gold and `#255adf` blue are removed entirely.

### Felt

```css
background:
  radial-gradient(ellipse 90% 70% at 50% 38%,
    var(--felt-lit) 0%,
    var(--felt-base) 45%,
    var(--felt-edge) 100%);
```

The 10px gold border becomes a 1px `--rail` hairline plus an outer shadow for depth. The page behind is `--surface-0`, so the lit table reads as a spotlit object.

### Type

System stack only — no webfont, no bundle cost:

```css
--font-ui: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
--font-display: ui-serif, Georgia, 'Times New Roman', serif;
```

`--font-display` is used only for the modal's winner heading. Scores and any changing number use `font-variant-numeric: tabular-nums` so digits do not jitter while counting.

Scale: `--fs-xs 12px`, `--fs-sm 14px`, `--fs-base 16px`, `--fs-lg 20px`, `--fs-xl 28px`, `--fs-2xl 40px`.

### Motion tokens

| Token | Value | Use |
| --- | --- | --- |
| `--dur-fast` | `140ms` | hover, focus |
| `--dur-base` | `240ms` | panel and state transitions |
| `--dur-card` | `300ms` | a card arriving in the community |
| `--dur-pot` | `420ms` | the pot travelling to the winner |
| `--ease-out` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | all of the above |

---

## 3. Pacing

`TIME_BETWEEN_PLAYS_MS` drops from 1000 to **650**. A card takes `--dur-card` (300ms) to arrive, leaving ~350ms of dwell before the next play.

A four-player game currently spends about 50 seconds waiting. At 650ms that becomes about 32 seconds, and the wait is filled rather than empty. The timing constant is the only pacing control; nothing else reads it.

---

## 4. Motion

### Cards arriving — animate arrival, not the journey

The obvious technique is FLIP: measure a card's position in the hand, measure it in the community, transform between. It is rejected here. The two positions live in different DOM subtrees, so FLIP needs refs, layout measurement and teardown on every play, and the View Transitions API is unavailable because the build targets Safari 14.

Instead, a card entering the community animates **in from the direction of the seat that played it** — translate, fade and a slight rotation — using a CSS custom property for the origin offset. No measurement, no refs, pure keyframes.

The seat is known without extra state: within a round, players discard in `activePlayerId` order starting at 0, so `community[i]` was played by player `i`. `CommunityCards` sets `--from-x` / `--from-y` per slot from that index.

### The pot ceremony

When a round settles, three things happen in sequence:

1. The winning card is briefly highlighted (a short `--accent` glow).
2. The pile travels toward the winner's seat and fades, over `--dur-pot`.
3. The winner's won-stack pulses once and their score counts up.

`HANDLE_ROUND_COMPLETED` empties `community` in the same dispatch that awards it, so the pile is gone before it can animate out. `CommunityCards` therefore captures the outgoing pile: when `community` transitions from non-empty to empty, it renders the previous contents as a non-interactive ghost for `--dur-pot`, then drops it. Direction comes from `lastRoundWinnerId` (§1).

### Score count-up

`useCountUp(value, duration)` animates between the previous and current value with `requestAnimationFrame`. Under reduced motion it returns the target immediately.

### Reduced motion

A single `@media (prefers-reduced-motion: reduce)` block sets every motion token to `1ms` and disables transforms. `useCountUp` checks the same preference via `matchMedia` and skips animating. Nothing becomes unusable — only instantaneous.

---

## 5. Feedback

### Turn state

The active seat's nameplate lifts: brighter surface, a soft `--accent` ring, and a small **"Your turn"** cue on the user's own seat when `canUserPlay` is true. Inactive seats sit at reduced opacity. All derived from `activePlayerId` and `canUserPlay` — no new state.

### Playable cards

Today, during the delay after a play, the user's cards still look clickable but do nothing. Cards now carry an explicit playable state: full opacity with a hover lift when playable, dimmed with `pointer-events: none` when not. The rule is exactly the existing `player.id === USERS_POSITION && canUserPlay`.

### Round progress

A small `Round 4 / 10` indicator above the table, from `roundNumber` and `NUMBER_OF_CARDS_PER_PLAYER`. There is currently no way to know how far through a game you are.

---

## 6. Sound

Three cues, played through a small `src/lib/sound.ts`:

| File | When | Target length |
| --- | --- | --- |
| `public/sounds/deal.wav` | a new game is dealt | ≤ 700ms |
| `public/sounds/play.wav` | any card is played | ≤ 200ms |
| `public/sounds/win.wav` | a round is won | ≤ 900ms |

WAV rather than MP3 so the placeholder files can be generated directly from raw PCM with
no encoder. The three paths are declared in one array in `sound.ts`, so swapping to `.mp3`
or `.ogg` later is a one-line change — every browser this targets plays all three.

**Muted by default**, with a toggle pinned to the top-right of the table surface on **both** routes — the deal cue fires on the home screen, so the control has to be reachable there — and the preference persisted under `cg.sound` (separate key from `cg.g`, so clearing a game does not reset it).

The module preloads via `new Audio()`, plays by cloning the element so overlapping plays do not cut each other off, and **fails silently** if a file is missing, if autoplay policy blocks it, or if `Audio` is unavailable — sound is never allowed to break the game. This also makes it testable in the node environment, where `Audio` does not exist.

**On the assets:** these are the licensed-content boundary. The implementation ships generated placeholder WAVs so the feature works immediately without waiting on sourcing, and the files can be replaced with better recordings at any time without touching code. Keep each under ~60 KB (a sub-second mono WAV at 22 kHz is roughly that); normalise to about −16 LUFS so the cues sit under the UI rather than over it.

---

## 7. Accessibility

Cards are currently bare `<img>` elements with an `onClick`. The game cannot be played without a mouse, and a screen reader sees nothing meaningful.

- **Every card in the user's own hand** is a `<button>` wrapping the image, with an `aria-label` naming it ("Seven of Spades"). When it is not the user's turn those buttons are `disabled` rather than removed — the hand keeps a stable structure, and focus is never yanked mid-play. Opponent and community cards stay non-interactive `<img>` with `alt=""` and `aria-hidden`, since they are decorative relative to the announcements below.
- The user's hand is a **roving tabindex** group: one tab stop, arrow keys move between cards, Enter or Space plays. Focus is visible — a 2px `--accent` ring, never `outline: none` without a replacement.
- An `aria-live="polite"` region announces plays and outcomes: *"You played Seven of Spades"*, *"Player 2 wins the round with King of Hearts, 31 points"*, *"Game over. You win with 84 points."*
- The sound toggle is a labelled button with `aria-pressed`.

Focus rings and the live region are not optional extras here — they are the difference between the game being operable and not.

---

## 8. Modal and menu

Both were explicitly called out as needing work.

**Modal.** Currently a white panel with a blur-and-scale transition. Becomes a `--surface-1` panel on a dimmed, backdrop-blurred page: the winner's name in `--font-display` at `--fs-xl`, the final scores below as a clean rows table with tabular figures and the winner's row marked in `--accent-soft`. It keeps its current always-mounted, `data-open` driven mechanism — that was verified to not intercept clicks when closed, and there is no reason to change it. It gains a focus trap and Escape-to-dismiss, since it is a real dialog: `role="dialog"`, `aria-modal="true"`, focus moved to it on open and restored on close.

**Menu (home).** Currently three uppercase gold buttons floating on the felt. Becomes a centred panel on the spotlit table: a display-type title, a short line of instruction, and three player-count buttons as a segmented row with clear hover, active and focus states. Loading and error states get proper treatment rather than a bare line of text — the button row disables as a unit while dealing, with a small inline spinner, and the error appears in `--danger` beneath it.

---

## 9. File inventory

| Path | Change |
| --- | --- |
| `src/styles/theme.css` | rewritten — palette, type, motion tokens, reduced-motion block |
| `src/constants.ts` | `TIME_BETWEEN_PLAYS_MS` 1000 → 650 |
| `src/types.ts` | `GameState.lastRoundWinnerId` |
| `src/hooks/use-play-game.tsx` | set `lastRoundWinnerId`; no other change |
| `src/hooks/use-count-up.ts` | new + test |
| `src/hooks/use-sound.ts` | new — toggle state, persistence |
| `src/lib/sound.ts` | new + test |
| `src/components/card.tsx` + css | button semantics, focus, playable state |
| `src/components/players-cards.tsx` + css | roving tabindex |
| `src/components/community-cards.tsx` + css | arrival animation, exiting ghost pile |
| `src/components/player.tsx` + css | turn state, won-stack pulse |
| `src/components/name-and-points.tsx` + css | restyle, count-up, turn ring |
| `src/components/playing-table.tsx` + css | felt gradient, rail, vignette |
| `src/components/modal.tsx` + css | restyle, dialog semantics, focus trap |
| `src/components/round-progress.tsx` + css | new |
| `src/components/sound-toggle.tsx` + css | new |
| `src/components/live-region.tsx` | new — `aria-live` announcements |
| `src/pages/home.tsx` + css | restyle, loading and error states |
| `src/pages/game.tsx` + css | mount round progress, sound toggle, live region |
| `public/sounds/*.mp3` | new assets |

---

## 10. Testing

The existing 64 tests must continue to pass, the property test unchanged.

New logic-only tests:

| File | Coverage |
| --- | --- |
| `hooks/use-count-up.test.ts` | interpolation maths at t=0, midpoint and t=1; returns the target immediately when reduced motion is set |
| `lib/sound.test.ts` | preference round-trips through storage; `play()` is a no-op and does not throw when `Audio` is undefined, when a file is missing, and when playback rejects |
| `hooks/use-play-game.test.ts` | extended: `lastRoundWinnerId` matches the awarded player; is `null` before any round settles |

Adding a required field to `GameState` ripples into every full state literal — notably the
`stateWith` helper in `use-play-game.test.ts` and the smoke tests. That is a compile error,
not a silent failure, so `tsc` will list each site.

Render smoke tests in `pages/pages.test.ts` extend to cover: the round-progress indicator renders the current round; the user's playable cards render as `<button>` while opponent cards do not; the modal names the winner.

Motion itself is not unit-tested — it is CSS, and asserting keyframes would test the stylesheet rather than behaviour. It is covered by the manual pass.

---

## 11. Verification

- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` all clean; `npm audit` still 0 vulnerabilities.
- Runtime dependencies still exactly three.
- Manual pass, in addition to the rewrite's §11 list:
  - whose turn it is, is obvious at a glance, at every player count
  - a played card visibly travels from its owner's side
  - the pot visibly goes to the winner, and their score counts rather than snaps
  - the round indicator advances 1 → 10
  - the whole game is playable with keyboard only, focus always visible
  - with OS "reduce motion" enabled, nothing animates and nothing breaks
  - with sound enabled, cues fire and never overlap harshly; muted is genuinely silent
  - modal traps focus, Escape closes, focus returns to the table
