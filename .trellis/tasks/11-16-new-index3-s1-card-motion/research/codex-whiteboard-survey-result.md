# Inkeys 白板模式外观与行为调查

**分支 `refactoring/draw` · HEAD `bcc11421f45b9aca24054f807ccbec9540465859`**  
基准取自 `.git/HEAD`、`.git/refs/heads/refactoring/draw` 和对应的 Git 提交对象。报告以该提交的源码为准。部分工作区文件与提交有差异，相关行号已按 HEAD 核对。本次只读，未修改文件、构建、启动 Inkeys 或执行离屏导出。

下文 `Bar/`、`Draw3/`、`Whiteboard/`、`PageControl/` 分别指 `Inkeys/Inkeys/UI/Bar/`、`Inkeys/Inkeys/Drawing/Draw3/`、`Inkeys/Inkeys/UI/Whiteboard/`、`Inkeys/Inkeys/UI/PageControl/`。`native/` 指官网的 `D:/Project/Inkeys/website/media/nh3-remotion/native/`。尺寸使用源码的逻辑单位 DIP，另有说明时除外。

## 1. 白板的画布

**结论**

- **软件浅色和深色主题下，出厂白板都为 `#123B32`，不透明度 `1.0`，图案为 `Blank`。** 白板背景独立于软件主题。通过左下角 `More` → `Theme` 可选六种底色，按界面顺序为 `#123B32`、`#172A46`、`#000000`、`#FFFFFF`、`#E5E7EB`、`#F5F1E6`。每页有自己的背景设置。新页继承创建时所在页的设置，最近一次成功修改的设置也会存为下次启动的初始值。〔1a〕
- 图案只有 `Blank`、`Dots`、`Grid`。点阵横纵间距均为 **`24 DIP`**，点直径 **`2 DIP`**。网格横纵间距也是 `24 DIP`，线宽 `1 DIP`。浅底图案使用 `#000000`，深底使用 `#FFFFFF`，两者不透明度均为 **`0.18`**。浅底判据为 `299R + 587G + 114B > 128000`，所以默认绿底若开启点阵，会画白点。〔1b〕
- 图案尺寸随显示 DPI 换算。按物理像素计算，`step = 24 × dpiScale`，`diameter = 2 × dpiScale`。零视口以画布中心为格点，平移后每轴相位为 `(画布尺寸 / 2 − 视口偏移) mod step`，取非负余数。当前编译配置由 `Freeze` 背景窗口用 D2D 绘制底色和图案，点用 `FillEllipse`，网格用 `DrawLine`。`Draw3` 保留备用图案绘制路径。〔1b〕
- **能平移，不能缩放，画布倍率固定 `1.0×`。** 点主栏 `Move` 后，用鼠标左键、触摸、笔尖或笔尾拖动，兼容触控板可做平移手势。内容跟手等量移动，每轴视口限制为 `±1048576`，限制直接用于 Draw3 的后备缓冲坐标。惯性默认对触控板、触摸、笔尖开启，对鼠标、笔尾关闭。〔1c〕

**依据**

- 〔1a〕`Draw3/Draw3.WhiteboardModel.h:11–20`、`Whiteboard/Whiteboard.Theme.h:12–13`、`Whiteboard/Whiteboard.cpp:195–223`、`PageControl/PageControl.cpp::InvokeWhiteboardMenu`、`Draw3/Draw3.DrawingController.cpp::InitializeWhiteboardThemes` / `ExtendWhiteboardThemes`、`Inkeys/IdtMain.cpp:3920–3922、3967–3970`、`Inkeys/Inkeys/Other/Other.Config.cppm:63–67、503–512`。
- 〔1b〕`Draw3/Draw3.WhiteboardModel.h:5–9、23–41`、`Draw3/Draw3.WhiteboardPattern.h:12–18、47–76`、`Whiteboard/Whiteboard.Theme.h::DrawThemePatternPhase`、`Whiteboard/Whiteboard.PatternFollow.h::ResolvePhase`、`Draw3/Draw3.RendererPattern.cpp`。
- 〔1c〕`Draw3/Draw3.DrawingController.cpp::RouteSelectionDown` / `CanvasPanInput::ApplyToCanvas`、`Draw3/Draw3.TouchpadInput.h::ConfigureTouchpadViewport`、`Draw3/Draw3.CanvasNavigation.cpp::ApplyCanvasContentTranslationChecked`、`Draw3/Draw3.CanvasNavigation.cppm:16`、`Draw3/Draw3.InkDocument.cpp::IsValidViewport`、`Inkeys/Inkeys/Other/Other.Config.cppm:505–512`。

## 2. 白板模式下的界面

**结论**

- 以之前报告的展开、合并式、软笔选中、Undo 可用、Redo 不可用为基准，白板主栏的顺序为 **`Move → Soft Pen → Shapes → Erase → Undo → Clear → More → Close`**。`Select` 换成 `Move` 和 `barMove.svg`，`Freeze` 隐藏，分离式的 `Click-through` 在白板也隐藏。`Board` 对应的按钮仍处于选中态，同时显示 `Close` 和 `barCloseWhiteboard.svg`。`Soft Pen` 可以同时选中。首次进入白板默认选软笔，再次进入会恢复该工作区记忆的工具。处于放映中的白板可显示 `To show`，最小化后显示 `To board`。同一基准下，八列主栏主体由公式得出 **`605×80 DIP`**，含左侧主按钮和间距共 **`695×80 DIP`**，光影外扩另计。〔2a〕
- 主栏位置取决于进入前的状态和 `AutoDockMask`。默认 `1` 对进入前已展开的底部停靠栏生效，将其放到白板屏幕底部居中，底边距 `5 DIP`。浮动或折叠状态默认不触发自动居中。默认展开方向设置 `0`，沿用原方向。退出时恢复桌面主栏的位置、方向、折叠和停靠状态。〔2b〕

| 分页项 | 稳定状态的外观与行为 |
|---|---|
| 左下角 `305×80 DIP` | `Previous`、双行页码、`Next` 或 `Add page`、`More` |
| 右下角 `230×80 DIP` | `Previous`、双行页码、`Next` 或 `Add page` |
| 按钮与间距 | 每格 `70×70 DIP`，圆角 `4 DIP`，栏内边距和格间距均 `5 DIP`。从左边界起，每格左缘为 `5`、`80`、`155`、`230 DIP`，最后一格仅左栏有。两栏靠左右屏幕边缘，水平留边为 `5` 乘公共 UI 倍率，底部可见描边外缘留 `5` 屏幕 DIP。白板隐藏拖动柄。 |
| 外框材质 | 圆角 `8 DIP`，描边 `1 DIP`。默认常驻底浅色 `#FBFBFB`、`0.92`，深色 `#181818`、`0.80`。边框浅色 `#8B8B8`、深色 `#FFFFFF`，均为 `0.18`。用户常驻透明度和闲置淡化可改变实际输出。 |
| 图标与文字 | `Previous` 用 `barMore.svg` 旋转 `−90°`，`Next` 用同一 SVG 旋转 `90°`，`Add page` 用 `barAdd.svg`，`More` 用 `barMenu.svg`。标准图标 `28×28 DIP`、中心向上 `10 DIP`，按钮文案 `13 DIP`、中心向下 `20 DIP`。 |
| 页码 | 视觉上是上下两行，例如上行 `1`、下行 `/3`。当前页为 `28 DIP` 粗体，中心向上 `10 DIP`，总页数为 `13 DIP` 常规字重，中心向下 `20 DIP`。点击白板页码未找到跳页动作。 |
| 首尾页 | 第一页的 `Previous` 禁用，内容不透明度浅色 `0.45`、深色 `0.30`。最后一页显示 `Add page`，点击创建空白页并进入。初次启动的白板从一页开始，因此右箭头槽一开始就是 `Add page`。白板固定页数上限**未找到**。 |

- 表中控件之外，左下角 `More` 展开后有 `Close`、`Minimize whiteboard`、`Theme`，图标分别为 `barCloseWhiteboard.svg`、`barMinimize.svg`、`barPalette.svg`。有未保存页时，左下栏上方可见 `Some pages are not saved`。`Inkeys Whiteboard` 是原生弹出窗口的标题文本，画布内常驻标题或时钟**未找到**。〔2c、2d〕

**依据**

- 〔2a〕`Inkeys/Inkeys/Other/Other.Config.cppm::MakeDefaultFixedButtonsA1` / `MakeDefaultFixedButtonsA2`、`Bar/Bar.A2.h::ResolveBarA2Projection`、`Bar/Bar.Button.cpp:991–1101、1244–1262`、`Bar/Bar.Metrics.cppm:6–9、47–61`、`Inkeys/IdtState.cpp:1775–1807`、`Inkeys/src/i18n/en-US.jsonc:71–110`。
- 〔2b〕`Inkeys/Inkeys/Other/Other.Config.cppm:399–407`、`Bar/Bar.BottomDock.h:19、54–88`、`Bar/Bar.RenderLoop.cpp:13014–13086`。
- 〔2c〕`PageControl/PageControl.cppm::ResolveSurfaceLayout`、`PageControl/PageControl.cpp:1000–1022、1065–1101、3141–3149`、`Bar/Bar.Metrics.cppm:24–36、262–272`、`Bar/Bar.Scene.cpp:200–225、474–548、697–733、797–827`、`Bar/Bar.Main.cppm:322–326`、`Bar/Bar.ThemeMaterial.h:41–55、77–91`、`Bar/Bar.Theme.cppm:94–109、183–187`、`Inkeys/Inkeys.rc:450–469`。
- 〔2d〕`Whiteboard/Whiteboard.cppm::ResolvePageState`、`Draw3/Draw3.DrawingController.cpp:21336–21373`、`Draw3/Draw3.InkDocument.cpp::InkCanvasCollection::AppendPage`、`Bar/Bar.Scene.cpp:590、1105–1124`、`Inkeys/IdtMain.cpp:3681、3796–3797`。

## 3. 翻页

**结论**

- **画布没有过渡动画，立即切换。** 目标页可用时，Draw3 更新当前页、清理上一页渲染状态并呈现目标页。常态页码也立即更新。冷页需要先异步读取，等待期间锁住分页输入。等候达到 `500 ms` 时，分页可以显示 `Wait`、变淡并出现加载环。等待反馈淡入 `180 ms / EaseOutCubic`，淡出 `140 ms / EaseInCubic`，环的周期为 `1.4 s`。到达或离开末页时，`Next` 与 `Add page` 的图标和文案可走普通按钮的 `0.4 s` 内容过渡。〔3a〕
- **各页独立保存墨迹，翻回原页仍在。** 每页有自己的文档、渲染和历史状态。离页时请求保存，已保存的冷页可以从会话 `.uink` 文件重载。每页平移位置也会在当前会话内恢复。〔3b〕

**依据**

- 〔3a〕`Inkeys/IdtState.cpp:4528–4572`、`Draw3/Draw3.DrawingController.cpp:19393–19425、21404–21460`、`Bar/Bar.Scene.cpp:394–439、678–687`、`Bar/Bar.PageLoadingIndicator.h:12–39`、`Bar/Bar.Metrics.cppm:46`、`PageControl/PageControl.cpp:1028–1036`。
- 〔3b〕`Draw3/Draw3.DrawingController.cpp::WhiteboardViewportMemory`、`Draw3/Draw3.DrawingController.cpp:15970–16088、21404–21439`、`Draw3/Draw3.WhiteboardStore.cpp:92–114、132–138`。

## 4. 形状工具

**结论**

先点一次 `Shapes` 切换到形状工具，再点一次当前形状按钮打开面板。面板贴着主栏，按空间向上或向下展开，包含分类切换、形状按钮网格和当前形状的属性。选 `3D` 即可看到六种立体图形。〔4a〕

| 分类 | en-US 目录 |
|---|---|
| `General` | 可用 `Line`、`Arrow`、`Rectangle`、`Circle`、`Ellipse`、`Triangle`、`Parallelogram`、`Rhombus`、`Trapezoid`、`Regular polygon`、`Polygon`、`Polyline`、`Arc`、`Sector`。`Angle`、`Parallel`、`Perpendicular` 显示为禁用项。 |
| `3D` | 可用 `Cuboid`、`Cube`、`Cylinder`、`Cone`、`Prism`、`Pyramid`。球体**未找到**。 |
| `Coordinates & functions` | `Number line`、`Axes`、`Grid`、`Point`、`Parabola`、`Reciprocal`、`Hyperbola`、`Sine`、`Cosine`、`Tangent`、`Exponential`、`Logarithm` 在目录中均为禁用项。视频里的函数曲线可以表现为手绘，当前 `Shapes` 面板无法放置函数曲线。 |

**放置与参数**

六种立体图形都分两次拖动，**第一拖实时预览底面，第二拖实时预览完整立体，第二次松手提交**。第一拖用两个点确定底面。第二拖以竖直位移 `h = end.y − down.y` 定高度，`h < 0` 向上。〔4b〕

| 图形 | 第一拖 | 第二拖及可调参数 |
|---|---|---|
| `Cuboid` | 两点对应投影后底面短对角线的两端。底面中心取中点。令第一拖位移为 `(dx,dy)`，模型底面宽为 `abs(dx) + abs(dy)`，深为 `abs(dy) / 0.3535533906`。`dx × dy < 0` 时翻转斜轴。 | 独立决定有符号高度。编辑时可拉高度、缩放和绕模型 Z 轴转动底面，底面缩放保留原长宽比。 |
| `Cube` | 同一手势确定中心和斜轴方向，底面两边锁为 `max(abs(dx), abs(dy) / 0.3535533906)`。 | 第二拖决定高度方向，高度绝对值锁为边长。 |
| `Cylinder`、`Cone` | 起点为底面中心。拖动距离为模型圆半径 `r`，屏幕底面椭圆半轴为 `r` 和 `r/3`。 | 第二拖确定高度。圆柱顶面平移到 `(0,h)`，圆锥尖在底面中心正上方或正下方 `(0,h)`。 |
| `Prism`、`Pyramid` | 起点为底面中心，拖动距离为正多边形外接圆半径 `r`。初始第一个模型顶点为 `(r,0)`。 | 第二拖确定高度，初始顶面中心或锥顶偏移为零。棱数可选 **`3–8`**，默认 **`6`**。`Right prism` / `Right pyramid` 默认关闭，开启后锁住顶面或锥顶的横向偏移。关闭时，完成后的高度手柄可横向拖斜。 |

**重画公式与边线**

- 以底面中心 `C` 为原点。模型底面点 `v` 经 `baseRotation` 转为 `(x,y)` 后，显示坐标为 **`C + (x + kx·y, ky·y + z)`**。圆柱、圆锥用 `k = (0, −1/3)`。其余用 `k = (0.3535533906, −0.3535533906)`，镜向时将 `kx` 取负。矩形底面用顶点 `(±宽/2, ±深/2)`，正多边形底面用 `(r cos(2πi/n), r sin(2πi/n))`。设模型偏移为 `o`，棱柱顶面用 `v + o` 且 `z = h`，棱锥顶点用 `o` 且 `z = h`。〔4c〕
- 遮挡通过面法线判断。令 `θ = baseRotation`，视线取 `(kx cosθ − sinθ, −kx sinθ − cosθ, ky)`。外法线 `N` 满足 `N·view < −1e−6·|N|` 时为背面。一条边的两个相邻面都背向才画成隐藏边。圆柱、圆锥的轮廓母线从真实切点引出，圆弧按连续可见性合并，虚线相位沿弧延续。切点可按源码求得：令 `a = view.x − view.z·o.x/h`、`b = view.y − view.z·o.y/h`、`m = hypot(a,b)`，圆柱取 `q = 0`，圆锥取 `q = −view.z·r/h`。当 `m > 0` 且 `|q| < m` 时，两个切点角为 `atan2(b,a) ± acos(q/m)`。〔4c〕
- 六种立体图形都**只有描边**。线色、透明度及基准线宽取当前普通笔槽，和软笔共享。普通设备默认线宽 `3 DIP`。描边等宽，默认可见边为 `Solid`，可在面板切换线型。隐藏边强制 `Dashed`。设线宽为 `w`，虚线中心线为 **`4w` 实段、`6w` 间隔、`10w` 周期**，两端各延伸 `w/2` 圆头。默认 `3 DIP` 时中心线是 `12 / 18 DIP`，圆头后的轴向可见长度和净空约为 `15 / 15 DIP`。〔4d〕
- 提交后存为带构造参数的 `StoredInkType::Shape`。刚画完可在编辑框里拖动对象和手柄。编辑框在新接触、换页或切换场景等失焦操作中收起。**失焦后重新点选旧图形的入口未找到**，白板的 `Move` 用于平移整张画布。〔4e〕

**依据**

- 〔4a〕`Bar/Bar.Button.cpp:442–466`、`Bar/Bar.GeometryAttribute.cpp::ShapeCategoryCatalog`、`Bar/Bar.GeometryAttribute.cpp:397–409、453–462、675–700、990–1022`、`Inkeys/src/i18n/en-US.jsonc:165–227`。`Rounded rect.` 有资源和译名，面板目录无独立入口，见 `Inkeys/IdtState.cpp:2593`。
- 〔4b〕`inkStrokeModelerTest/draw3/shape_interaction.inl::MakeSolidConstruction` / `SolidBasePreview` / `ConstructionSession::Generate` / `PreviewDrag` / `ConfirmDrag` / `EditShape`、`Draw3/Draw3.DrawingController.cpp:3982、4087–4122`、`Inkeys/IdtState.h:139–149`、`inkStrokeModelerTest/draw3/shape_core.h:33–36`、`Bar/Bar.GeometryAttribute.cpp:444–446、1001–1014`。
- 〔4c〕`inkStrokeModelerTest/draw3/shape_presets.inl::SolidProjection` / `ObliquePoint` / `ObliqueBase` / `ExpandOblique`，尤其 `:124–190`。
- 〔4d〕`Inkeys/IdtState.cpp::GetShapeStyle` / `GetPenColor`、`Draw3/Draw3.DrawingController.cpp:3952–3954`、`inkStrokeModelerTest/draw3/shape_presets.inl:234–236`、`Draw3/Assets/shapePixelShader.hlsl:5–16、37–55`。
- 〔4e〕`Draw3/Draw3.ShapeRuntimeActions.inl:297–351、373–420、448–467`、`Draw3/Draw3.DrawingController.cpp:1811、23164`、`Bar/Bar.ShapeEditor.cpp:972、3541–3546`。

## 5. 白板里的笔

**结论**

| 使用场景 | 初始软笔色 | 初始基准线宽 |
|---|---|---|
| 桌面批注 | `#FF1000` | 普通设备 `3 DIP` |
| 浅底白板，例如 `#FFFFFF` | `#FF1000` | 同桌面，普通设备 `3 DIP` |
| 深底白板，包括默认 `#123B32` | `#FFFFFF` | 同桌面，普通设备 `3 DIP` |

- 笔色槽按照**画布底色的亮度**选取，浅底白板、深底白板和桌面各自记忆普通笔色。软笔粗细全局共享。大屏模式仍是上一份报告的中档 `4 × contentScale / systemScale DIP`。因此在出厂绿底上，只切换软件浅深主题，两版的默认软笔都为 `#FFFFFF`。〔5a〕
- 调色板沿用桌面默认顺序：`#FFFFFF`、`#000000`、`#FF8B00`、`#321EB5`、`#FFC510`、`#FF1000`、`#4EA1B7`、`#326ED9`、`#66D552`、`#306C00`、`#FF1ECF`。预设 alpha 为 `255`，第十二格为自定义入口。〔5b〕
- **默认书写时，触摸、屏幕笔、数位板和鼠标都不显示 `PenIcon`。** 触摸为 `None`。屏幕笔悬停为 `Dot`，默认落笔隐藏。数位板默认为 `HighlightDot`，落笔仍可见。鼠标使用系统 `Arrow`。为相应设备选择 `Pen` 或 `HighlightPen` 后，软笔和硬笔可以在接触书写时显示 `PenIcon`。白板使用同一设备光标策略。〔5c〕

**依据**

- 〔5a〕`Inkeys/IdtState.cpp:50–84、1450–1465、2099–2113`、`Inkeys/IdtState.h:70–79`、`Inkeys/Inkeys/Business/PenWidthPolicy.hpp:13–25、49–73`。
- 〔5b〕`Bar/Bar.Theme.cppm:210–228`、`Bar/Bar.Initialization.cpp:450–618`。
- 〔5c〕`Draw3/Draw3.CursorSettings.h:7–42、74–88`、`Draw3/Draw3.PenCursor.cpp:30–61、336–405`、`Draw3/Draw3.Bridge.h::ResolveCursorSettingsForTool`、`Inkeys/Inkeys/Other/Other.Config.cppm:518–530`。

## 6. 离屏导出的可行性

**结论**

- **白板主栏可复用现有适配。改动集中在 `HeroExport.inc`、`export.py`、`crop.py` 三个文件。** 现有导出固定为桌面场景。当前源码已有无 HWND、无 Draw3 Host 的 `Inkeys::Testing::WorkspaceSceneScope`，现有主栏离屏测试已经用它切换到 `WorkspaceScene::Whiteboard`。适配可用同样方式设置已提交的白板场景，再选 `SoftPen`、设笔色和 Undo/Redo，推进真实主栏回调。验收改为 `Move`、`Close` 和八键布局，并检查 `Close` 与 `Soft Pen` 同时选中、`Freeze` 和 `Click-through` 隐藏。Python 编排新增白板状态和两个主题输出，裁切按新状态的主体矩形及按钮元数据校验。若输入仍用现有 `state` 字段，可沿用 `HeroScene.inc` 的解析。〔6a〕
- **白板和桌面主栏共用材质。** 默认展开底色与不透明度仍为浅色 `#FBFBFB / 0.92`、深色 `#181818 / 0.80`，透明 PNG 保留栏体及其光影。画笔颜色可改变边缘光，所以应把软件主题与白板笔色作为两个输入。若两版都使用出厂绿底，默认笔色都为 `#FFFFFF`。〔6b〕
- **分页也可沿用同一 PNG 管线。** `nh3-remotion` 当前入口要求 `scene->pagers.empty()`。官网已有 `inkeys3-theme-promo/native/HeroExport.inc` 的 `BarPageSurface` 导出先例，可复用其离屏渲染和 `HeroIo::SaveTarget` 读回。需要给定 `surface = 0` 或 `1`、`whiteboard = true`、主题、`en-US`、倍率、`currentPage`、`totalPage`，以及上一页可用性和 `nextIsAdd = currentPage >= totalPage`。以 `1/2 → 2/2` 为例，前帧为禁用 `Previous` 加 `Next`，后帧为可用 `Previous` 加 `Add page`。稳定态取 `menu = 0`、`unsaved = false`、无加载状态，展开主题菜单时再提供 `backgroundRgb`、`pattern` 等输入。若要还原左右两栏，需每主题、每所需页态各出两张，左栏 `305×80 DIP`，右栏 `230×80 DIP`，按 `PresentationBounds()` 读回以包含光影。〔6c〕
- **历史适配的编译基准为 `dev` 的 `c06697b1ab2ba01800edf677b4fb46d4d0e2de61`。** 当前 HEAD 中，现有适配使用的离屏入口、主栏回调、主题、布局、工具状态、Freeze 和 PNG 读回接口均找到。可复用的 `BarPageSurface` 也仍在。以下为符号存在性核对。〔6d〕

**依据**

- 〔6a〕`native/HeroExport.inc::ExportUi` / `Export`、`native/HeroScene.inc:10–20、40–46`、`native/export.py:29–30、118–149`、`native/crop.py:14–17、74–123`、`Bar/Bar.EraserAttribute.Test.cpp:877–893`、`Inkeys/IdtState.h:334–349`、`Inkeys/IdtState.cpp:3106–3143`、`Bar/Bar.Main.cpp:523–546`。后一个实现表明 `Bar::SetWhiteboardActive(true)` 会读取已提交场景，单独调用它不足以布置白板状态。
- 〔6b〕`Bar/Bar.Initialization.cpp:1314–1323`、`Bar/Bar.ThemeMaterial.h:41–52、77–91`、`Bar/Bar.Theme.cppm:94–109、183–187`、`native/HeroCommon.inc::SavePixels` / `SaveTarget`。
- 〔6c〕`native/HeroExport.inc:188–204`、`media/inkeys3-theme-promo/native/HeroExport.inc:121–151`、`Bar/Bar.Scene.cppm::BarPageSurfaceContent` / `BarPageSurface`、`PageControl/PageControl.cpp::BuildPageContent`、`Whiteboard/Whiteboard.cppm::ResolvePageState`。
- 〔6d〕`native/build/native-ui-bin/compiled-adapter.json:9–10、20–22`。当前 HEAD 中的符号如下。

| 接口 | 当前源码 |
|---|---|
| `RunEraserAttributeOffscreenTest`、`CreateBarOffscreenRenderCallback`、`BarPageSurface` | `Inkeys/IdtMain.cpp:2034`、`Bar/Bar.EraserAttribute.Test.cpp:191`、`Bar/Bar.Main.cppm:1566–1568`、`Bar/Bar.Scene.cppm:123–165` |
| `InitializeStartupPlacement`、`InitializeUI`、`LoadFormat`、`UpdateRendering`、`SetCurrentPageHasContent`、`NoteRecallHistoryAvailability`、`RecallChromeView` | `Bar/Bar.Main.cppm:80、903、954、967–969、1622、1666` |
| `PresetInitialization`、`RegisterBuiltInComponents`、`Load`、`StateUpdate`、`MainLayoutSnapshot` | `Bar/Bar.Button.cppm:290–300` |
| `SetThemeMode`、`SetResidentOpacity`、`SetThemeStyleSource`、`ConfigureLocalizedTypography`、`GetDeviceContext`、`GetTargetBitmap`、`DiscardDeviceResources`、`I18n::load` | `Bar/Bar.Main.cppm:1599–1601`、`Bar/Bar.Theme.cppm:127`、`Bar/Bar.Rendering.cppm:111、186、194、206`、`Inkeys/IdtI18n.h:48` |
| `ChangeStateModeToPen`、`ChangeStateModeToPenTool`、`SetPenColor`、`GetPenColor`、`GetCommittedStateModeSnapshot`、`GetWorkspaceSceneSnapshot`、`GetSelectAndClickThroughMode`、`SetSelectAndClickThroughMode` | `Inkeys/IdtState.h:172–183、227–241、260–263` |
| `Freeze::Snapshot`、`IsActive`、`Toggle`、`SetPresentationActive`、`SetWhiteboardActive`，以及 `ProductRunning` | `Inkeys/Inkeys/UI/Freeze/Freeze.cppm:19–27`、`Bar/Bar.Button.cpp:1751–1752`。`native/install.py:74–86` 的四个替换锚点在当前源码均各匹配一处。 |

## 不确定或未找到的事项

- **白板固定页数上限：未找到。** 已核对最后一页追加路径、页面容器和分页状态投影。依据 `Draw3/Draw3.DrawingController.cpp:19346–19362、21341–21373`、`Draw3/Draw3.InkDocument.cpp::InkCanvasCollection::AppendPage`、`Whiteboard/Whiteboard.cppm::ResolvePageState`。
- **跨程序重启恢复白板旧页的入口：未找到。** 已确认会话内冷页保存和重载，以及背景默认设置跨重启保存。依据 `Draw3/Draw3.WhiteboardStore.cpp:92–114、132–138`、`Inkeys/IdtMain.cpp:3920–3922、3967–3970`。
- **可用的函数曲线模板、球体模板、失焦后重选形状：未找到。** 依据 `Bar/Bar.GeometryAttribute.cpp::ShapeCategoryCatalog`、`inkStrokeModelerTest/draw3/shape_core.h::PresetKind`、`Draw3/Draw3.ShapeRuntimeActions.inl:297–351、373–420`。
- **白板导出改动的实际编译结果、裁切边界和 PNG 像素：未验证。** 本次只核对源码、符号及现有离屏渲染路径。实际构建记录对应第 6 节列出的旧提交。