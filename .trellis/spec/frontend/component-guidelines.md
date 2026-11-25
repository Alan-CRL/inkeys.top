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

### Buttons and theme images in Markdown pages

- Buttons in page content reuse the site button classes inside a `doc-actions` row (`site.css`; add `doc-actions--center` to center it). Internal targets use `<RouteLink to="/zh-tw/download" class="nh3-btn nh3-btn-primary">` so navigation stays in the SPA; external targets use `<a class="nh3-btn nh3-btn-primary no-icon" target="_blank" rel="noopener noreferrer">`. `no-icon` removes Plume's external-link arrow, and `.vp-doc a.nh3-btn` removes the body-link underline. Examples: `docs/version/inkeys3.md`, `docs/version/introduction/win7.md`.
- Light/dark image pairs use the markdown-image mark syntax enabled in `config.ts`: `![alt](/showcase/x-light.webp#light)` and `![alt](/showcase/x-dark.webp#dark)` on consecutive lines of the same paragraph; this renders plain `<img>` tags with `data-mode` and no figure caption.

## Accessibility and Browser Behavior

Preserve the accessibility patterns already present: meaningful image `alt` text, `aria-label` and `aria-expanded` for custom controls, `aria-hidden` for non-visual analytics markup, and `rel="noopener noreferrer"` for new-tab links. Browser-only setup belongs in mounted hooks, event handlers, or an explicit SSR guard.

There is no automated accessibility standard at present. Review changed interactive markup manually and do not claim an automated check was run.

## Page-specific Plume appearance

`docs/new-index3.md` uses frontmatter `pageClass: new-home3-page`; Plume applies this class to its layout wrapper during SSR. Scope custom navbar/background CSS under that class, including nested divider/search selectors, so route navigation restores other pages automatically. Use `useDarkMode()` from `vuepress-theme-plume/client` for Canvas theme changes; repaint the current frame and include the theme in any render cache key. A paused frame must update without restarting its animation clock. Preserve native mobile-menu and dropdown surfaces when making the navbar transparent.

For NewHome3 mouse parallax, use the actual `PointerEvent.pointerType === 'mouse'` as the input contract; hover/pointer capability queries must not discard an otherwise valid mouse event. Touch, pen, hidden and offscreen states do not enable parallax. By explicit product requirement, system reduced-motion does not disable this demo, its controls or mouse parallax; preserve manual pause. Scope any override of Plume’s global reduced-motion transition rules to the local NewHome3 controls. Measure distance on the untransformed outer plane and transform the shared inner surface. The lifecycle regression must include a false pointer media query with valid mouse events.

NewHome3’s expanded toolbar uses desktop content width and fixed group gaps; do not distribute spare fixed-width space between groups. Its reveal clip is rectangular: applying an ordinary rounded inset to a corner-shape:squircle shell cuts off the corner border. Let the shell own the radius/shape while the clip only reveals it.


NewHome3 hero copy and CTA are siblings of the parallax plane; their entrance wrappers must not share the inner surface transform. One-shot entrance uses the existing active clock and stops publishing styles at its terminal state. Keep blur static and override Plume focus-radius/reduced-motion rules only on these local elements.

### NewHome3 below-fold framework

Below the hero, `NewHome3.vue` mounts `SectionAbilities` (S1), `SectionScenes` (S2), `SectionCraft` (S5-A ink board and S5-B interface/devices) and `SectionDownload` (S6) in that order. The earlier release card, feature pager, feature sections, scroll frame and ambient ink were removed on 2026-11-16 together with their data modules; do not restore them piecemeal. Design tokens are `--nh3-*` in `home.css`, scoped to `.new-home3-page`, and Plume's `--vp-c-*` variables point at them on this page only, so the navbar, footer and search follow. `Layout.vue` adds `NavActions` (download, theme toggle, more links) to the navbar only when `pageLayout` is `NewHome3`; the navbar no longer hides on scroll. The design decisions and tokens are recorded in the archived `11-16-new-index3-design-system` task.

All copy lives in `copy.ts`, one dictionary per locale (`zh-CN`, `zh-TW`, `en-US`). The locale comes from the route (`/`, `/zh-tw/`, `/en-us/`) via `useLocale()`, so SSR outputs the final language; see [i18n Guidelines](./i18n-guidelines.md). The root element carries `lang`. Every media position uses `MediaSlot.vue`: `ratio`, `poster`, `srcLight`/`srcDark` (an `.m3u8` address plays through a dynamically imported `hls.js`, falling back to native HLS), `imgLight`/`imgDark` for GIFs, `label` for screen readers and `note` for the placeholder shown until media exists. Video requests start only near the viewport, play after the section's entrance finishes, pause offscreen, respect a user's explicit pause, and do not autoplay under reduced motion. S1 cards use the GIFs in `public/new-index3/s1/`; S5-A streams from 123pan HLS and picks 1080p/720p/480p once on mount from the media box's device-pixel width (480p when Save-Data is on).

Entrances use `appear.ts` only: mark a group with `data-nh3-appear` and its items with `data-nh3-item` (`right` slides in from the right, `panel` scales from 97%, anything else rises). Each group plays once on entering the viewport; groups skipped by an in-page jump appear without animation. The hiding classes are added after mount, so no-JS, missing IntersectionObserver and reduced motion keep content visible. Never drive animation from scroll progress. In-page links (S1 card to S2 scene) rely on the `!to.hash` exception in the `/new-index3` client `scrollBehavior`.
