/// <reference types="vite/client" />

/*
 * Vite's own client types already declare `*.module.css`, but that declaration only
 * reaches the compiler if the editor resolves `vite/client` the same way the CLI does —
 * and editors running their own bundled TypeScript often do not, which shows up as
 * "Cannot find module './x.module.css'" in the IDE while `npm run typecheck` passes.
 *
 * Declaring the `@cg/`-prefixed form here removes that dependency. It is a more specific
 * pattern than Vite's, so it wins the match without conflicting with it.
 */
declare module '@cg/*.module.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}

// The one plain stylesheet, imported for its side effect by main.tsx. Declared by exact
// name rather than a wildcard so it cannot shadow the .module.css pattern above.
declare module '@cg/styles/theme.css'
