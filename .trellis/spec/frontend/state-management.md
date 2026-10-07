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

`PlaybackFrame.eraseProgress` is -1 when inactive and 0..1 during erasure. `eraseOpacity` controls only the cursor: erase starts moving/removing pixels immediately while the cursor fades in over .18s; there is no stationary entrance/ready phase. The locked exit is sweep (`ERASE_SECONDS`, shared with geometry), end-hold (.20s), cursor-out (.30s) and blank-gap (.35s). Pause-out multiplies frozen cursor opacity by the outgoing frame opacity; pending settings cannot alter the locked next appearance. System reduced-motion is not a gate for this explicitly user-controlled demo; manual pause and document/viewport suspension remain effective. `getEraserFrame(progress, width, height)` exposes immutable 120Hz `paths` blocks and an independently interpolated cursor, so 144/240Hz displays do not repeat quantized cursor positions. Its compound `path` is lazy diagnostics only; never materialize cumulative strings or refill all history on each animation frame.

The painter keeps source ink intact and a separate white remaining-coverage Canvas mask. On forward playback, apply only new blocks to the mask using `destination-out`, then compose source ink with the remaining mask using `destination-in`. Theme/style/opacity refreshes must not rerasterize unchanged mask history. Rewind, restart and CSS-size/pixel-size/DPR changes reset the mask and deterministically replay to the requested prefix. Include erase progress in the final render key. Do not combine all capsules into one filled path: compound-path antialias tessellation can restore erased edge coverage. DOM art retains its original HTML/font rules. Feature-detect both getCSSCanvasContext and CSS.supports('-webkit-mask-image', '-webkit-canvas(name)') for a uniquely named, incremental alpha Canvas mask on capable WebKit; otherwise use the local luminance SVG mask. Append only new erase blocks; rewind/size/DPR/node changes rebuild. Theme and pause opacity do not replay mask history. Release Canvas buffers on unmount; never encode a full PNG every frame. Do not render hidden ink in art mode. All visible layers share one template-bound tilted surface under an unchanged measuring frame. Use actual mouse pointer events without rejecting them based on coarse pointer/hover media queries; ignore touch and pen events. Idle zero tilt uses transform:none/will-change:auto to release the forced compositing layer.

Verify whole-turn interior curvature and sampled time-domain heading/displacement, not only endpoint continuity. Forward mask work must be proportional to new blocks and zero for fixed-progress fades. Native Canvas frame timings need an explicit flush and workload dimensions; they do not establish browser FPS. Retain final zero alpha, no reappearing edges, untouched outside pixels, theme/resize/rewind/pause determinism and maximum-parallax viewport margins.

Regression entry points live in `.trellis/tasks/10-04-new-index3-wordmark/`: scheduler selection/boundary tests, compiled Vue lifecycle tests and native Canvas pixel/material tests. Production `pnpm docs:build` remains required; these checks do not establish browser visual acceptance.

Cache complete stroke prefixes with their intersection metadata, redrawing only the active stroke. Include pixel dimensions, transform, material, color, size and theme in invalidation; rewind before the prefix end rebuilds. Laser retains its separate coverage/material cache. Dispose evicted laser layers before clearing references, and expose an idempotent painter disposal that shrinks all pixel buffers and ignores late renders. Template snapshots publish only DOM-visible fields; unchanged Canvas frames and control VNodes should not be regenerated.
