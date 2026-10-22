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

## Page-specific Plume appearance

`docs/new-index3.md` uses frontmatter `pageClass: new-home3-page`; Plume applies this class to its layout wrapper during SSR. Scope custom navbar/background CSS under that class, including nested divider/search selectors, so route navigation restores other pages automatically. Use `useDarkMode()` from `vuepress-theme-plume/client` for Canvas theme changes; repaint the current frame and include the theme in any render cache key. A paused frame must update without restarting its animation clock. Preserve native mobile-menu and dropdown surfaces when making the navbar transparent.

For NewHome3 mouse parallax, use the actual `PointerEvent.pointerType === 'mouse'` as the input contract; hover/pointer capability queries must not discard an otherwise valid mouse event. Touch, pen, hidden and offscreen states do not enable parallax. By explicit product requirement, system reduced-motion does not disable this demo, its controls or mouse parallax; preserve manual pause. Scope any override of Plume’s global reduced-motion transition rules to the local NewHome3 controls. Measure distance on the untransformed outer plane and transform the shared inner surface. The lifecycle regression must include a false pointer media query with valid mouse events.

NewHome3’s expanded toolbar uses desktop content width and fixed group gaps; do not distribute spare fixed-width space between groups. Its reveal clip is rectangular: applying an ordinary rounded inset to a corner-shape:squircle shell cuts off the corner border. Let the shell own the radius/shape while the clip only reveals it.


NewHome3 hero copy and CTA are siblings of the parallax plane; their entrance wrappers must not share the inner surface transform. One-shot entrance uses the existing active clock and stops publishing styles at its terminal state. CTA reflection uses background-position inside a fixed rounded pseudo-element (200% background width, central gradient peak, 78%/22% positions map to 22%/78% of the button); synchronize CSS animation-play-state with hidden/offscreen lifecycle instead of publishing per frame. Keep blur static and override Plume focus-radius/reduced-motion rules only on these local elements.

NewHome3 release content is a sibling after the hero's `.nh3-root`; never expand that hero visibility/height owner to include below-fold content. The release section owns its one-shot active clock and mouse settling, pauses while hidden/offscreen, and schedules no idle RAF after its terminal state. Re-entry, resize and theme changes must not replay the entrance. SSR and unavailable IntersectionObserver render the complete state. Share the hero's pure mouse-target calculation while retaining its existing parameters and actual-event input contract.

The reused UI3 toolbar's release variant is opt-in; default behavior and responsive hiding remain compatible with `/new-index`. Release shows a fixed dark, permanently expanded main button and toolbar, with the entire group uniformly scaled to fit narrow screens. Keep measurement, entrance, scale and tilt on separate elements. Provide conservative CSS scale/occupancy before the first measurement so the entire toolbar also fits at 320px with JavaScript disabled; measured inline styles then provide exact fitting. The native dark Logo uses the full `logo1.svg` 256px viewBox, white pen and 22% white frame; do not substitute the older hand-coded 20% frame or enable the separate pen-color overlay. The release section uses a plain background and neutral toolbar shell: the earlier rainbow strokes and their colored reflections were removed by product feedback. Keep the dark-theme heading a muted solid teal, retaining the light-theme color. Stop its finite entrance when the last content appears at 1.25s. Tool clicks provide visual interaction only; both NewHome3 download entrances use the same target.
