# Design and ownership

## Boundary
Frame worker owns new ScrollFrame.vue + scrollFrame.ts and NewHome3.vue integration/navbar overrides. Ambient worker owns new AmbientInk.vue + ambientScene.ts (names may have closely scoped companion helpers) and only ReleaseSection.vue fill/layer changes. Main owns task artifacts/specs and browser validation. Workers must not revert other work.

## Integration contract
NewHome3 imports ScrollFrame.vue and AmbientInk.vue. Add <ScrollFrame /> as zero-flow sibling, keep .nh3-root hero height/visibility owner unchanged. Wrap only below-fold content in <div class="nh3-below-fold"><AmbientInk /><ReleaseSection /></div>. Wrapper position:relative;isolation:isolate; ambient component absolute inset0,pointer-events none,aria-hidden; card/content above it. AmbientInk has no props; measures own root/parent container and .nh3-release-heading for placement exclusion. Background MUST show in gutters and faintly through card, not be hidden behind release root paint. No ambient above hero boundary.

## Frame
Use own fixed SVG/visual aperture rim, no portal/clone navbar, no theme dependency edits. Connect existing navbar via page root variables/state, restore on unmount. Existing theme mobile nav is relative until960px; page-scoped fixed override must preserve original64px(or CSS nav height) occupancy. Native menu state .screen-open and actual focused navbar lock shell; observer/events cleanup. Use pure injected state math, no perpetual RAF.

## Ambient
Use bounded small SVG/canvas tiles with document-anchored coordinates, seedable pure scheduler/paths. Reuse palette resolveSolidColor and active clock; reuse painter where practical without changing hero rendering. Hero createScene and full-screen eraser route are NOT generic background scenes. Shape morph is known-path interpolation, no recognizer/dependency. Offscreen/hidden freeze active time; schedule idle timeout rather than RAF. SSR no random content. Small cursor matches hero eraser design.

## Compatibility / rollback
User-approved shell replaces old forced-transparent navbar policy, background replaces previous no-background-decoration policy only below hero. Preserve prior card crop interactions and first-screen playback, manual pause, rendered shapes. Keep changes to feature-local files; revert only this task hunks if needed.