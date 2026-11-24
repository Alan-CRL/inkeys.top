# Task: decompose the two showcase images into web layers (pixel-exact)

Repo root: D:\Project\Inkeys\website (VuePress 2 + vuepress-theme-plume site). Windows 11 ARM64, Python + Pillow + numpy available.

## Goal
The homepage `/new-index3` will show the two showcase images ("overview" 2880x1620 and "tools" 3200x2000, light + dark themes) as a stack of separate, absolutely positioned transparent layers that can be exploded in 3D and hovered individually. You must produce the layer files + a JSON manifest such that stacking the layers with plain CSS normal alpha-over (in manifest order, opacity 1, each layer at its box, clipped by its optional polygon) reproduces the final images.

## Sources (read only, do NOT modify anything under media/)
- Final images to reproduce: `media/inkeys3-showcase-assets/overview/final/overview-{light,dark}.png`, `media/inkeys3-showcase-assets/tools/final/tools-{light,dark}.png`.
- The real composition code that produced them: `media/inkeys3-theme-promo/compose_hero.py` (wraps `media/inkeys3-hero/compose.py` + `media/inkeys3-hero/scene.json`, sources in `media/inkeys3-theme-promo/build/hero-sources-{theme}/`) and `media/inkeys3-theme-promo/compose_tools.py`. Read these carefully; they are the ground truth for positions, scales, diagonal split clipping, dividers, shadows, tagline text, taskbar, toolbar/pager placement.
- Collected layer copies + provenance: `media/inkeys3-showcase-assets/` (README.md, manifest.json).
- Note: for overview, only toolbar / ppt-pager / board-pager differ between light and dark; everything else is shared.

## Deliverables
1. `scripts/build-showcase-layers.py` — deterministic, re-runnable (`python scripts/build-showcase-layers.py`). It must import/reuse the existing compose logic (monkeypatching like compose_hero.py does is fine) rather than re-guessing coordinates. Strategy suggestion: instrument the compose functions so each paste/alpha_composite/draw onto the canvas is captured into its own transparent full-canvas RGBA layer, then group them.
2. Output images in `docs/.vuepress/public/feature-media/new-index3/layers/{overview,tools}/`:
   - each layer cropped to its alpha bbox, saved as WebP with alpha (quality ~85, method 6), in two widths: full canvas scale and half canvas scale. File names: `<id>-<theme>-<full|half>.webp` where theme is `light`, `dark`, or `shared` (use `shared` when the layer is identical for both themes).
   - Opaque bottom layers (wallpaper, PDF background) can be lossy without alpha.
3. `docs/.vuepress/theme/components/NewHome3/showcaseLayers.json` with EXACTLY this schema:
```json
{
  "overview": {
    "width": 2880, "height": 1620,
    "layers": [
      {
        "id": "desktop",
        "box": [x, y, w, h],
        "clip": [[x, y], ...] or null,
        "themes": "shared" | "split",
        "half": true
      }
    ]
  },
  "tools": { ... same ... }
}
```
   - `box` and `clip` in canvas pixels (clip polygon coordinates are canvas pixels, not box-relative). Prefer baking clipping into the pixels and setting clip to null; only use clip if baking is impossible.
   - URL is derived by the site as `/feature-media/new-index3/layers/<page>/<id>-<theme|shared>-<full|half>.webp`.
   - Layers listed bottom to top.
4. Desired semantic layer ids (merge/split raw draw calls to match these; tell me if something does not fit):
   - overview: `desktop` (wallpaper + taskbar middle panel), `slide` (PPT slide background area, left panel), `slide-ink` (annotation ink on the slide), `board` (whiteboard background, right panel incl. dot grid), `board-shapes`, `board-ink`, `dividers` (the two diagonal split lines + their shadows), `wordmark` (rainbow Inkeys), `tagline` (the "Fluid ink. Beautiful motion." text), `ppt-pager`, `toolbar`, `board-pager`.
   - tools: `background` (Chrome + PDF + taskbar, opaque), `highlight`, `handwriting`, `brush`, `pattern`, `geometry`, `toolbar` — keep the real z order used by compose_tools.py; if order differs from this list, use the real order.
5. Verification built into the script: for each page and theme, re-composite from the exported FULL webp files (decode them, place at box, alpha-over in order) and compare with the final PNG. Print and write `media/../.trellis/tasks/09-28-inkeys3-new-homepage/layers-verify.json` (i.e. `.trellis/tasks/09-28-inkeys3-new-homepage/layers-verify.json`) with mean abs diff, 99.9th percentile abs diff, max diff, and total byte size of all outputs. Acceptance: mean < 1.0 and p99.9 < 24 (WebP loss) per channel; also verify against the lossless PNG intermediates where it must be exactly 0 or near 0. Also report total bytes of half-size files per page (target < 2.5 MB per page for half size).

## Constraints
- Do not modify anything under `media/`, `docs/.vuepress/theme/components/` (except creating showcaseLayers.json), or any config. Do not git commit. Do not install packages globally; if a Python package is missing, report it.
- Keep code comments in Simplified Chinese, concise, where non-obvious. UTF-8, LF.
- Do not touch the existing files in `docs/.vuepress/public/feature-media/new-index3/` other than creating the `layers/` subfolder.

## Report back (final message, English is fine)
Files created; layer list per page with box and themes; how each was derived from the compose code; verify numbers; sizes; any deviation, uncertainty, or layer that could not be separated (e.g. effects baked across layers).
