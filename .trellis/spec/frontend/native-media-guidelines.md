# Native media export contracts

## Scope / trigger
Applies to product screenshots composed from Inkeys UI3 / Draw3 and feature/shape exports. Reference implementation: media/inkeys3-brush-showcase/. Do not modify the website or publish assets unless requested.

## Commands
Use the bundled Python for prepare_native.py, native/export.py --repository <repo> [--shape] [--skip-build], then compose_native.py. Native builds use the existing InkeysRepo.sln Debug|ARM64 and vswhere-discovered ARM64 MSBuild. Normalize duplicate Path/PATH in the same PowerShell invocation while preserving its value; disable node reuse. Allow at least five minutes. Isolate output binaries per task/build kind rather than sharing a live Inkeys.exe with other work.

## Contracts
- Input is full-canvas timed stroke/shape data; locale en-US and selected pen color must be set through production APIs, not painted onto exported UI.
- A capture manifest binds native-scene input, actual launched EXE, adapter sources, output layers, body/pattern metadata and export log by SHA256. Record source revision and build evidence; do not treat a revision label alone as binary identity.
- Toolbar body_rect uses actual native solid geometry plus device/render transform and MainButton/MainBar union. Placement is taskbar_top minus scaled body_bottom; exclude transparent capacity, shadows and glow from the anchor.
- Exported GPU premultiplied BGRA must be unpremultiplied into straight-alpha PNG. Preserve native paint order and per-stroke alpha overlap.
- Future texture-brush demonstrations may clip production Whiteboard pattern pixels to native brush coverage; document this composition separately from implemented product capabilities.

## Validation / errors
Missing layers, stale input/layer/metadata hashes, nonzero export failures or missing exporter marker must fail composition; never fall back to a draft UI/ink layer. A locked test EXE or overwritten shared output is an environment/concurrency issue: isolate outputs, do not kill unrelated processes or change project dependencies. Temporary installer preflights all anchors and collisions before writes; restoration checks all expected patched bytes before restoring any file, and refuses concurrent edits.

## Good / base / bad cases
Base: successful native capture with en-US red soft pen drawing state and enabled Undo on a populated page. Good: hashes match, final visible UI states are inspected, solid toolbar bottom meets taskbar top, taskbar pixels stay unchanged. Bad: hardcoded state JSON accepted as sole visual proof; cropping getbbox and aligning its shadow bottom; using an old capture with a new scene.

## Required checks
Check solution exit codes and failures=0 export logs, exact frozen-background hashes, all source/layer bindings, source restoration and removed temporary includes. Inspect final composite and UI/laser crops: indicator and edge light match actual pen color, Undo is enabled, outlines have no unintended fill, labels remain readable. Verify taskbar/browser/thumbnail pixels outside the annotation surface remain unchanged. Asset-only work does not need a website build; no GUI is required.

## Wrong / correct
Wrong: crop toolbar to nonzero alpha and set the PNG bottom to the taskbar. Correct: scale and translate the recorded solid body rectangle, clip only shadows beyond the taskbar boundary, then verify body contact and unchanged taskbar pixels. Wrong: claim a composed texture prototype is an existing native brush mode. Correct: distinguish native ink/UI/shape pixels from the documented future-texture composition.

## Integration follow-up
- For merged selection/click-through UI, set SetSelectAndClickThroughMode(0) through production APIs and validate actual visible labels/state. Reject Select(Clear) and Click-through specifically; ordinary Clear remains valid.
- Mature handwriting inputs distinguish physical Up, logical display time and last accepted movement. Use production idle/settling/recovery and preserve the 0.055-second taper; do not turn off taper to mask synthetic timing errors. Nominal pauses and observed movement ages can differ due to the 0.25px input gate.
- Capture-only replay of a verified private executable must not reinstall source adapters. Bind it to its compiled build manifest, not a newer worktree HEAD. Keep initial build restoration evidence separate from no-write replay snapshots if the worktree subsequently changes externally.
- A triangular dot prototype may use a native D2D pattern layer clipped by production brush coverage. It remains a disclosed future-texture composition, not an existing product mode. Preserve approved geometry and texture phase.

- Annotation curve flags must change the geometric path before time resampling: densely sampling sparse straight segments does not make a smooth curve. Use continuous/open or periodic/closed interpolation as appropriate, while preserving deliberate arrowheads, brackets and fraction bars; verify unchanged glyph data and pixels outside the edited strokes.

## Translucent settings layers

For the settings homepage, run `python media/nh3-craft/settings/export.py <native-repository>` with the bundled media Python. The adapter uses the product home, navigation, fonts and translucent palette in a windowless WARP render. Verify the output of each language/theme pair, including stable frames, fully transparent exterior corners, translucent shell pixels (alpha 204 in this palette), and opaque text/icons. The home banner uses alpha 179 over the shell. Inspect localized glyphs and compare the output hashes with the capture manifest.

A WARP texture contains window content. Windows composites the desktop blur separately. On the website, sample the actual wallpaper under the window, clip that sample to its outline and place the straight-alpha PNG above it. For preblurred fallbacks, reuse the full panel's wallpaper size, position and crop. Check the boundary on both sides of a responsive breakpoint and after switching themes. Compare the finished composite at the same wallpaper coordinates, including the area behind the banner: testing the blur with the foreground hidden misses excessive material opacity. Blurring the exported PNG softens the text and leaves the wallpaper sharp.

## Layered scene stills (new-index3 S2)

The three S2 scene cards are static compositions assembled in the page, not videos. Source: `media/nh3-scenes/build.py` (run with `python3`; `--only <card> --light --preview --reuse` while iterating). Output: `docs/.vuepress/public/dist-new-index3/s2/<card>-<layer>-<light|dark>.webp`, listed with hashes in `media/nh3-scenes/manifest.json`. Page side: `STAGES` in `SectionScenes.vue`.

Contracts:
- The panel design size is 1600x1000. Every position in `STAGES` is a percentage of it and must equal the pixel values in `CARDS` in `build.py`; a UI layer's width is its image width / 1600. Change both files together.
- Ink layers have exactly the content layer's pixel size and are stretched over it. They appear with `data-nh3-item="fade"` (no translation) so they stay registered with the content.
- Ink is rendered by InkeysRenderer. Text uses `text` elements. Every other line (figures, straight and dashed lines, underlines, arrow shafts, brackets) uses raw `stroke` samples from `pace()`: curvature-based speed, deceleration to 0.15 of peak, then about 130 ms of repeated end-point samples before pen-up, which removes the tail taper. Only arrowheads, annotation loops and check marks end while moving. Do not use `path` for these lines: its pen-up always happens while moving, and the dwell option is internal to the renderer.
- `plan` covers `text` and `path` only. For `stroke` elements compare the last sample time with the frame time yourself (`render()` does this).
- UI layers are cropped to the union of the light and dark alpha bounds. Cropping each theme to its own bounds yields different sizes and shifts the layer when the site theme changes.
- Content sheets (report page, slide) are drawn by the same script, so ink positions are computed from measured text widths and chart geometry instead of typed in by eye. Numbers shown in the artwork must be self-consistent; recheck sums and ratios when data changes.
- UI is en-US for all three site languages until the renderer supports the other locales.

Required checks: preview composite per card and theme, a 3x crop of line ends (blunt, no taper), `npx vuepress build docs`, headless screenshots of the three cards in both themes at desktop and narrow widths (`verify-stage.cjs` in the archived task `11-24-nh3-s2-scene-stills`). Remind the user to upload `public/dist-new-index3/s2/` to 123pan.
