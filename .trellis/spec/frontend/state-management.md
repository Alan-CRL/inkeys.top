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

The local `NewHome3/playback.ts` scheduler owns selected settings separately from the active appearance. Changes apply after the current pen's fade, not after a full rotation; changing the pen set restarts at its first ordered entry, while color/size alone keep the next pen. Pause snapshots the outgoing frame and transitions to the default hard/rainbow/medium style without mutating selection. Empty selection enters persistent art lettering. Inject randomness into scheduler tests and resolve a solid color once per unsupported-rainbow pen appearance; repaint/theme/resize must never resample it.

`RenderStyle` is shared only by this feature's scheduler and renderer (`styles.ts`): pen, color and size are all render-cache inputs alongside theme. Highlighter alpha is applied once per stroke coverage, so self-overlap stays .35 and two independent strokes reach approximately .5775. Laser coverage channels merge with MAX before material resolution; do not substitute repeated translucent/glowing segment compositing. The native application sources are read-only references, not a frontend runtime dependency.

Regression entry points live in `.trellis/tasks/10-04-new-index3-wordmark/`: scheduler selection/boundary tests, compiled Vue lifecycle tests and native Canvas pixel/material tests. Production `pnpm docs:build` remains required; these checks do not establish browser visual acceptance.
