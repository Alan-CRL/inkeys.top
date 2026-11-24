# Design

## Boundary
只新增 media/inkeys3-brush-showcase/ 制作文件，不改 media/inkeys3-hero/ 或 docs/。用户已批准完整方案；本轮背景交付即停止。

## Stage 1
- 来源 C:/Users/alan-/AppData/Local/Temp/codex-clipboard-c9c77e79-6dd7-46aa-8ba5-6896167c5165.png，复制到独立 sources 便于重建。
- ReportLab 制作五页教材节选，印刷页码 69–73；第三页为本题，邻页也为相关真实文字。实际渲染 PDF 当前页及五张缩略图。
- Pillow 确定性合成替换阅读区、缩略图区、页序/缩放/日期，保留外壳像素。用户已明确授权实际 PDF 渲染嵌入图片。
- 输出 build/background-preview.png (1600x1000)、build/background-master.png (3200x2000)、output/solid-geometry.pdf 及页面渲染供 QA。
- 平衡页宽字号、下方留白和两侧批注；正文和数学清晰，母版 PDF 原生高分辨率渲染，外壳仅等比放大。
- 使用 bundled Python；首次制作先执行 pdf skill 的 authoring marker。优先 Poppler 渲染，缺失时记录实际渲染器。

## Later stages
自然手写中心线/时序及图形坐标独立保存。复用 HeroExport 的 SoftPen/SetPenColor/NoteRecallHistoryAvailability/locale，防止离屏刷新重置 Undo。白刷完全不透明平头。规范 shape 来自生产路径；临时适配按字节恢复，记录来源。层序：背景/重点/白刷/图形手写/激光/主栏。

## Interface
无网站 API 修改。制作脚本无 GUI，保存来源、布局和稳定输出供下阶段复用。
## Stage 2 authorization and execution
User explicitly confirmed stage 1 has no remaining issues and requested next stage. Implement direct-composited annotation draft only; freeze background/PDF. Deliver draft-preview.png (1600x1000), draft-master.png (3200x2000), transparent layers and reusable handwritten centerlines/shape coordinates. Stop for confirmation before native rendering.

Handwriting must be drawn as natural centerline strokes, not ordinary or outline font text; small baseline, spacing, inclination and stroke-speed variation. Reuse/extend first-screen hand centerline conventions. Keep essential formulas legible. Geometry uses exact projected cube/section vertices with proper hidden edges; draft direct raster is a proxy for feature/shape in stage3.

Suggested proof sequence: left gray area A=(0,0,0), G=(6,6,6), O=(3,3,3), plane x+y+z=9; k=9+sqrt(3)d. Below example: M=(6,3,0), N=(3,6,0), MN=OM=ON=3sqrt(2), 6 equilateral triangles -> regular hexagon; P=18sqrt(2), S0=27sqrt(3). Area subtraction S(d)=sqrt(3)/2 [k²-3(k-6)²]=27sqrt(3)-3sqrt(3)d², max at d=0. Use compact fraction/radical/superscript hand construction, not long prose.

Right white flat opaque broad brush strokes cross paper edge and overlap some original content; regular cube projection above, true planar regular hexagon below, both central section d=0. Labels M,N,P,Q,R,S consistently in cyclic order matching actual midpoint coordinates. Cyan/blue lines with restrained transparent fill, dashed hidden cube edges, red handwritten labels and120° note. One small laser emphasis. Yellow flat highlights on meaningful original conditions.

Keep Chrome/PDF toolbar, sidebar, taskbar unobscured. Toolbar footprint at bottom of content above taskbar, centered; use existing matching native en-US toolbar only if available, otherwise explicit draft proxy with correct red soft-pen drawing/Undo states; do not perform native build until approval. Be honest that entire stage2 is a composited layout draft.
## Stage 2 revision requested by user
- Native toolbar placement must anchor visible solid body bottom to taskbar top (preview y942); exclude shadows, glow, transparent canvas margins. Proxy follows same body anchor now.
- Expand actual intermediate reasoning, not just final results. More spacious lower lines, uneven baselines/indentation/cluster positions; allow small intrusion into Solution/printed whitespace. Add helper arrows/brackets and purposeful working.
- Semantic phrase highlighters follow slightly uneven/slope paths; selected phrase gets offset double pass with real alpha overlap. Add red soft circles/marks on question and blue emphasis on red work.
- Cube/hex outlines only, NO filled faces/sections; blue geometry and red working. Laser emphasizes a geometric structure rather than max answer.
- Warm off-white opaque flat brush with overlapping diagonal/return wiping sweeps. Dot texture clipped to union swept area, globally aligned phase, no overlap darkening; intentional relationship to geometric construction. This is a future textured-brush demonstration in draft, not a claim of existing native product support. Original PDF/background unchanged.
- Continue stage2 and stop for review, no native rendering or product code changes.
## Stage 3 authorized
User approved v2 and requests actual native offscreen rendering now. Laser change: clearly encircle triangle O-M-N and repeatedly scribble inside it (real laser path coverage, not a flat triangle fill). Keep labels/angle readable where feasible.

Use existing Inkeys-draw and Inkeys-hero-shape worktrees, preserve unrelated changes, temporary adapter installation with byte-perfect restore. No HWND/GUI, no commit/push. Build InkeysRepo.sln Debug|ARM64 using vswhere-discovered native ARM64 MSBuild; normalize Path/PATH in same PowerShell invocation, allow at least5min. Do not bypass signing or alter toolchain/deps.

Native worker owns media/inkeys3-brush-showcase/native/ and sources/native/, plus temporarily installed adapter files only. Composition worker owns prepare_native.py, compose_native.py and data/native-scene.txt / native input manifest. Native input follows existing HeroScene text grammar, full3200x2000 coordinates, en-US, toolbar FF1000; layers ink-highlight, ink-brush, ink-handwriting, ink-laser (dev) and geometry(shape). Brush tool flat uses genuine production highlighter geometry with opacity1; standard highlighter honors requested alpha. Dot pattern may be production Whiteboard pattern masked by native brush coverage to demonstrate future texture-brush, clearly documented as composition rather than existing product brush mode.

Output native full-canvas transparent layers plus toolbar.png, toolbar-body.json (solidbodyrectangle nativecoordinates; NOT getbboxshadow), pattern if used, provenance/buildlog/failures. Compose onto frozen background using actual bodyrect to align bodybottom at preview y942; crop any shadow below taskbar plane so taskbar stays unchanged. Primary final outputs build/final-preview.png and final-master.png. Validate all renderedstate en-US/redsoftpen/drawing/nativeindicator and edgeglow/Undo enabledRedodisabled. Feature geometry outlines only, no fills. Verify stronger laser, legibility, layeropacity, hashes and restoration. Then independent review and final delivery.