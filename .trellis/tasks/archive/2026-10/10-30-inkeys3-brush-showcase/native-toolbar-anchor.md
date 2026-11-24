# Native toolbar anchoring follow-up

User requires visible solid toolbar body bottom flush with taskbar top (preview y942), not PNG canvas bottom or nonzero-alpha shadow bounds.

Existing hero compose.py:218 crops image.getbbox(); compose.py:254 passes bottom to that trimmed image. Reusing this as-is would still align glow/shadow bounds, so it is insufficient for new scene.

Stage3 exporter must record the rendered solid body rectangle from native layout/render transform, then composition offset = taskbar_top - scaled_body_bottom. Preserve surrounding transparent/shadow pixels without using them as the anchor. Native source exposes TransformBarBottomDockBodyRect in Bar.BottomDock.h and uses it in Bar.RenderLoop.cpp; inspect actual current rendering path when implementing stage3 instead of hardcoding an alpha threshold or inherited gap. Current stage2 proxy can expose its explicit rounded body rectangle directly.