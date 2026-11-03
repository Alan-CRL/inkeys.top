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

NewHome3 release content lives inside the sibling `.nh3-below-fold` wrapper after the hero's `.nh3-root`; never expand that hero visibility/height owner to include below-fold content. The release section owns its one-shot active clock and mouse settling, pauses while hidden/offscreen, and schedules no idle RAF after its terminal state. Re-entry, resize and theme changes must not replay the entrance. SSR and unavailable IntersectionObserver render the complete state. Share the hero's pure mouse-target calculation while retaining its existing parameters and actual-event input contract.

The reused UI3 toolbar's release variant is opt-in; default behavior and responsive hiding remain compatible with `/new-index`. Release shows a fixed dark, permanently expanded main button and toolbar. The native dark Logo uses the full `logo1.svg` 256px viewBox, white pen and 22% white frame; do not substitute the older hand-coded 20% frame or enable the separate pen-color overlay. Tool clicks provide visual interaction only.

The `/new-index3` release section is a compact rounded card: solid neutral `Inkeys3` and small `焕新发布` on the left, restrained mint/blue/lavender desktop wallpaper on the right. No long copy, release download button, rainbow strokes or colored toolbar reflections. Independent sparse ambient ink is permitted behind the card within the below-fold wrapper; do not add looping decorations to the card itself. The hero owns the download entry and its background remains unchanged. Desktop >=900px lets the main button protrude about48px left of the wallpaper and clips about40px from the last tool group at the wallpaper's right edge. Below900px stack the layout and fit the complete toolbar. No-download natural width is551px; measured width is authoritative. Keep measurement, entrance, scale and tilt on separate elements, with CSS fallback fitting before measurement and without JavaScript.

`Ui3Bar.cropLastGroup?: boolean` defaults to false. When enabled, desktop replaces the final interactive group with an inert, aria-hidden visual copy; CSS hides the original group. Below900px the original is displayed and the inert copy hidden. This keeps clipped controls out of the focus order even before hydration while restoring all mobile controls. Do not apply clipping or focus restrictions to default toolbar callers. Check desktop/mobile and no-JavaScript rendering, not only hydrated markup.

Release wallpaper shell/title and clipping boundary stay fixed; only the toolbar tilts up to2deg and translates up to3px for actual mouse events within the display plane, settling on pointer leave. Preserve hidden/offscreen suspension, cleanup, complete SSR/no-observer rendering and no idle RAF. Stop the finite entrance at1.25s; resize/theme/re-entry must not replay it. Test focus exclusion, 320px no-overflow, desktop crop geometry, mobile full fitting, original toolbar activation, and the hero download entry.

Release typography uses local WOFF2 subsets: Archivo Black (genuine 400 face, no synthetic bold) for Inkeys3. The subtitle uses the original upright body font at20-24px with16px spacing; do not replace handwriting requests with cursive/calligraphic fonts. Preserve text semantics, font-display: swap, adjacent OFL licenses and source notes; extend subsets if copy changes. Fit title width at 320px and the 900px split breakpoint.

Release large tools are select/draw/geometry/eraser/whiteboard; stacked final tools are recall/freeze. Keep 551px natural width. Main hover does not change color; retain press/rebound and focus. Release tool hover entry/exit takes240ms. Main glass has its own 9% border-radius and overflow clipping in addition to the path, so loss of ancestor transforms after entrance cannot expose square backdrop corners. Default toolbar callers remain unchanged.

Only the release desktop wallpaper moves: two opaque gradient layers, three coordinated light/dark palettes, 24s CSS drift, non-repeating palette selections every20–30 active seconds and6s crossfade. Keep entering layer above current layer in both directions. A separate active clock and one timeout preserve remaining time across hidden/offscreen suspension; do not keep JS RAF alive for wallpaper. SSR uses deterministic palette0, theme changes update colors without replaying entrance, and an opaque shell always blocks ambient ink. Dispose the timeout on unmount.

### NewHome3 feature framework

Each feature uses a complete 1200px rounded card matching the release card's opaque light/dark surface, with a compact header, full-width stage and stable-height caption. Alternate heading alignment left/right/left on desktop; preserve natural reading order on mobile. Keep controls subordinate, remove numbered eyebrows and central placeholder slogans, and use a small corner media placeholder. Card gaps and the release section's trailing gap are40px. Preserve the separate clipped backplate and unclipped media layer.

Feature entrances are assigned distinct randomized presets only after mount, remain in one restrained visual family, and play once with staggered content and a light settle. Observe a stationary outer wrapper, freeze active entrance time while offscreen/document-hidden, and stop RAF at completion. SSR/no-observer output stays complete. Re-entry, theme and resize must not replay the animation. Start a section's autoplay only after its entrance completes; keep this local presentation independent of system reduced-motion. Tests cover unique assignment, one-shot completion, suspension/resumption, autoplay gating and teardown.

`FeatureSections.vue` is locally rendered after `ReleaseSection` inside the existing below-fold wrapper. Screen annotation, presentation integration and whiteboard each own a selected slide; only the most-visible section advances. Preserve progress while offscreen, document-hidden, focused or manually paused, reset it on manual selection, and dispose timers/observers/listeners on unmount. SSR and unavailable IntersectionObserver retain posters and manual selection without speculative background autoplay. System reduced-motion must not suppress this explicitly requested presentation. Caption layout reserves the tallest slide without hiding active content from assistive technology. Keep media placement separate from its rounded backplate for future protruding real-product layers.

Feature media uses eight scene IDs from `public/feature-media/manifest.json`, with real native-rendered UI3/Draw3 pixels. `FeatureMedia.vue` attaches video sources only near the viewport; muted inline playback has no native controls. Video time/ended owns scene progression, so buffering cannot be cut short by the fallback timer. End events received while paused are deferred until playback is authorized again; scene ID plus instance revision reject stale callbacks. Failed playback falls back to poster/timed progression without retrying the same failed instance. Desktop/mobile variants share a timeline; changing source retains position and pause state. The stage follows the active film aspect ratio (9:4 desktop, 1:1 below 600px), avoiding contain letterboxing and shrunken mobile controls. On teardown pause, remove src and reload to release the decoder. Verify compiled lifecycle/SSR, real asset completeness and the production build; do not confuse mock playback tests with browser codec verification.

Reusable feature-film sources and tools live in `media/inkeys3-features/`: storyboard/camera timing, real native export adapter, source provenance and compositor. Product controls/ink must come from the production renderer; teaching diagrams and editorial captions may be authored separately. Native animation sequences use shared alpha bounds and retain native timing, while camera moves use nonlinear easing and short holds. Export desktop/mobile MP4 and README GIF from the same scene definition. Keep temporary native patch application reversible with byte-exact/concurrent-edit protection; never write user application or Office/COM configuration. A composed offscreen demonstration does not prove actual Office interoperability or damaged-COM recovery on the capture machine.

The `screen-freeze` film is rebuilt independently in `media/inkeys3-remotion/`; keep its pnpm dependencies separate from VuePress. `scripts/prepare-assets.mjs` validates native hashes/shared canvases, `pnpm render` exports both60fps profiles, and `scripts/verify.py --ffmpeg <full-ffmpeg> --publish` promotes only that scene after full decode and visual review. Update its manifest duration, per-scene provenance override and verification together; retain other scene hashes and the first public-file backup. The Remotion Windows compositor requires x64 Node on ARM64 hosts; use the documented project-local runtime, not system configuration changes. Match composited diagrams to native geometry, preserve shared control anchors, and distinguish editorial camera/input layers from actual product capabilities.

### NewHome3 feature paging

`FeaturePager.vue` owns the five `primaryFeatures` between the release card and 「下载 Inkeys」; download, detail and extra sections keep ordinary scrolling. SSR/no-JS renders the five pages statically (section ids `nh3-feature-<id>`, no `data-state`, anchors or dots); after mount it switches to a sticky full-viewport stage inside a tall container and moves the ids onto absolutely positioned scroll anchors. Pure logic lives in `featurePager.ts`: step 0.72 viewport, page switch at 30% of a step, compared only against the starting page (a single call must never step forward then back). The pager sits after a 160px transparent-to-page-color gap below the hero. Entry mirrors exit: page 0 is already the current page while the pager slides in with the document (no snap, no page-turn animation; `pageAt` returns 0 for everything above the pager top, the last page for everything below), wheel up on page 0 and wheel down on the last page both hand back to native scrolling. Only the final stretch is held: a wheel event that would cross the pager top (`entryTarget`) or touch momentum that overshoots it (`update()` clamps within 3s of a real swipe) stops at page 0, and the next gesture starts paging. Wheel gestures go through `feedWheel`: accumulate ≥36px (one mouse notch, or ~4 trackpad events; light touches never flip), fire once, then swallow the rest of the gesture including inertia; a gesture ends on a >140ms pause, a direction reversal, or a magnitude that rises again after decaying (only once the page animation has finished), so the next swipe right after a flip still works. Touch inside the pager is claimed on the first touchmove (non-passive, vertical, a page exists in that direction): a swipe ≥40px flips exactly one page and native scrolling is suppressed; at the ends or for horizontal/multi-touch it stays native. Scrollbar dragging and keyboard (smooth Home/End/PageDown) align only after scrolling stops; jumps that leave the paging range (above the release anchor or past half the tail) are never pulled back. Page transitions and staggered float-in are CSS driven by `data-state` before/current/after; the outgoing page fades before the incoming one appears. The sticky stage has no own background so the below-fold gradient stays continuous. Text has priority: the stage takes remaining height (max 840px/66vw desktop, 58% height share; 4:3 below 768px) and the whole page zooms down to at most 0.72 if the copy alone does not fit. While the hero or pages are showing, FeaturePager sets `data-nh3-pager` (`home`/`immersive`, immersive once page 0's top is within 64px of the viewport top) on `.new-home3-page`; ScrollFrame keeps the navbar visible while it is present, and `immersive` paints the navbar in the page color without its divider (existing 320ms transitions). Leaving the last page removes the attribute and restores ScrollFrame behavior. The release card follows the pager directly in `FeatureSections`; the separate 「下载 Inkeys」 card is gone and the 「立即下载」 button (`downloadContent.href`) lives inside the release card. The card uses the same flat language as the feature images: width `min(840px, 66vw)`, stage color (`#dfe9e6` / `#1f2c2d`), same radius, no border or shadow, centered column of statement-style title (italic-serif `Inkeys3` + accent dot + serif `焕新发布`), the unchanged desktop-and-toolbar window, and a solid accent pill button. All five pages use one statement layout: serif title (a ` · ` title splits into italic-serif brand + serif theme), one plain sentence per line with no bold/highlight, optional `closing` line led by a short hairline. `showMoreFeatures` in `featureContent.ts` currently hides everything after the release card (the old 「继续了解功能」 link was removed with the download card; re-home it if the sections come back). Right-side dots live inside the sticky stage (visible whenever the pager is, no fade gate), are equal-sized without hover, magnify by mouse distance only, jump on click, and expose `aria-current`. Regression: `.trellis/tasks/10-29-new-index3-feature-paging/verify-feature-pager.cjs` (logic/SSR).

### NewHome3 scroll navigation and ambient ink

`ScrollFrame.vue` owns page-local navigation variables only; do not render a viewport frame, mask, rounded aperture or exterior border. It uses document scroll without content scaling or spacer height. Keep the initial transparent navbar, solid background after scrolling, and existing fade/slide thresholds. Deep upward travel24px recalls navigation, downward36px dismisses it; transitions last320ms. Navigation uses opaque light #f6f8fa / dark #0b111a. Its subtle 1px inset bottom divider follows nav-fill opacity without affecting layout height. Hero and below-fold content share one continuous page background: no separator line or section-local environment tint. Keep gradient coordinates viewport-based so extending its painting area does not rescale the hero composition. Menu-open state and focus inside native nav pin it; hidden nav is inert/aria-hidden. Transform only `.vp-navbar`, not its `.vp-nav` ancestor, to preserve mobile fixed-menu containment. Without JavaScript the nav uses an opaque fallback. Mobile fixed-nav occupancy replaces its original relative height. Entering `/new-index3` (including reload/history restoration) starts at scroll0: the route-specific client scrollBehavior ignores saved positions and component pageshow resets BFCache. Other routes delegate unchanged to the original scrollBehavior; do not change global history restoration. Teardown restores nav attributes and removes page vars, observers and listeners.

`AmbientInk.vue` is aria-hidden/pointerless inside `.nh3-below-fold`; its bounded Canvas tiles use document coordinates (SVG is only the small eraser) and never cover the hero. `createAmbientScheduler(random)` consumes active seconds and supports deterministic tests. Four scenes are pen, laser, digits with highlighter, and hand-drawn shape morphing to a true circle/rectangle. Only the eraser has a visible cursor. Reuse the actual hero `createPainter` and exported `createInk` through `ambientPainter.ts`, including hard/soft/brush nibs, highlighter transparency and laser core/halo. Keep hero glyphs/full-screen eraser choreography independent. Ordinary strokes and digits select hard/soft/brush; highlighter markings and laser scenes use their respective materials. Digit guides use cubic interpolation before321-point sampling; wave/shape paths use241 points, with shape noise parameterized by normalized arc progression. Keep recognized rectangles angular. Tiles retain300:90 aspect on mobile so ink and eraser coordinates agree. Tile placement avoids the title and opaque wallpaper using actual ink footprint. Card background fill may reveal ambient strokes, but card children and the wallpaper remain opaque.

Initial ambient delay is2–4s; draw1–2s, hold2–4s, erase/fade1–2s. Desktop gap8–14s/max2 with15% overlap; mobile gap12–20s/max1. Hero manual pause does not stop this background. Freeze hidden/offscreen time and resume without catch-up bursts; use one timeout for empty intervals and RAF only for visible active strokes. Dispose timers/listeners/observers on unmount; keep memory bounded and SSR free of random content. Laser segments fade in written order; shape-circle x/y diameters match. Tests must exercise seedable scheduling, no idle RAF, content-anchored placement, complete erasure, theme repaint, concurrency, native menu/focus locks and route cleanup.

During preparation of feature demo media, NewHome3 does not mount AmbientInk; keep its implementation available for later restoration. Release and feature cards use opaque light/dark backgrounds, while their entrance opacity animation remains intact.
