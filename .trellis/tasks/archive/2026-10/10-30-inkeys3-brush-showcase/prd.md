# 多样笔触教学展示图

## Goal
制作 16:10 真实课堂批注展示图；背景、批注草稿、原生离屏三个阶段，前两阶段完成必须等待用户确认。本轮仅第一阶段，用户已批准方案及任务创建。

## Requirements
- 保留图二 Windows 11 / Chrome 外壳；日期 2025/10/07，时间 09:02；修正不合理 UI。
- 真实五页 A4 英文教材 PDF，仅文字数学与排版线条，无插图。展示第三页，3/5；所有缩略图准确来自 PDF。
- 衬线正文、数学字体、克制蓝色标题、定理证明例题层级。正文上置，下方留足书写空间；阅读区内居中，灰色左右边距对称。
- 题目：边长 6 cm，过中心垂直体对角线截面；证明六棱中点和正六边形、求周长面积；平移距离 d，0 <= d < sqrt(3) cm，求面积函数与最大值。附至多六边的正确定理证明，不印刷例题答案。
- 第一阶段交付真实 PDF、1600x1000 预览、3200x2000 母版、可重建文件；没有墨迹、白刷或 Inkeys 主栏。
- 第二阶段：黄色平头重点、左侧灰区坐标辅助计算、下方红色手写推导；右侧纯白不透明平头刷跨接缝，立方体中心截面与下方截面图，少量激光及底部主栏。所有文字公式标号自然手写；图形规范。
- 第三阶段：UI3/Draw3 原生墨迹，feature/shape 图形允许演示局部适配；主栏 en-US、绘制模式、红色软笔 #FF1000，指示器和边缘光效原生同红，Undo 启用、Redo 禁用。白刷不能沿用固定 35% 荧光透明度。
- 不改网页、不发布、不 commit/push、不打开 GUI；保留既有本地改动。

## Acceptance
- [x] PDF 数学、文本、缩略图一致，排版无缺字裁切；阅读区两侧对称，图像无旧插图残留。
- [x] 尺寸、日期、当前页正确，留足后续手写空间。
- [x] 背景交付后等待确认，不提前制作下一阶段。
- 后续数学基准：ell=3sqrt(2), P=18sqrt(2), S0=27sqrt(3), S(d)=27sqrt(3)-3sqrt(3)d^2；平移截面不标为正六边形。
## User correction during stage 1 review
- sqrt(3) must be properly typeset with a radical vinculum over the radicand (LaTeX style), not a bare Unicode root glyph beside 3. Fix in actual PDF and regenerate all derivatives.
- Replace right system tray styling using C:/Users/alan-/AppData/Local/Temp/codex-clipboard-31884fee-e6df-41d8-a69b-d34b5baaef78.png: authentic caret/Wi-Fi/volume/battery spacing and glyphs, clock font/weight/spacing matched to reference. Keep established 09:02 and 2025/10/07. User authorizes source image compositing. No stage2 yet.
## Approved content refinement
User approved replacing part (c) only: The cutting plane is translated a distance d cm towards G along AG, where 0 <= d < sqrt(3). Let S(d) be the area of the resulting section, in cm². Find S(d) and determine its maximum value over this interval.
Preserve mathematical typesetting (italic variables, radical vinculum, superscript units), regenerate PDF and backgrounds, and stop before ink. Later central-section diagrams must be marked d=0.
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