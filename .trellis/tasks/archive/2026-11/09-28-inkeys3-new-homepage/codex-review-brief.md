# Read-only code review: new-index3 redesign (do NOT modify any file)

Repo: D:\Project\Inkeys\website (VuePress 2 + vuepress-theme-plume, Vue 3 SFC, SSR build).
New/changed files under docs/.vuepress/theme/components/NewHome3/:
- stackProjection.ts — 3D math shared by CSS transforms and hit testing.
- useShowcaseStack.ts, ShowcaseStack.vue, ShowcaseStack.css — layered image stage: layers absolutely positioned in a `preserve-3d` plane; the plane gets CSS `scale3d(s,s,s) rotateX(ax) rotateZ(az)` inside a parent with `perspective: P` (perspective-origin centre), and an outer wrapper translated by (tx,ty). Hit testing unprojects the pointer onto each layer plane z = depth via `unproject`.
- InkStroke.vue — scroll-scrubbed giant stroke drawn with existing softPen.ts `createPainter` (custom single-stroke Scene).
- ReleaseFinale.vue, PendingScenes.vue, showcaseContent.ts, FeatureSections.vue (modified; uses CRLF).
- Data: showcaseLayers.json (generated).

Please check carefully and report concrete findings with file:line, severity, and a suggested fix:
1. Is `transformPoint`/`project`/`unproject` exactly consistent with how the browser applies `perspective` on the parent + `transform: scale3d rotateX rotateZ` (transform-origin 50% 50%) on the plane + `translate3d(0,0,z)` on each layer + the wrapper translate? Check sign conventions (CSS rotateX direction, y-down screen), and whether perspective-origin and transform-origin coincide given the DOM structure (.showcase-anchor > .showcase-perspective > .showcase-plane > .showcase-layer > .showcase-lift > img). Verify the 2x2 linear solve in `unproject` algebraically.
2. Does anything in the 3D chain accidentally flatten preserve-3d (opacity, filter, clip-path, overflow on ancestors, etc.)?
3. SSR/hydration safety (window/document access outside onMounted, mismatched attributes), memory leaks, listener cleanup.
4. softPen createPainter usage in InkStroke: anything in createPainter that breaks with empty `raw` arrays, a single stroke, or bounds equal to the canvas box? Performance concerns at full-viewport canvas.
5. Vue reactivity/performance: per-scroll-frame recomputation cost; anything that recomputes on every pointermove unnecessarily.
6. Accessibility and reduced-motion handling.
Keep the report concise; English is fine. Do not run builds; do not modify files.
