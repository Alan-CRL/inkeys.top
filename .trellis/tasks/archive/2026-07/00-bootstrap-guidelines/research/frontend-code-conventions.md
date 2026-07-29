# Research: TypeScript, Vue, CSS, and Reusable Component Conventions

- **Query**: Inspect TypeScript, Vue, CSS conventions, reusable components, state, data fetching, and accessibility evidence.
- **Scope**: internal
- **Date**: 2026-07-29

## Findings

### Files Found

| File Path | Description |
|---|---|
| `docs/.vuepress/theme/components/AsideNav.vue` | Typed Composition API component with route state and clipboard behavior. |
| `docs/.vuepress/theme/components/DownloadCard.vue` | Large untyped Composition API component with remote data normalization and local UI state. |
| `docs/.vuepress/theme/components/GitHubCard.vue` | Options API component with runtime props and GitHub API fetching. |
| `docs/.vuepress/theme/components/Layout.vue` | Minimal layout composition component. |
| `docs/.vuepress/theme/components/SiteVisitCounter.vue` | Typed route-derived display component. |
| `docs/.vuepress/theme/components/SiteVisitTracker.vue` | Typed lifecycle/watcher component for a third-party script. |
| `docs/.vuepress/theme/components/Swiper.vue` | Typed reusable component with interfaces, defaults, and computed configuration. |
| `docs/.vuepress/theme/components/VideoPlayerAmbilight.vue` | Untyped media integration with lifecycle cleanup. |
| `docs/.vuepress/theme/styles/custom.css` | Global theme tokens and responsive overrides. |
| `docs/.vuepress/theme/shim.d.ts` | Ambient declaration for importing `.vue` files. |

### Vue Component Styles

The codebase contains three observed component authoring styles:

1. Typed Composition API with `<script setup lang="ts">`: `AsideNav.vue`, `SiteVisitCounter.vue`, `SiteVisitTracker.vue`, and `Swiper.vue`.
2. Untyped Composition API with `<script setup>`: `Layout.vue`, `DownloadCard.vue`, and `VideoPlayerAmbilight.vue`.
3. JavaScript Options API with `export default`: `GitHubCard.vue:65-134`.

Therefore, the repository does not evidence one mandatory API style or universal TypeScript use.

Most Composition API files place `<script>` before `<template>` and `<style>`, for example `AsideNav.vue`. `GitHubCard.vue` and `VideoPlayerAmbilight.vue` place the template first. The repository does not evidence one mandatory SFC block order.

Local component files use PascalCase names: `DownloadCard.vue`, `SiteVisitTracker.vue`, and `VideoPlayerAmbilight.vue`. Global registration also uses PascalCase names (`docs/.vuepress/client.ts:12-16`). `Swiper.vue` is registered under the distinct Markdown name `SwiperSelf`.

### Props and Types

Typed reusable props are local to their component. `Swiper.vue:30-54` defines `SlideItem` and `Props` interfaces in the SFC, then uses typed defaults (`Swiper.vue:60-71`):

```ts
interface Props {
  items?: (string | SlideItem)[]
  width?: number | string
  height?: number | string
  mode?: 'banner' | 'carousel' | 'broadcast'
  navigation?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  width: '100%',
  mode: 'banner',
  navigation: true,
})
```

`AsideNav.vue:6-24` similarly keeps its `Locale` interface and locale map inside the component.

Untyped components use Vue runtime prop declarations where props are needed. `VideoPlayerAmbilight.vue:17-25` uses object-form `defineProps` with constructors, required/default values, and factory defaults for arrays. `GitHubCard.vue:66-70` uses Options API runtime props.

No shared frontend type directory exists. `shim.d.ts:1-6` is the only standalone declaration file. No runtime schema-validation library or schema files were found. `DownloadCard.vue:66-114` validates and normalizes remote JSON manually using object/array/string checks before assigning it to reactive state.

### State and Derived Values

State is component-local and uses Vue primitives. Examples include:

- `ref` for loading, errors, fetched release data, open panels, and dropdown state (`DownloadCard.vue:2-23`, `DownloadCard.vue:42`).
- `computed` for derived display values and configurations (`DownloadCard.vue:133-139`, `Swiper.vue:73-137`).
- Route state from `useRoute()` and `useRouteLocale()` (`AsideNav.vue:22-24`, `SiteVisitCounter.vue:5-7`).
- `watch` for route-change side effects (`SiteVisitTracker.vue:34-36`).
- Lifecycle hooks for browser-only setup and cleanup (`SiteVisitTracker.vue:30-36`, `VideoPlayerAmbilight.vue:38-88`).

No Pinia, Vuex, global reactive store, provide/inject state layer, or standalone composable (`use*.ts`) was found. Shared behavior is currently represented by components rather than custom composables.

### Data Fetching and Browser Integration

Data fetching uses the native Fetch API directly inside components:

- `DownloadCard.vue:52-64` wraps `fetch` with `AbortController` and a timeout.
- `DownloadCard.vue:116-131` tries three version JSON sources in order and normalizes the first valid response.
- `GitHubCard.vue:93-104` fetches repository metadata from the GitHub API during `mounted`.

There is no shared fetch client, query/cache library, or server-state abstraction.

Browser APIs are guarded according to component context. `SiteVisitTracker.vue:12-23` explicitly checks `typeof window === 'undefined'` before DOM manipulation. Other browser behavior runs inside mounted hooks or event handlers, including player construction, `window.open`, clipboard writes, and synthetic download anchors.

Resource cleanup is explicit for media integrations. `VideoPlayerAmbilight.vue:31-36` destroys HLS state, and `onBeforeUnmount` destroys both HLS and Artplayer (`VideoPlayerAmbilight.vue:83-88`).

### Styling Patterns

The dominant component style is plain CSS inside `<style scoped>`. Observed exceptions are:

- Global keyframes plus scoped component CSS in `DownloadCard.vue:522-1002`.
- Entirely global component styles in `Swiper.vue:190-273` and `VideoPlayerAmbilight.vue:91-96`.
- Empty global style block in `Layout.vue:22-23`.
- Page-local scoped CSS embedded in `docs/community.md:80-110`.

Styles reuse Plume variables such as `--vp-c-brand`, `--vp-c-text-1`, `--vp-c-divider`, and `--vp-c-bg-soft` throughout components. Shared site customization overrides Plume tokens under `:root` and `[data-theme="dark"]` (`custom.css:1-59`).

Responsive styles use explicit media queries, including `max-width: 640px` in `DownloadCard.vue:949-969`, `max-width: 768px` in `GitHubCard.vue:289-325`, and `max-width: 768px` in `custom.css:80-96`.

CSS naming is descriptive kebab-case (`download-info-wrapper`, `site-visit-counter`, `swiper-slide-img`). There is no CSS module, preprocessor, utility CSS framework, CSS-in-JS library, or design-token file outside Plume variables and `custom.css`.

### Reusable Components and Composition

Five custom components are registered globally for direct use in Markdown (`client.ts:12-16`). Layout-only helpers are imported locally by `Layout.vue`, not globally registered. This yields two observed scopes:

- Markdown-facing reusable components: `DownloadCard`, `GitHubCard`, `SiteVisitCounter`, `SwiperSelf`, `VideoPlayerAmbilight`.
- Theme/layout internals: `Layout`, `AsideNav`, `SiteVisitTracker`.

Components use library components when available: `VPLink` in `AsideNav.vue:3,40-49`, Swiper's Vue components in `Swiper.vue:16,162-186`, Plume's `Layout` and `PageContextMenu` in `Layout.vue:2-18`, and Plume Markdown components directly in pages.

### Accessibility Evidence

Observed accessibility attributes include image `alt` text, `aria-expanded` and `aria-label` on dropdown controls (`DownloadCard.vue:442-449`, `DownloadCard.vue:484-491`), `aria-hidden` on the invisible analytics container (`SiteVisitTracker.vue:39-45`), and `rel="noopener noreferrer"` on several external/new-tab links.

No repository accessibility standard, automated accessibility check, or documented required checklist was found.

### Formatting Evidence

Most TypeScript and newer Composition API code uses single quotes and omits semicolons, as in `client.ts`, `AsideNav.vue`, `SiteVisitTracker.vue`, and `Swiper.vue`. `VideoPlayerAmbilight.vue` consistently uses semicolons and `config.ts`/`plume.config.ts` include mixed quote and indentation styles. This is observed variation, not evidence of an enforced formatter rule.

### External References

- [Vue Composition API](https://vuejs.org/guide/extras/composition-api-faq.html) — matches the majority component style; no repository-specific external rule is declared.
- [Swiper Vue components](https://swiperjs.com/vue) — library integrated by `Swiper.vue`.
- [Artplayer](https://artplayer.org/) — media player integrated by `VideoPlayerAmbilight.vue`.

### Related Specs

- `.trellis/spec/frontend/component-guidelines.md` — candidate for the observed SFC variants, prop patterns, registration scopes, styling, and accessibility evidence.
- `.trellis/spec/frontend/type-safety.md` — candidate for local interfaces, runtime props, manual remote-data normalization, and mixed typed/untyped files.
- `.trellis/spec/frontend/state-management.md` — candidate for local refs/computed values, route state, watchers, and absence of a global store.
- `.trellis/spec/frontend/hook-guidelines.md` — candidate for documenting that no custom composable layer currently exists and that lifecycle hooks are used inside SFCs.
- `.trellis/spec/frontend/quality-guidelines.md` — candidate for observed cleanup, browser guards, responsive styles, and absent automated checks.

## Caveats / Not Found

- The code does not establish whether new components must use TypeScript, Composition API, or a fixed SFC block order.
- No project-wide formatter resolves the observed quote, semicolon, or indentation variation.
- No custom hook/composable naming convention is evidenced because no standalone composables were found.
- No global-state promotion rule, test convention, or formal accessibility requirement is documented.
- The large components are factual examples of current organization; repository evidence does not state a preferred component size or extraction threshold.
