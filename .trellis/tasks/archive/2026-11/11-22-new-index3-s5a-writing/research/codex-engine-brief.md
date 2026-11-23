# Codex brief — Draw3 engine facts for a promo animation (read-only)

You are investigating the Inkeys3 drawing engine "Draw3" in this repository
(`Inkeys/Inkeys/Drawing/Draw3/`, shaders in `Draw3/Assets/*.hlsl`, plus related
`.trellis/spec/` and `.trellis/tasks/` (incl. `archive/`) docs in this repo).
This is a READ-ONLY investigation. Do not modify, build or run anything.

## Why

The product website will get a ~21:9 Remotion animation (rendered in a browser,
NOT the real app) whose goal is to show (a) how fast / low-latency the new
drawing engine is and (b) how refined the "soft pen" (软笔) ink with real-time
pen tips (笔锋) looks. The animation may visualise internals (e.g. dirty regions,
prediction) but every claim and every visualised mechanism must be TRUE to the
code. We need facts, not marketing. Candidate topics the product owner suggested:

1. C++ / Direct3D / HLSL powered engine.
2. Ink drawn segment-by-segment into dirty regions ("逐段脏区绘制") — visualisable.
3. Reaches ~120 FPS on old PCs; ultra-low latency, "ink feels glued to the cursor".
4. Slow-motion view of ink prediction and real-time pen tip formation.

## Questions (answer each with file:line evidence)

A. Render pipeline: what are the buffer/layers (multi-buffer architecture), what is
   drawn per frame, how dirty regions are computed (per segment? union? tiles?),
   how they are presented (DXGI Present1 dirty rects? UpdateLayeredWindow? DComp?).
   Describe what a faithful visualisation of "segment-by-segment dirty region"
   would look like (rect shapes, sizes relative to stroke width, lifetime).
B. Input-to-photon path: RealTimeStylus usage, the "atomic data link", frame
   latency gate, composition clock, timer period, any "low latency" mode or
   setting, mouse vs pen vs touch paths. What concretely makes latency low?
C. Ink prediction: algorithm, prediction horizon (ms / points), how predicted
   segments are drawn and later replaced/corrected, any tunables.
D. Real-time smoothing ("hand-tremor correction", ink time model) and the soft-pen
   pen tip: how width varies (speed? pressure? time?), how the start/end taper is
   generated in real time, whether the tail is re-shaped after pen-up, which pen
   types use it (soft pen vs hard pen vs highlighter vs brush). Give the actual
   parameters/curves where readable, so an animation can reproduce the shape.
E. HLSL: what each ink/shape shader does (SDF? analytic AA? instancing? capsule
   segments?), and the laser particle compute shaders.
F. Performance evidence: any recorded FPS / latency numbers, benchmarks, device
   performance model/ledger, old-hardware or Win7/WARP fallbacks, frame pacing
   (e.g. 120 Hz targets). Quote numbers ONLY if they appear in code/docs, and
   say where. Note what is NOT supported by evidence.
G. Which internal data could be exported to drive an authentic animation (raw
   input points vs smoothed vs predicted points, per-point width, dirty rects
   per frame), and whether existing debug overlays/diagnostics
   (CanvasDebug, RendererDebugOverlay, RuntimeMetrics, Diagnostics) already
   draw any of these.

## Output

Write the final answer in Simplified Chinese, Markdown, sections A–G, each with
concise findings + evidence (`path:line`). End with:
- "可安全对外宣称的事实" (plain-language claims that are true),
- "不能宣称或需谨慎的说法",
- "适合动画可视化的机制排行" (rank by visual appeal x truthfulness, 1–2 lines each).
Keep it under ~400 lines.
