# Design

## Change boundary
ReleaseSection.vue owns composition, background, clip, responsive adaptation and local mouse lifecycle. releaseScene.ts owns pure fitting and finite entrance. NewHome3.vue only stops passing release downloadHref. Reuse NewHome/Ui3Bar.vue and Ui3BarButton.vue; add only opt-in interaction restriction if needed for clipped final group. Preserve all default behavior.

## Layout and clipping
Use separate wallpaper and foreground toolbar layers. Foreground clip has extra left room and the same right rounded boundary as wallpaper, allowing the main button to emerge left while last group is cut on right. Keep measurement/entrance/scale/tilt wrappers distinct. Size desktop geometry so 32–48px clips last stacked tool group at all desktop widths; scale as necessary without colliding with title. Recompute no-download natural toolbar dimensions rather than retaining682px. CSS SSR fallback must agree with final natural width.
Mobile <900px uses stacked layout and complete uniformly fitted toolbar. Disable cropped group on desktop only, including SSR; restore on mobile. Prefer simple responsive treatment with genuine focus exclusion, not hidden offscreen focusable elements.

## Motion and visuals
Matte outer card and restrained wallpaper use current page palette; leave hero background untouched. Background/title do not tilt. Handle mouse over scene, max3px translation/2deg rotation, leave resets. Reuse clock, viewport/document activity handling and cleanup. User-approved visual changes supersede old spec assertions about teal heading/plain background/full desktop bar. No reduced-motion policy changes.

## Compatibility
No API change outside optional default-off toolbar restriction. Shared default variant unchanged. No dependencies/config updates. Chinese comments at clipping/focus/SSR subtleties. Rollback only task-owned hunks.