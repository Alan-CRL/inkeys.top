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
