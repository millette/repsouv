---
name: "solidjs"
description: Use when writing, reviewing or planning SolidJS code, including Solid islands inside Astro (.tsx components with client:* directives), signals, stores, resources and control flow. Use during /speckit.plan and /speckit.implement whenever a task touches client-side interactivity.
---

# SolidJS (TypeScript, Astro islands)

## Ground rules
- SolidJS is the only client-side interactivity layer. Never Alpine.js, never React patterns.
- TypeScript everywhere. Components are `.tsx` with `jsxImportSource: "solid-js"`.
- Components run **once**. There are no re-renders; only reactive reads inside JSX, `createEffect`, `createMemo` re-run.

## Reactivity — the mistakes to avoid
- **Never destructure props.** `props.title`, not `({ title })`. Use `splitProps` / `mergeProps` for defaults and forwarding.
- Read signals as calls: `count()`. Passing `count` (the getter) is correct when a child should stay reactive.
- Derived values: plain function `const double = () => count() * 2` or `createMemo` if expensive. Don't sync state with `createEffect` + setter.
- Async data: `createResource`; see "Resources in static Astro islands".
- Nested/collection state: `createStore` + `produce` or `reconcile`, not arrays of signals.
- Scope pending/busy state per action, not one global flag.
- Cleanup with `onCleanup`; DOM access in `onMount`.

## Control flow (not `.map` / ternaries)
- `<Show when={x()} fallback={...}>{(v) => ...}</Show>`
- `<For each={items()}>{(item, i) => ...}</For>` for object lists; `<Index>` for primitive lists.
- `<Switch>/<Match>`, `<Dynamic component={...}>`, `<Portal>`.

## In Astro
- Install with `nub x astro add solid`; mix with other frameworks only via `include`/`exclude` globs.
- Hydrate minimally: `client:visible` or `client:idle` by default, `client:load` only for above-the-fold interactivity, `client:only="solid-js"` for browser-only code.
- Island props must be serializable (no functions, class instances). Pass data, not callbacks.
- Islands don't share component state; share via nanostores (`@nanostores/solid`) or a module-level store.
- Static markup belongs in `.astro` files; only the interactive part is a Solid island.

## Resources in static Astro islands
- Decide where the fetch runs. With `client:load`, `client:visible` or `client:idle`, Astro also renders the island at build time, so the fetcher can run once during the build and bake that data into the HTML.
- Data that must be live: use `client:only="solid-js"`, so nothing runs at build time.
- To keep the build-time render, guard the fetcher with `isServer` from `solid-js/web` and return a placeholder on the server.
- Wrap every resource in `<Suspense>` (loading state) and `<ErrorBoundary>` (error state). An island never renders a blank spot.
- Read `resource.loading`, `resource.error` and `resource.latest`. Call `resource()` only inside `<Suspense>`. Use `latest` when a source signal triggers refetches, so the old data stays visible.
- Keep the fetch inside the island. Props from `.astro` are serialized at build time, so they carry config only (an ID, a URL), never the data itself.
- Build fetch URLs from `import.meta.env.BASE_URL`, never a hard-coded `/`, so the island works under a sub-path. Relative URLs have no origin at build time.
- Put the fetcher in a plain `.ts` module (`src/lib/`), without Solid or Astro imports, so it can be unit-tested alone.

## Tooling (Nub)
- Nub only: `nub install`, `nub run <script>`, `nub x <bin>`. Never npm, npx, tsc or ts-node.
- Add the integration with `nub x astro add solid`.
- Type-check with `astro check` (`@astrojs/check`) through `nub run check`.
- The Astro site keeps its own `package.json` and `nub.lock`; do not add its dependencies to the repository root.
- Check the installed Astro and Solid major versions in `package.json` before using an API from memory.

## Styling & UI
- daisyUI 5 is imported directly as CSS. No UnoCSS, no Tailwind utilities, no Ark UI.
- Never use daisyUI responsive variants (`sm:`, `md:`, `lg:`, `xl:` prefixes): the build strips them with a PostCSS plugin and a unit test fails if markup uses one. Responsive layout goes in the project's own CSS (media or container queries).
- For complex widgets, start from native HTML (`<dialog>`, `popover`, `<details>`, form controls) styled with daisyUI, and add Solid only for the behavior native elements lack.
- Use `class`, not `className`; `classList={{ active: on() }}` for toggles.

## Verification
- Check API details against the docs (docs.solidjs.com) rather than memory; Solid 2.0 changes some APIs, so confirm the installed major version in package.json first.
- Test pure logic (fetchers, filters) with the project's runner (`node:test` via `nub --test` here). Use Vitest + `@solidjs/testing-library` only if the project already has it.
