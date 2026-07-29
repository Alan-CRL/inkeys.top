# Hook and Composable Guidelines

## Current Pattern

No standalone `use*.ts` composables exist. Shared behavior is currently implemented by focused components, and future composables are decided per task rather than required by a global rule.

Vue lifecycle and route hooks stay in the SFC that owns the behavior:

- `SiteVisitTracker.vue` uses `onMounted` and watches `route.path` to refresh its third-party script after navigation.
- `VideoPlayerAmbilight.vue` creates Artplayer/HLS after mount and destroys both in `onBeforeUnmount`.
- `AsideNav.vue` and `SiteVisitCounter.vue` derive state from `useRoute()` or `useRouteLocale()`.

```ts
onMounted(() => {
  void syncBusuanzi()
})

watch(() => route.path, () => {
  void syncBusuanzi()
})
```

## Data Fetching

Components use the native Fetch API directly; there is no shared client, query cache, or server-state library.

- `DownloadCard.vue` combines `fetch`, `AbortController`, a timeout, ordered fallback URLs, and normalization before updating refs.
- `GitHubCard.vue` fetches repository metadata in `mounted`.

Keep loading, error, and response state with the consuming component. Validate remote data before assignment; a successful HTTP response alone is not sufficient.

## Browser Integrations and Cleanup

- Guard direct browser access when code can run during server rendering. `SiteVisitTracker.vue` checks `typeof window === 'undefined'` before DOM work.
- Browser APIs used only from mounted hooks or user event handlers may remain there.
- Clean up component-owned, long-lived resources when applicable. `VideoPlayerAmbilight.vue` destroys its HLS and Artplayer instances in `onBeforeUnmount`; assess timers, observers, listeners, and injected DOM nodes according to the integration being changed.

## Future Composables

If a task introduces genuinely shared stateful logic, decide its API, ownership, location, and naming in that task. Use Vue's conventional `useXxx` name if a composable is introduced, but do not extract single-use component logic solely to create a hook layer that the repository does not currently have.
