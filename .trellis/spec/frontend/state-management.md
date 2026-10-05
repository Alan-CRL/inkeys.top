# State Management

## Current Model

State is component-local and uses Vue primitives. There is no Pinia, Vuex, global reactive store, or provide/inject state layer.

- Use `ref` for mutable UI and request state. `DownloadCard.vue` keeps loading, error, release, dropdown, and detail-panel state locally.
- Use `computed` for values derived from props, refs, or routes. `Swiper.vue` derives its module list and styles; `SiteVisitTracker.vue` derives whether the route is the homepage.
- Use `useRoute()` and `useRouteLocale()` for URL-derived state, as in `AsideNav.vue` and `SiteVisitCounter.vue`.
- Use `watch` for side effects caused by state transitions, not for values that can be computed. `SiteVisitTracker.vue` watches `route.path` because navigation requires refreshing an external script.

```ts
const route = useRoute()
const isHomePage = computed(() => route.path === '/' || route.path === '/index.html')

watch(() => route.path, () => {
  void syncBusuanzi()
})
```

## Fetched State

Fetched data remains in the consuming component. `DownloadCard.vue` owns its release loading/error state and normalizes the first valid response from three sources; `GitHubCard.vue` owns its GitHub API result. There is no repository-wide caching or synchronization contract.

Do not introduce a global store or query library by default. If a future task has state shared across independent consumers, decide component lifting, a composable, provide/inject, or a store based on that task's lifecycle and ownership needs.

## Boundaries

- Keep transient interaction state, such as an open dropdown or selected download, in the component that renders it.
- Derive values instead of duplicating them in mutable refs.
- Keep route state in the router rather than copying it into a separate global object.
- Normalize remote payloads before they become render state.

## NewHome3 playback contract

The local `NewHome3/playback.ts` scheduler separates selected settings, active appearance and a locked exit plan. At the end of the hold, find the first selected pen strictly after the current pen in `PEN_ORDER`, wrapping only at the end; removing the current pen does not lose its ordered position. Lock exit mode, next appearance and settings before fade/erase begins. Edits during exit stay queued until the next boundary. Eraser is a separate settings flag, not a `PenKind`: only the last selected drawing pen is erased, and hard/soft plus eraser still qualifies for the single-pen raw guide. Pause snapshots the outgoing frame (including erase progress) and transitions to the default hard/rainbow/medium style without mutating selection. No pens/no eraser enters persistent art lettering; eraser alone loops art-in, hold and erase without shimmer. Inject randomness into scheduler tests and resolve a solid color once per unsupported-rainbow pen appearance; repaint/theme/resize must never resample it.

`RenderStyle` is shared only by this feature's scheduler and renderer (`styles.ts`): pen, color and size are all render-cache inputs alongside theme. Highlighter alpha is applied once per stroke coverage, so self-overlap stays .35 and two independent strokes reach approximately .5775. Laser coverage channels merge with MAX before material resolution; do not substitute repeated translucent/glowing segment compositing. The native application sources are read-only references, not a frontend runtime dependency.

`PlaybackFrame.eraseProgress` is -1 when inactive and 0..1 during erasure. `eraseOpacity` controls only the cursor; actual erasing uses opacity 1, and pause-out multiplies the frozen cursor opacity by the outgoing frame opacity. The locked erase exit includes cursor-in (.28s), ready (.22s), sweep (`ERASE_SECONDS`, shared with geometry), end-hold (.20s), cursor-out (.30s) and blank-gap (.35s); queued settings cannot alter any of these stages. Only sweep advances the mask: progress stays 0 before it and 1 after it. Reduced-motion removes the cursor and restores a full-lettering hold when animation resumes. `getEraserFrame(progress, width, height)` supplies the same CSS-pixel immutable 120Hz `paths` prefix and cursor circle to Canvas and DOM-art SVG masks. Include erase progress in the final compositor cache key, but retain the unmodified ink material cache. Recompose from that source before applying `destination-out` to each capsule in `paths`; repeatedly erasing the previous output breaks rewind, resize and paused snapshots. The diagnostic compound `path` must not replace per-capsule compositing: compound-path antialias tessellation can restore edge coverage even when the geometry is nested. SVG art masks use white to keep and separate black paths to remove with explicit luminance semantics; masking must not affect the background or cursor. Validate unchanged pixels outside the sweep, zero residual alpha at completion, and stable geometry on replay.

Regression entry points live in `.trellis/tasks/10-04-new-index3-wordmark/`: scheduler selection/boundary tests, compiled Vue lifecycle tests and native Canvas pixel/material tests. Production `pnpm docs:build` remains required; these checks do not establish browser visual acceptance.
