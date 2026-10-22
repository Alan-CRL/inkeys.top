# Inkeys3 焕新发布横向卡片

## Goal and approval
User approved the complete plan in the preceding conversation and explicitly requested implementation. Trellis creation approved. No further planning gate is needed.
Replace the /new-index3 below-hero release section with a half-screen-height horizontal card matching the supplied sketch and existing hero style.

## Requirements and acceptance
- Card max-width about 1200px, desktop height clamp(360px,45svh,420px), side gutters >=24px, radius about28px. Left ~35% contains only large solid neutral Inkeys3 (72–104px) and smaller 焕新发布 (20–24px), 16px gap.
- Remove two descriptive paragraphs and this release toolbar's download button; preserve hero download.
- Right rounded desktop wallpaper, 240–280px tall, radius24px, restrained mint/blue/lavender derived from hero. No fake OS chrome, decorative scribbles, arrows, gradient text or looping light effects.
- Toolbar appears slightly below wallpaper center. Main button protrudes 40–56px left; right clips 32–48px into final tools. Fixed wallpaper and clip, native interactive toolbar foreground. Cropped group is visual only (no pointer or keyboard interaction).
- Below900px stack text then desktop, title52–72px, natural card height, uniformly fit complete toolbar with small protrusion and no right clipping. No document overflow at320px including JavaScript disabled.
- Keep hover/press/main spring on visible controls; no drawing demo. Only toolbar has parallax: within display area, mouse only, max3px/2deg, smooth reset on leave. Preserve existing reduced-motion product policy.
- One-shot entrance <=1.25sec; hidden/offscreen pause, no idle RAF, no replay on reentry/resize/theme; SSR/no IntersectionObserver complete.
- Preserve hero, other routes, original encodings/newlines, unrelated untracked files. No commit/push or visible GUI.

## Verification
Production pnpm docs:build; adapt existing release regression for new contract and lifecycle. Windowless browser screenshots/checks in light/dark at320/390/768/900/1280/1920, plus noJS. Report real environmental limits.

## Out of scope
First-screen redesign, real drawing tools, unrelated refactors or dependency changes. No blocking questions remain.