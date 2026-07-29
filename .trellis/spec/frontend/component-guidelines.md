# Component Guidelines

## Established Component Styles

The repository currently has mixed Vue styles. Do not require TypeScript, `<script setup>`, or one SFC block order universally.

- Typed Composition API: `AsideNav.vue`, `SiteVisitCounter.vue`, `SiteVisitTracker.vue`, and `Swiper.vue` use `<script setup lang="ts">`.
- Untyped Composition API: `Layout.vue`, `DownloadCard.vue`, and `VideoPlayerAmbilight.vue` use `<script setup>`.
- JavaScript Options API: `GitHubCard.vue` uses `export default`.

Match the surrounding component or feature. New and modified source uses single quotes, no semicolons, and 2-space indentation. Existing exceptions, including the semicolon-based style in `VideoPlayerAmbilight.vue`, may remain; do not create unrelated formatting churn.

## Props

Keep component-specific prop types in the SFC. Typed reusable components use an interface with `defineProps` and `withDefaults`, as in `Swiper.vue`:

```ts
interface Props {
  items?: (string | SlideItem)[]
  mode?: 'banner' | 'carousel' | 'broadcast'
  navigation?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'banner',
  navigation: true,
})
```

Untyped components use object-form runtime declarations when props need constraints or defaults. Use factory defaults for arrays and objects, as shown by `VideoPlayerAmbilight.vue`:

```js
const props = defineProps({
  src: { type: String, required: true },
  quality: { type: Array, default: () => [] },
})
```

## Composition and Registration

- Reuse VuePress, Plume, and library components where they already provide the behavior. `AsideNav.vue` uses `VPLink`, `Layout.vue` wraps Plume's layout, and `Swiper.vue` uses Swiper's Vue components.
- Register a component in `docs/.vuepress/client.ts` only when Markdown pages need it. `DownloadCard`, `GitHubCard`, `SiteVisitCounter`, `SwiperSelf`, and `VideoPlayerAmbilight` follow this pattern.
- Import layout-only helpers locally. `Layout.vue` owns `AsideNav` and `SiteVisitTracker`.

## Styling

Plain CSS is the current project pattern. Most component styles use `<style scoped>`; global styles are used when third-party library markup or site-wide behavior requires them, as in `Swiper.vue` and `custom.css`.

Reuse Plume variables such as `--vp-c-brand`, `--vp-c-text-1`, `--vp-c-divider`, and `--vp-c-bg-soft`. Keep responsive behavior near the affected styles with explicit media queries; current components commonly use `640px` or `768px` breakpoints.

## Accessibility and Browser Behavior

Preserve the accessibility patterns already present: meaningful image `alt` text, `aria-label` and `aria-expanded` for custom controls, `aria-hidden` for non-visual analytics markup, and `rel="noopener noreferrer"` for new-tab links. Browser-only setup belongs in mounted hooks, event handlers, or an explicit SSR guard.

There is no automated accessibility standard at present. Review changed interactive markup manually and do not claim an automated check was run.
