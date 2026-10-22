# 滚动圆角外框与下方背景绘制

## Approval / goal
User explicitly approved complete plan and requested implementation after prior planning conversation. Task creation also approved. Implement in /new-index3 only; preserve prior uncommitted card implementation and unrelated files. No further approval gate.

## Scroll shell
- Fixed viewport rim (not nested scroll or content scaling), existing document scroll only; do not add spacer height for animation.
- Initial first16px: no rim, transparent navbar. Transition to opaque solid navbar plus rim; desktop sides24px/bottom16px/radius32px/top under navbar. Mobile sides/bottom8px/radius20px; fixed mobile navbar with original layout occupancy.
- V=viewport height,M=maxscroll: enter end=min(.14V,.22M); exit start=min(.38V,.55M); exit distance=min(.18V,.25M). Normalize small/empty scroll ranges.
- Stage3 expands inner opening to all viewport edges/radius0 and hides navbar upward with fade. Deep upward accumulation24px restores shell/nav (~320ms), downward36px hides again. Reset accumulation on direction change, filter jitter. Return top restores initial; restored deep scroll initializes correct state.
- Rim/nav share opaque light cool-gray or dark blue-black color. Underlying links/ink never show through navbar. Pin visible when navbar focused or menu open; hidden nav must not be focusable. Preserve native search/dropdown/mobile menu.
- Page-scoped only; cleanup on route departure. SSR/noJS static complete content, solid readable navbar on scrolling (CSS fallback; do not depend on JS top class).

## Ambient background
- Starts exactly at below-hero boundary, behind release and future below-fold contents, no overlap into hero/frame. Content-anchored (scrolls with document), decorative aria-hidden/pointer-events none.
- Four predesigned scene families: pen wave/line then erase; laser line/arc trailing fade;1–3 hand-drawn digits then highlighter mark then erase; wobbly rect/circle then morph to regular shape then erase. Only ink and small eraser cursor; no drawing pen cursor.
- Width about viewport/3 capped520px, mobile same ratio with legibility minima. Pen1.5–2.5px/highlighter6–10px/eraser14–20px desktop, smaller mobile. Existing solid palette, low contrast.
- Initial wait2–4s visible active time. Draw1–2s, hold2–4s, erase/fade1–2s. Desktop idle8–14s after round;15% chance second overlapping scene on opposite side, max2. Mobile idle12–20s/max1. Prioritize visible whitespace, avoid left title text, allow faint ink through card.
- Independent auto playback, NOT controlled by hero pause. Pause hidden/offscreen without catchup bursts; no idle RAF in gaps; reuse existing motion policy. Clear old ink, bounded memory. Seedable random for tests.
- Card fill only light .58/.20 -> .42/.14; dark .40/.30 -> .28/.20. Don't apply opacity to whole card. Right desktop wallpaper fully opaque, prior toolbar/crop/mobile behavior preserved.

## Validation and constraints
Tests pure shell ranges/direction/jitter/restore/locks; ambient seed timing/families/concurrency/erasure/visibility. Reuse hero/release regressions; pnpm docs:build,git diff --check. Headless browser light/dark320/390/768/900/960/1280/1920 inclnoJS, menus/focus/route cleanup/hidden. Record screenshots/video, no visible GUI. Preserve encoding/newlines; no dependency changes/commit/push.
## User steering during implementation
Frame exterior must become solid opaque color when present; preserve gradient inside. Add restrained inner aperture contour and a subtle visible hero/below-fold boundary, without added height or heavy decoration.
