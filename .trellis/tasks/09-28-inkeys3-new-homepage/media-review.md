# Feature media review — 2026-10-22

Scope: media-prd.md / media-design.md / media-implement.md; /new-index3 feature films and reproducible native exports. Original homepage PRD is historical context.

## Confirmed findings and coordination

- Native adapter restore wrote the original harness before checking whether the copied include had changed. Native owner moved the include check before either mutation. An isolated copied fixture verified conflict refusal preserves both files, while successful restore preserves UTF-8 BOM and CRLF exactly.
- Compositor re-trimmed finalized toolbar states individually, discarding the shared native canvas anchor. Template owner now retains the complete toolbar/pager canvas; sequence-union bounds remain for ink. Regression assertions were added to test_render.py.
- Initial mobile full-toolbar composition was too small at the actual 230px stage size (roughly 3px native labels). Template owner added an enlarged crop of the real native tool group for the three screen demos. Revised contact sheets reviewed; main session also approved encoding. Actual viewport screenshots remain a separate final check.
- Initial slides-binding WPS interval overlapped the pager close-up, cropping the app identity for nearly the whole WPS shot. Template owner moved text outside the camera layer and centered the complete enlarged pager while fading surrounding content. Revised desktop/mobile frames keep WPS readable during the close-up.

## Verification completed

- verify-feature-media.cjs: PASS. Compiled Vue SFC/template/style, SSR without browser globals, lazy posters/no SSR video source, manifest validation, missing-media fallback, entrance lifecycle, authoritative video time/ended, stale-event rejection, paused/deferred ending, autoplay rejection, source-change seek preservation, cleanup.
- test_render.py: four tests PASS, rerun after final compositor revisions. First attempt hit a Windows sandbox TEMP permission error; rerun with a writable local TEMP passed. Temporary fixtures removed. Shared native control canvas assertions are included.
- Final actual native manifest: PASS, 14 assets / 288 sequence frames / 302 PNG files. Every SHA256, RGBA mode and declared dimension verified independently after the final export. Export failures=0. Shared toolbar canvas is2355×286.
- No project lint or standalone type-check command exists. SFC/style compilation is covered, but is not claimed as a full type-check.
- Production site build and real headless webpage playback/representative screenshots are coordinated by the main session after final exports.
- verify-media-assets.py: PASS, exit0 on the complete first export. All eight scene IDs match the storyboard and webpage contract. Independently decoded all16 MP4s to210 frames each, checked1440×640 desktop /720×720 mobile dimensions, verified all16 posters and all8 GIFs total7000ms, and verified source/provenance hashes. FFmpeg discovery initially saw the sandbox-local LOCALAPPDATA; rerun with explicit FFMPEG_BIN pointing to the existing installation passed. No code workaround or download was required. The later mobile typography re-export is decoded by the template owner's final verify.py; this reviewer did not repeat the full decode after that scoped edit.
- Latest verification.json cross-check after the typography re-export: PASS, all40 delivered file hashes and byte counts match; total13,259,035 bytes (about12.64MiB).
- Revised desktop/mobile contact sheets and a frame decoded from the actual mobile slides-ink MP4 were inspected. Product controls are crisp in the enlarged shot; no alpha dark-edge defect was observed. This representative-frame review is not a claim that every frame or browser/device has been manually inspected.

## Reviewer result

No remaining confirmed code or artifact-integrity defect in the reviewed scope. The two local pipeline defects above were fixed by their owning agents and checked again; the two composition findings were addressed in the revised films. No web component changes were needed by this reviewer. Main-session production build and real viewport playback/screenshots remain the final integration gate, including small-screen subtitle legibility and paused resize behavior.

## Final static follow-up

- FeatureSections.vue now applies has-film only when the selected scene has a media entry. Its height:auto/aspect-ratio:9/4 matches1440×640, and the599px breakpoint switches to1/1 exactly alongside the video/picture mobile source selection. The two-class selector keeps height:auto above the later one-class fixed-height mobile fallback rules. Missing-media cards retain their existing fallback height, while failed videos keep the matching poster aspect. No new playback/entrance state is introduced.
- The ready scene uses36px copy only in mobile output; desktop remains31px for the first line and24px thereafter. With the actual local font, line widths are360px,375px and542px within the720px canvas, so the larger copy fits without clipping. Main-session second-pass viewport screenshots cover its actual displayed size.
- Partial-scene export now computes provenance.sources from every known scene retained in the merged manifest, not only the scene rendered during that invocation. Independently checked that the final list equals the union of all eight published scenes' required native sources, and that rendererSha256/sourceManifestSha256 match the current files.
- These follow-up changes have no remaining static review findings. Main session owns the final rebuild and second headless browser pass; no native source rerun or full video re-decode was requested from this reviewer.

## Boundaries

Real UI3/Draw3 renderer pixels and scripted states are verified; this is not a live Office/WPS/COM environment acceptance test. No interactive GUI or browser window was opened by this reviewer. No commit or dependency change was made. Native owner reports two compiled shader .cso files changed during the required solution build with unknown pre-build contents; they were preserved for main-session reporting instead of reset.

## Main-session integration result

- Final pnpm docs:build: PASS, exit0,51 rendered pages. Existing plugin timing notices only.
- verify-feature-media-browser.cjs: PASS, exit0 using headless Edge and an isolated project-local profile. Verified real H.264 playback/pause/ended, reduced-motion enabled, desktop/mobile sources, stage aspect ratios, and no horizontal overflow at1440/599/390/320px. Inspected final card screenshots, including ready mobile copy. Browser and local server closed successfully.
- Windows TEMP profile LOCK cleanup caused earlier test shutdown attempts to wait; using an ignored project-local profile/artifacts directory removed that environment-specific cleanup step. No production dependency or configuration was changed.
