# 多样笔触，自由表达：第一阶段背景

状态：背景和第二阶段草稿均已获用户确认；第三阶段原生离屏图层已导出并合成为最终图，待独立复核。背景/PDF与已确认草稿保持冻结。

## 输出

- `output/solid-geometry.pdf`：真实五页 A4 英文教材节选，印刷页码 69–73；第三页为展示例题。
- `build/background-preview.png`：1600×1000，供审阅。
- `build/background-master.png`：3200×2000，供后续原生墨迹合成。
- `build/page-1.png` 至 `page-5.png`：Poppler 实际渲染页面。
- `build/pages-contact-sheet.png`：本轮五页排版检查缩略总览。
- `build/layout.json`：画布、页面坐标、留白和来源哈希。
- `sources/chrome-reference.png`：用户提供的图二原文件。

背景由参考图的 Chrome / Windows 外壳和真实 PDF 渲染合成，并非浏览器 GUI 实拍。外壳等比缩放（原图 1586×992 与目标比例有约 0.08% 差异）；PDF 按母版分辨率单独渲染。时间 09:02，日期 2025/10/07。阅读区两侧灰色留白各 269 px（预览坐标），页面 x=508、y=145、宽 808 px，实际 A4 比例；Solution 标题区域从约 y=620 开始。102% 缩放对应 A4 以 96 CSS DPI 显示时的页面宽度。

## 重建

需要 Windows Times New Roman / Segoe UI、ReportLab、Pillow、pypdf 和 bundled Poppler。无 GUI，无网站或原生产品构建。

```powershell
& 'C:/Users/alan-/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' media/inkeys3-brush-showcase/build_background.py
```

脚本读取自身目录中的来源图，生成 PDF、五页渲染、两种分辨率合成与布局记录。首次来源复制使用用户附件路径，此后重建无需临时附件。PDF 使用确定性时间元数据。五张页面缩略图与主画面均由同一批 PDF 渲染缩放得到，无手绘占位。

## 本轮验证

- 生成脚本退出码 0；五页均为 A4，均无嵌入图片；当前题目存在，输出尺寸准确。
- Poppler 195 DPI 实际渲染成功，预览及五页总览已人工视觉检查：无示意图、缺字、裁切或重叠。
- 提取第三页文本确认 Unicode 的 ≤、√、立方体命名分隔符正确；Windows 终端直接输出部分符号时可能乱码，但 PDF 字形和提取码点正确。
- PDF 主字体为嵌入的 Times New Roman 与 Segoe UI；正文、斜体、粗体分别保留。
- 教材只给问题，不印刷中心截面及面积函数答案。例题 (c) 明确沿 AG 朝 G 平移 d cm，S(d) 的面积单位为 cm²，并在给定区间求最大值。
- 修正初版的日期旧字残留与阴影越过任务栏问题，最终无墨迹背景已复看。
- `git diff --check -- media/inkeys3-brush-showcase` 退出码 0（新增目录尚未暂存）。

后续必须先获背景确认，再制作直接合成的自然手写草稿；草稿确认后才进行 UI3/Draw3 与 feature/shape 离屏渲染。主栏必须 en-US、红色软笔绘制状态、原生红色颜色指示及边缘光效、Undo 可用、Redo 不可用。

## 背景复审修订

- 页 1 与页 3 的根式改为基线感知的 PDF 矢量排版：Times 根号/数字加跨过被开方数的横线，横线随 ReportLab Paragraph 换行定位。它实际写入 PDF，不是截图上补画；保留可搜索文字和正常字号。此实现不声称使用 LaTeX 引擎。
- 新来源 `sources/windows11-tray-reference.png` 为用户补充的 Windows 11 参考图。任务栏右侧的折叠箭头、Wi-Fi、音量、电池均取该图真实像素，按 58 px 任务栏高度原比例使用；旧图标全部覆盖。
- 时钟使用 Segoe UI 常规字重，右对齐，13.5 px 字号、18 px 行距，保留 09:02 / 2025/10/07。背景从同一参考托盘取样并在无图标区衔接。
- `build/math-detail.png`、`build/tray-detail.png` 为放大复核图，已确认根号横线连续覆盖数字、没有双箭头或旧日期残影。PDF、五张页面、缩略图、预览与母版已同步重建。
## 第二阶段：批注内容草稿

- `build/draft-preview.png`（1600×1000）、`build/draft-master.png`（3200×2000）。
- `build/draft-layers/`：重点标记、奶油色刷底、点阵、几何、手写、激光、主栏代理七个独立透明图层，另有刷子覆盖遮罩。
- `data/handwriting-centerlines.json`：原创手写字形中心线，不使用字体字形或轮廓描边。
- `data/draft-scene.json`：全部采样坐标与时间、笔宽颜色、文本布局、精确三维顶点及投影/截面坐标，坐标为1600×1000预览空间；第三阶段按2倍母版缩放。
- `build_draft.py`：确定性生成器，固定随机种子产生轻微字距、基线、倾斜和宽度变化；不修改已确认的背景、PDF或背景生成器。

```powershell
& 'C:/Users/alan-/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' media/inkeys3-brush-showcase/build_draft.py
```

本阶段整体是直接合成的内容/布局草稿，不是原生 Inkeys 截图。现有可访问的旧主栏为中文且 Undo 禁用，故未复用；底部为英文、红色软笔选中、Undo启用的主栏布局代理，最终必须替换成真实 en-US 原生UI，颜色指示和边缘光效按产品实际渲染。草稿图形以精确坐标直接绘制，后续替换为 feature/shape；草稿笔宽变化不是对生产软笔效果的验证。

立方体使用视向 (4,6,5)、单位正交屏幕基与单一比例 29 px/unit 的正交投影；隐藏棱为 A 相邻三棱，中心截面处于 x+y+z=9，循环标号 M,N,P,Q,R,S；六边长均为3√2，立体图和下方正视图都对应d=0。背面截面边使用虚线。当前 v2 刷子为用户要求的暖奶油色 #F6F1E5，不透明平头斜向去回擦拭；点阵仅位于扫过遮罩中。它是未来纹理刷演示代理，不代表已有原生能力。

验证：脚本退出码0；背景 SHA256 不变；当前464条带时序笔画、71个无填充图形段；六个点共面、六条边长度正确、相机屏幕基单位正交；手写中心线全部在阅读区域内，无浏览器/侧栏/任务栏覆盖。两种尺寸输出已整体视觉检查，修复了初版截面投影近乎退化、标号重叠、单位缺失和激光圈压字问题。

## 第二阶段 v2 复审修订

- 托盘位置按实体而非透明画布计算：代理实体半开边界 `[487,886,1159.5,942]`，下缘严格贴合任务栏顶部 `y=942`，任务栏像素没有覆盖。对应规则保存在 `draft-scene.json` 的 `toolbar.body_bounds` 和 `toolbar.anchor`；后续原生主栏同样必须使用实体边界，排除阴影和导出画布。
- 补充真实课堂中间过程：坐标代入得平面截距9；BC棱代入得y=3；长度平方与等边三角形/60°；周长乘6、面积按6个等边三角形；法向距离转为截距参数；大三角形减3个小三角形，展开再代入。用蓝色回圈、下划线、连接箭头衔接红色推导。
- 文字采用独立的微倾斜小组，增强缩进变化；主要推导行间距约42–50px。最终式移至右下独立计算组，避免分式或结果被主栏遮住。
- 荧光笔来自题目真实词语位置；“perpendicular”有两次弯曲错位涂画。每笔独立alpha合成，交叠更深，避免写入同一图层时覆盖掉上一笔透明度。
- 立方体和六边形全部无填充；深蓝立方体、亮蓝截面、蓝色虚线辅助线，内部可透出点阵。右手正交相机、前后遮挡和两图同侧绕序保留。
- 点阵以正视图中心 `(1372,742)` 为全局原点，间隔18px；只生成一遍后裁切到扫过遮罩，重叠笔刷不会加深或错位。几何不为对齐点阵而变形。奶油色不是全页底色。
- 激光最终强调正六边形 O-M-N 的两条半径和60°中心角，保留轻微暖色光晕；不再圈最终答案。原120°内角标注仍保留。
- `build/draft-v1-preview.png`、`build/draft-v1-master.png` 保留上轮草稿作对照；当前正式草稿文件名不变。

v2额外验证：真实荧光重叠alpha高于单笔值；点阵alpha最大值固定且遮罩外为零；图形无多边形填充；主栏实体alpha边界准确到y942、任务栏内透明；中心线时间单调；背景与PDF冻结哈希一致。没有进行原生渲染或产品功能实现。


## 第三阶段：原生离屏成品

- `build/final-preview.png`（1600×1000）、`build/final-master.png`（3200×2000）是最终交付图片；`build/final-qa/` 保存真实图层合成细节。
- `prepare_native.py` 将已确认中心线坐标乘2，保留输入时间，生成 `data/native-scene.txt` 和 `data/native-input-manifest.json`。原生输入共4条荧光、14条不透明平头刷、443条软笔、19条激光路径、78个生产几何图形。
- 手写与蓝色圈画通过真实 Draw3 modeler、模拟压感、收笔和重放生成。几何通过 feature/shape 的 Line / Ellipse 工厂组合，轮廓无填充；立方体与截面仍使用已验证坐标。
- 用户批准加强的激光先围住O-M-N三角形，再多次来回涂划内部；使用生产激光 coverage/resolve，未使用三角形面填充。为保留蓝色60°的小度数符号，围圈右侧中点略向右让开，其余笔记和几何未改动。
- 实际主栏来自UI3，en-US、绘制状态、Soft Pen选中、原生红色笔色指示及边缘光效、Undo可用、Redo不可用。它不是草稿代理，未后期染色或重绘标签。
- 奶油色平头刷来自生产Highlighter几何，opacity=1；黄色荧光保留请求透明度。点阵来自生产Whiteboard的DrawThemePattern透明图层，平移 `[-8,-20]` 母版像素后按原生刷覆盖一次裁切。这仍是未来纹理刷的展示合成，不宣称产品已有纹理刷模式。

```powershell
& 'C:/Users/alan-/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' media/inkeys3-brush-showcase/prepare_native.py
# 原生导出及环境要求见 native/README.md；先导出dev，再导出shape。
& 'C:/Users/alan-/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' media/inkeys3-brush-showcase/compose_native.py
```

`compose_native.py` 不含草稿后备。它要求并校验输入hash、捕获实际EXE hash、适配器hash、输出像素/元数据hash、export日志hash与failures=0。来源证据在 `sources/native/provenance-dev.json`、`provenance-shape.json`，合成证据在 `build/final-validation.json`。

原生主栏实体矩形为 `[2972.5,343.5,5282.5,583.5]`（原始图像坐标，含真实DC变换与独立笔色按钮）。统一缩放0.4666667后，母版实体边界为 `[1107.5,1772,2185.5,1884]`，预览为 `[553.75,886,1092.75,942]`。以56px实体高度保护原笔记，不用阴影或导出画布作为贴边依据；任务栏平面以下光晕裁掉。

验证：原生dev/shape导出均failures=0；最终合成身份校验、尺寸和实体贴边断言通过。任务栏、浏览器顶部、缩略图侧栏与冻结背景逐像素一致。已在最终预览及放大图中核对英语UI状态、红色指示、可用Undo、软笔、规范虚线、点阵遮罩和60°/120°标注。未启动GUI、未发布、未提交Git。
