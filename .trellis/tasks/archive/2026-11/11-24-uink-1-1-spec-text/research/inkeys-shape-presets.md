# Research: Inkeys Draw3 图形预设与 `extra.inkeysShape` 元数据（供 UInk 1.1 对象层与预设附录）

- **Query**：21 个预设 + 4 种旧图形的完整清单、`construction` 序列化结构、各预设的几何派生、闭合虚线相位与弧细分容差、style/aux/transform/revision/id/部件引用、箭头与 dash 写法、可派生的冗余字段。
- **Scope**：internal（只读 `D:\Project\Inkeys\Repo\Inkeys`，分支 `refactoring/draw`，HEAD `97369702`）
- **Date**：2026-11-24
- **路径缩写**：`UK\` = `inkStrokeModelerTest/draw3/`，`D3\` = `Inkeys/Inkeys/Drawing/Draw3/`（均相对 `D:\Project\Inkeys\Repo\Inkeys`）。产品与测试工程共用 `UK\shape_core.cpp`（`Inkeys/Inkeys.vcxproj:1215`），以下行号即产品实际逻辑。
- **标注**：【码】= 代码中已核实；【建议】= 本文给规范作者的提议，不是现状。

---

## 0. 文件清单

| 文件 | 内容 |
|---|---|
| `UK\shape_core.h` | 全部数据结构与枚举：`PresetKind`、`ToolSpec`、`Construction`、`SolidConstruction`、`ShapeStyle`、`ShapeObject`、`Transform` |
| `UK\shape_core.cpp` | `ExpandPreset`（平面预设派生）、`Validate`、`BuiltinBuilder`（圆/椭圆/圆角细分）、`BuildPart`（变换与线宽缩放）、`BuildAuxiliaryGeometry`、`ClosedDashCoordinate`、`DashDistance` |
| `UK\shape_presets.inl` | 平面约束校验、正多边形顶点、`ArcPoints`、立体投影 `SolidProjection`/`ObliquePoint`/`ObliqueBase`/`ExpandOblique`、`ExpandAdvanced`（折线/多边形/弧/扇形/立体） |
| `UK\shape_interaction.inl` | `GetToolCapabilities`、`DefaultCreationMode`、`MakeSolidConstruction`（立体手势→构造）、编辑与翻转语义 |
| `UK\shape_uink_metadata.inl` | `extra.inkeysShape` v7 编解码（键名、类型、范围） |
| `UK\shape_uink_standard.inl` | 标准层写出：dashArray、Rectangle/Ellipse/Circle 原生类型、闭合虚线 8 段拆分、首项根 + 后续引用 |
| `UK\shape_uink_import.inl`、`UK\uink_draw3_import.cpp:141-231` | 读取：引用项校验、partCount 重算、退回标准层 |
| `UK\uink_draw3_export.cpp:82-236,458-488` | 旧四种图形的写出（非 Shape 类笔画） |
| `D3\Draw3.DrawingController.cpp:4036-4042` | 产品把矩形圆角 DIP 转为画布像素 |
| `Inkeys/Inkeys/UI/Bar/Bar.GeometryAttribute.cpp:126-160` | 工具栏目录，已有一套字符串 id（camelCase） |
| `Inkeys/Inkeys/Drawing/Draw3/Assets/shapePixelShader.hlsl:6-54` | GPU 虚线与闭合相位，与 CPU 公式一致 |

---

## 1. 预设清单（问题 1）

### 1.1 枚举与能力【码】

- `enum class PresetKind : uint32_t { Line, Arrow, Rectangle, RoundedRectangle, Circle, Ellipse, Triangle, Parallelogram, Rhombus, Trapezoid, RegularPolygon, Polyline, Polygon, Arc, Sector, Cuboid, Cube, Cylinder, Cone, Prism, Pyramid };`（`UK\shape_core.h:34-35`），数值 0–20 即文件里的 `tool.preset`。
- `enum class CreationMode : uint32_t { Drag, CenterRadius, Points, MultiStage, Parameters };`（`UK\shape_core.h:33`）。`Parameters`(4) 只在解码上限与测试中出现（`UK\shape_uink_metadata.inl:150`、`inkStrokeModelerTestTests\shape_uink_tests.inl:19`），**没有任何预设接受它**（`UK\shape_core.cpp:67-71`、`UK\shape_presets.inl:199`）。
- `enum class PlanarConstraint : uint32_t { Free, Isosceles, Equilateral };`（`UK\shape_core.h:38`）。
- 边数常量：`kMinRegularSides = 3, kMaxRegularSides = 14, kMaxSolidSides = 8`（`UK\shape_core.h:36`）。
- 默认创建方式 `DefaultCreationMode`（`UK\shape_interaction.inl:146-152`）：Polyline/Polygon → Points；`>= Arc`（弧、扇形、全部立体）→ MultiStage；Circle、RegularPolygon → CenterRadius；其余 → Drag。
- 能力 `GetToolCapabilities`（`UK\shape_interaction.inl:135-145`）：可填充 = 非 Line/Arrow/Polyline/Arc 且 `< Cuboid`；`regularSides` = RegularPolygon/Prism/Pyramid。
- 各预设允许的创建方式（`ExpandPreset`，`UK\shape_core.cpp:67-71`；`ExpandAdvanced`，`UK\shape_presets.inl:198-200`）：Circle = CenterRadius 或 Drag；RegularPolygon = CenterRadius；Triangle+Equilateral = CenterRadius；其余平面预设 = Drag；Polyline/Polygon = Points；Arc/Sector/立体 = MultiStage。
- `ValidPlanarConstraint`（`UK\shape_presets.inl:40-50`）：`constraintVertex` 只有 Triangle 可非 0 且 ≤2；`rightSolid` 只允许 Prism/Pyramid；`constraint` 只有 Triangle（Free/Isosceles=Drag，Equilateral=CenterRadius）与 Trapezoid（Free/Isosceles，Drag）可非 Free。
- 工具栏目录（`Bar.GeometryAttribute.cpp:126-160`）已有字符串 id：`line, arrow, rectangle, circle, ellipse, triangle, parallelogram, rhombus, trapezoid, regularPolygon, polygon, polyline, arc, sector, cuboid, cube, cylinder, cone, prism, pyramid`；**RoundedRectangle 不在工具栏**（测试 `Bar.GeometryAttribute.Test.cpp:337` 明确断言其缺席），但核心与解码器仍支持。目录中的 angle、parallel、perpendicular、numberLine、cartesian、grid、各函数曲线等 `preset = std::nullopt`，即**不存在**对应预设。

### 1.2 预设表

| 值 | 内部名 | 建议字符串 id【建议】 | 创建方式【码】 | `parameters` 变体【码】 | 主要约束【码】 | 派生 `kind`【码】 |
|---|---|---|---|---|---|---|
| 0 | Line | `line` | Drag | none | 起止点不重合 | Line(0) |
| 1 | Arrow | `arrow` | Drag | none | 起止点不重合；只描边不填充 | Compound(6) |
| 2 | Rectangle | `rectangle` | Drag | none | w>0、h>0 | Rectangle(1) |
| 3 | RoundedRectangle | `rounded-rectangle` | Drag | none | w>0、h>0 | Rectangle(1) |
| 4 | Circle | `circle` | CenterRadius / Drag | none | 半径>0；变换须为相似变换 | Circle(2) |
| 5 | Ellipse | `ellipse` | Drag | none | w>0、h>0 | Ellipse(3) |
| 6 | Triangle | `triangle` | Drag（Free/Isosceles）/ CenterRadius（Equilateral） | none 或 vertex(3 点) | `constraint`、`constraintVertex` | Polygon(5) |
| 7 | Parallelogram | `parallelogram` | Drag | none 或 vertex(4 点) | v0+v2 = v1+v3 | Polygon(5) |
| 8 | Rhombus | `rhombus` | Drag | none 或 vertex(4 点) | 平行四边形且四边等长 | Polygon(5) |
| 9 | Trapezoid | `trapezoid` | Drag | none 或 vertex(4 点) | Free：两底水平；Isosceles：上底中点在下底中垂线上 | Polygon(5) |
| 10 | RegularPolygon | `regular-polygon` | CenterRadius | none | sides 3–14；变换须为相似变换 | Polygon(5) |
| 11 | Polyline | `polyline` | Points | vertex(≥2) | 相邻点不重复；只描边 | Polyline(4) |
| 12 | Polygon | `polygon` | Points | vertex(≥3) | 简单多边形、面积≠0 | Polygon(5) |
| 13 | Arc | `arc` | MultiStage | arc | 0<\|sweep\|≤2π；只描边 | Polyline(4) |
| 14 | Sector | `sector` | MultiStage | arc | 0<\|sweep\|≤2π | Polygon(5) |
| 15 | Cuboid | `cuboid` | MultiStage | solid | 只描边；变换限制见 §3.6 | Compound(6) |
| 16 | Cube | `cube` | MultiStage | solid | baseSize.x=y=\|height\| | Compound(6) |
| 17 | Cylinder | `cylinder` | MultiStage | solid | baseSize.x=y（半径） | Compound(6) |
| 18 | Cone | `cone` | MultiStage | solid | baseSize.x=y（半径） | Compound(6) |
| 19 | Prism | `prism` | MultiStage | solid | sides 3–8；rightSolid ⇒ offset=0 | Compound(6) |
| 20 | Pyramid | `pyramid` | MultiStage | solid | sides 3–8；rightSolid ⇒ offset=0 | Compound(6) |

`Kind` 枚举：`Line, Rectangle, Circle, Ellipse, Polyline, Polygon, Compound` = 0–6（`UK\shape_core.h:32`）。

### 1.3 旧版四种图形（`legacyKind`）【码】

`enum class LegacyKind : uint32_t { None, SolidLine, DashedLine, OutlineRectangle, FilledRectangle };`（`UK\shape_core.h:78`）。它们**没有 `construction`**，由 `MakeLegacyShape` 构造（`UK\shape_core.cpp:782-797`）：

| 值 | 名称 | 建议 id【建议】 | kind | 样式 |
|---|---|---|---|---|
| 1 | SolidLine | `legacy-solid-line` | Line | 描边、Solid |
| 2 | DashedLine | `legacy-dashed-line` | Line | 描边、Dashed（dashArray `{4w,6w}`） |
| 3 | OutlineRectangle | `legacy-outline-rectangle` | Rectangle | 描边、Solid；`geometry.radius = 4`（名义 DIP） |
| 4 | FilledRectangle | `legacy-filled-rectangle` | Rectangle | 只填充 |

- 约束（`UK\shape_core.cpp:463-473`）：`aux` 必须为 0；`transform` 必须为单位矩阵；有 `construction` 时 `legacyKind` 必须为 None（`:453`）。
- 绘制时圆角 = `min(4 × displayScale, 半宽, 半高)`（`UK\shape_core.cpp:611-620`）；写标准层时用 `min(4 × dpiScale, 半短边)`（`UK\uink_draw3_export.cpp:219-222`）。文件不存 dpiScale，读取时按 1.0–4.0 的 10 个缩放档位逐一匹配圆角来识别旧矩形（`UK\uink_draw3_import.cpp:100-114`）。
- 旧图形不走 `AppendParametricShape`，由 `ConvertStroke` 写成单个 Line(0) 或 Rectangle(2)，若带对象则附加根元数据并写 `partIndex = 0, partCount = 1`（`UK\uink_draw3_export.cpp:474-487`）。

### 1.4 不由预设产生的对象【码】

`construction` 是**可选**字段（`UK\shape_core.h:109`，编码时 `if (shape.construction)`，`UK\shape_uink_metadata.inl:264`）。无构造的对象包括：旧四种；从无元数据的标准 Shape 导入的对象（`ShapeFromStandard`，`UK\shape_uink_import.inl:107-172`，kind 为 Line/Polyline/Polygon/Rectangle/Ellipse/Circle，矩形和椭圆用局部几何加旋转/缩放 transform 表达）。**这类对象的 `kind + geometry + transform` 是唯一真值，不能删。**

---

## 2. `construction` 现行序列化（问题 2）

### 2.1 结构【码】（`UK\shape_uink_metadata.inl:109-140` 写，`:141-192` 读）

```
construction: Map（恰好 4 键，否则无效）
  tool: Map（恰好 7 键）
    preset               uint   0–20
    creationMode         uint   0–4
    sides                uint   3–14（任何预设都必须写且在范围内）
    rectangleCornerRadius float  有限、≥0（ExpandPreset 检查，UK\shape_core.cpp:61）
    constraint           uint   0–2
    constraintVertex     uint   0–2
    rightSolid           bool
  start: [float, float]
  end:   [float, float]
  parameters: Array
    [0]                         → none
    [1, [[x,y], ...]]           → vertex（≤16384 点）
    [2, sweepRadians(float)]    → arc
    [3, [height, [bx,by], baseRotation, mirrored(bool), [ox,oy]]] → solid（定长 5 元数组）
```

- 点统一编码为 2 元数组 `[x, y]`（`UK\shape_uink_metadata.inl:76-84`）；浮点读取接受 float/double/int/uint，须有限（`:48-60`）。
- 变体序号 = `std::variant` 下标：`std::monostate, VertexConstruction, ArcConstruction, SolidConstruction`（`UK\shape_core.h:68`）。

### 2.2 字段语义、单位、默认值

| 字段 | 类型 | 单位 / 含义【码】 | 默认（`ToolSpec`/结构体初值） |
|---|---|---|---|
| `tool.preset` | uint | 预设，见 §1.2 | Line(0) |
| `tool.creationMode` | uint | 见 §1.1 | Drag(0) |
| `tool.sides` | uint | RegularPolygon 3–14、Prism/Pyramid 3–8；其他预设忽略但须在 3–14 | 3（`UK\shape_core.h:50`） |
| `tool.rectangleCornerRadius` | float | **画布局部像素**；只对 Rectangle 生效。产品从 DIP 乘系统缩放后写入（`D3\Draw3.DrawingController.cpp:4037-4039`；注释 `UK\shape_core.h:51`） | 4 |
| `tool.constraint` | uint | Free/Isosceles/Equilateral | Free |
| `tool.constraintVertex` | uint | 三角形约束顶点下标 a，底边为 (a+2)%3 → (a+1)%3（`UK\shape_presets.inl:11`） | 0 |
| `tool.rightSolid` | bool | 直棱柱/直棱锥：offset 必须为 0 | false |
| `start`、`end` | point | 画布局部坐标（与 `transform` 前的局部系一致），含义随预设变化，见 §3 | — |
| vertex | point[] | 局部坐标的顶点表 | — |
| arc `sweepRadians` | float | **弧度**，有符号；正值在 y 向下的画布中为**顺时针**；\|sweep\| ∈ [1e-6, 2π+1e-5]（`UK\shape_presets.inl:67`） | 0 |
| solid `height` | float | 屏幕竖直方向的高（局部像素），**负值向上**（`UK\shape_core.h:61`）；≠0 | 0 |
| solid `baseSize` | [x,y] | 长方体：底面长×宽；圆柱/圆锥/棱柱/棱锥：x=y=底面外接圆半径；均 >0 | — |
| solid `baseRotation` | float | 弧度，模型空间绕 Z 轴旋转底面，投影视角不变（`UK\shape_core.h:63`） | 0 |
| solid `mirrored` | bool | false = 斜轴向右上 45°，true = 向左上 135°；斜轴长度恒为一半（`UK\shape_core.h:64`） | false |
| solid `offset` | [x,y] | 顶面/锥顶相对底面中心的模型空间偏移，随底面一起绕 Z 旋转（`UK\shape_core.h:65`） | (0,0) |

---

## 3. 各预设的几何派生（问题 3）

记 `start = s`，`end = e`，`l = min(s.x,e.x)`、`r = max`、`t = min(s.y,e.y)`、`b = max`、`w = r-l`、`h = b-t`、`cx = l+w/2`、`cy = t+h/2`（`UK\shape_core.cpp:81-83`）。坐标系 y 轴向下。下列结果均为**局部几何**，最终再乘对象 `transform`（§5.3）。

### 3.1 平面预设（`ExpandPreset`，`UK\shape_core.cpp:56-155`）

| 预设 | 派生【码】 |
|---|---|
| Line | `geometry.start = s, end = e`（`:90-91`） |
| Arrow | Compound：部件 1 = Line s→e；部件 2 = Polyline 三点 `[base + n·1.5w, e, base − n·1.5w]`，其中 `d = (e−s)/|e−s|`，`head = 3w`，`base = e − d·head`，`n = (−d.y, d.x)`；部件 2 带 style 覆盖，`linePattern = Solid`（`:92-107`）。w 为对象局部 `style.width`。 |
| Rectangle | `start = (l,t)`、`end = (r,b)`、`radius = min(rectangleCornerRadius, min(w,h)/2)`（`:108-114`） |
| RoundedRectangle | 同上，但 `radius = min(w,h) × 0.2`，**不读** `rectangleCornerRadius`（`:112`） |
| Circle | CenterRadius：圆心 = s，半径 = \|e−s\|。Drag（外接正方形）：`side = max(w,h)`，半径 = side/2，圆心 = `s + (sign(e.x−s.x), sign(e.y−s.y)) × side/2`（负向取 −1，否则 +1）（`:115-125`） |
| Ellipse | 中心 (cx,cy)，半轴 (w/2, h/2)（`:126-127`） |
| Triangle | Free/Isosceles 且无 vertex：`[(cx,t), (r,b), (l,b)]`；Equilateral：`RegularPolygonVertices(s, e, 3)`，即 s=中心、e=首顶点（`:128-131`）。有 vertex 参数时直接采用 vertex（`:145-153`）。 |
| Parallelogram | `skew = (e.x − s.x)/4`；`[s, (e.x−skew, s.y), e, (s.x+skew, e.y)]`；s/e 为长对角线端点（`:132-137`）。**注意：直接用 s/e，不用 l/r/t/b。** |
| Rhombus | `[(cx,t), (r,cy), (cx,b), (l,cy)]`（`:138-139`） |
| Trapezoid | `[(l+w/4, t), (r−w/4, t), (r,b), (l,b)]`，顺序为上左、上右、下右、下左（`:140-141`） |
| RegularPolygon | `RegularPolygonVertices(s, e, sides)`（`:142-143`） |

- **正多边形朝向**（`UK\shape_presets.inl:51-62`）：首顶点 = e，第 i 个顶点 = 把 (e−s) 绕 s 旋转 `2πi/n`（公式 `x cos − y sin, x sin + y cos`）。在 y 向下的画布中为**顺时针**排列。
- **vertex 参数**（Triangle/Parallelogram/Rhombus/Trapezoid 被编辑后写入）的校验 `ValidPlanarVertices`（`UK\shape_presets.inl:2-39`），容差 `1e-4 × max(1,|a|,|b|)`：
  - Triangle：3 点；Free 无条件；Isosceles：顶点 a 在底边 (d→b) 中垂线上；Equilateral：再加 |a−b| = |a−d| = |b−d|。
  - Trapezoid：4 点；Free：`v0.y = v1.y` 且 `v2.y = v3.y`（底边保持局部水平，倾斜放进 transform，`UK\shape_interaction.inl:620-637`）；Isosceles：底 v3→v2 与顶 v0→v1 平行同向，顶中点投影到底中垂线，且非退化。
  - Parallelogram：`v0+v2 = v1+v3`；Rhombus：再加四边等长。
- **等边三角形编辑后**，`construction.start` 同步为三顶点重心、`end` 同步为 v0（`SyncEquilateralConstruction`，`UK\shape_interaction.inl:107-111`）。
- 空构造检查：Line/Arrow/RegularPolygon/Circle(CenterRadius)/等边三角形要求 \|e−s\|>0；其余（无 vertex 参数时）要求 w>0 且 h>0（`UK\shape_core.cpp:76-87`）。

### 3.2 折线与多边形（`UK\shape_presets.inl:203-215`）

- `geometry.vertices = parameters.vertices`；Polyline 至少 2 点，Polygon 至少 3 点，最多 16384（`kMaxVertices`，`UK\shape_core.cpp:15`），相邻点不得相同。
- Polygon 还须通过 `SimplePolygon`：不自交、不折返、面积≠0（`UK\shape_core.cpp:188-210`）。
- 构造时 `start = 首点`、`end = 末点`（`UK\shape_interaction.inl:779`），对几何无影响。

### 3.3 圆弧与扇形（`UK\shape_presets.inl:216-233`）

- 圆心 = s，半径 = \|e−s\|，起始角 = `atan2(e.y−s.y, e.x−s.x)`，扫角 = `sweepRadians`。
- 采样 `ArcPoints`（`UK\shape_presets.inl:63-81`）：`step = 2·acos(1 − tol/R)`，段数 = `max(2, ceil(|sweep|/step))`，等角采样 `段数+1` 个点（含两端）；段数 >16000 判为失败。
- Arc → Polyline；Sector → Polygon：若 `||sweep| − 2π| < 1e-5` 去掉末点（整圆不加圆心），否则末尾追加圆心 s。
- 编辑把手：Axis1 = e（起始角）、Axis2 = 起始角 + sweep（终止角）、Radius = 中间角（`UK\shape_interaction.inl:207-213`）；拖过另一端时翻转表示以保持绕向（`:335-341`）。

### 3.4 立体：构造的来源（`MakeSolidConstruction`，`UK\shape_interaction.inl:537-553`）

- 第一阶段拖动 down→end，第二阶段竖直拖动给出 `height = end.y − down.y`（`:769`）。
- 长方体/正方体：`y = |Δy| / 0.3535533906`，`x = |Δx|`，`mirrored = Δx·Δy < 0`，`baseSize = (x + |Δy|, y)`，`start = (down+end)/2`（底面中心）；手势正好对应底面投影的短对角线。正方体 `baseSize.x = baseSize.y = max(x,y)`，`height = copysign(baseSize.x, height)`。
- 圆柱/圆锥/棱柱/棱锥：`start = down`（底面中心），`baseSize = (R,R)`，`R = |end − down|`。
- **立体派生只用 `start`，不用 `end`**（`ExpandOblique` 的 `project` 只引用 `c.start`，`UK\shape_presets.inl:124`）；`end` 仅随外框缩放一起变化（`UK\shape_interaction.inl:282`）。

### 3.5 立体：投影与部件（`UK\shape_presets.inl:82-193`）

**投影常量**（`SolidProjection`，`:82-88`）：

| 预设 | (kx, ky) |
|---|---|
| Cuboid、Cube、Prism、Pyramid | (±0.3535533906, −0.3535533906)；`mirrored` 时 kx 取负。0.35355… = 1/(2√2)，即 45° 斜轴、长度减半（斜二测）。 |
| Cylinder、Cone | (0, −1/3)：模型 y 压缩为 1/3（并朝上）；`mirrored` 对其无影响。 |

**模型点 → 画布局部点**（`ObliquePoint` `:89-95` 与 `project` `:124`）：

```
(x', y') = R(baseRotation) · (x, y)        // x' = cosθ·x − sinθ·y, y' = sinθ·x + cosθ·y
P(x, y, z) = start + (x' + kx·y',  ky·y' + z)    // z 取 0（底面）或 height（顶面）
```

**底面模型顶点**（`ObliqueBase`，`:96-112`）：
- Cuboid/Cube：`(−bx/2,−by/2), (bx/2,−by/2), (bx/2,by/2), (−bx/2,by/2)`。
- Prism/Pyramid：`RegularPolygonVertices(0, (bx,0), sides)`。
- Cylinder/Cone：圆周采样，段数 = `max(32, ceil(2π/step))` 再**向上取整为 4 的倍数**；`step = 2·acos(1 − tol/ρ)`，`ρ = bx × MaxScale([[1,0],[kx,ky]])`（计入投影最大奇异值）；首点取 `(bx·cosθ, −bx·sinθ)`，抵消 baseRotation，使 4 个轴端点落在显示椭圆的极值上。>16000 判为失败。
- 圆柱/圆锥另外插入**真实轮廓切点**（`:133-148`）：`a = V.x − V.z·ox/h`，`b = V.y − V.z·oy/h`，`value = 圆锥 ? −V.z·bx/h : 0`；若 `|value| < hypot(a,b)`，在角度 `atan2(b,a) ± acos(value/hypot(a,b))` 处加入半径 bx 的点（与已有点距离 ≥1e-4 才加），然后按 `atan2` 重新排序。

**可见性**（`:129-156`）：
- 视线向量 `V = (kx·cosθ − sinθ, −kx·sinθ − cosθ, ky)`。
- 内部点 `I = (ox/2, oy/2, height/2)`；面法线取朝外方向（与 `a − I` 点积为正），`dot(n, V) < −1e-6·|n|` 为**背面**。
- `bottomBack` = 底面是否背面；`topBack` = 顶面（非锥体）；`side[i]` = 第 i 个侧面（底边 i→i+1 与顶边或锥顶）。
- 一条边**隐藏 ⇔ 相邻两个面都是背面**：底边 i ⇔ `bottomBack && side[i]`；顶边 i ⇔ `topBack && side[i]`；侧棱 i ⇔ `side[i] && side[i−1]`。

**部件顺序与类型**（`:157-191`），部件 id 从 1 连续编号：
1. 对每个 i（0…n−1）依次：底边 i（非圆形）→ 顶边 i（非锥体、非圆形）→ 侧棱 i（非圆形一律输出；圆形只在 `side[i] ≠ side[i−1]` 即轮廓母线处输出）。直边均为 Line。
2. 圆柱/圆锥：底面圆周（再加圆柱顶面圆周）按可见性切段，从可见性变化处开始，**同一可见性的连续弧合并成一个 Polyline**（避免虚线相位在细分弦上归零，`:171`）。
3. 隐藏部件带 style 覆盖：对象 style 的副本 + `linePattern = Dashed`；可见部件无覆盖，沿用对象 style。

部件数：长方体/正方体 12；棱柱 3n；棱锥 2n；圆柱/圆锥取决于切点与可见性分段。

**立体的校验**（`:116-120`、`UK\shape_core.cpp:457-460`、`UK\shape_presets.inl:234-235`）：baseSize 两分量 >0、\|height\|>0；圆柱/圆锥 `bx = by`；`rightSolid ⇒ offset = 0`；正方体 `bx = by = |height|`；只描边不填充；对象 transform 须 `m12 = m21 = 0` 且 `|m11| = |m22|`（只允许等比缩放、翻转、平移），正方体还须为相似变换。立体不能旋转（`RotateShape` 拒绝，手势旋转强制为 0，`UK\shape_interaction.inl:504-506,523`），朝向变化通过 `baseRotation` 表达。

### 3.6 变换限制汇总【码】

- 所有对象：transform 有限且 \|det\| > 1e-12（`UK\shape_core.cpp:41-45`）。
- Circle 部件、RegularPolygon、Cube：须为相似变换（`UK\shape_core.cpp:457-459,478`）。
- 立体：见上。

---

## 4. 闭合虚线相位与细分容差（问题 4）

### 4.1 闭合虚线相位【码】

`ClosedDashCoordinate`（`UK\shape_core.cpp:727-734`）：

```
quarter  = P / 4                                    // P = 闭合轮廓在画布中的折线周长
centered = d − quarter · floor(d/quarter + 0.5)     // 到最近锚点（0, P/4, P/2, 3P/4）的有符号距离
coord    = |centered| + (Dotted ? 0 : 2w)
```

然后 `DashDistance(coord + dashOffset)` 决定可见性（`UK\shape_core.cpp:390-400`）。含义：四个锚点处图案相位固定（Dashed/DashDot 时锚点正好是一段 4w 实线的中点，Dotted 时锚点是一个点），向两侧镜像展开，周长变化被分散到 8 个半段的中点；虚线尺度不拉伸。GPU 实现一致（`shapePixelShader.hlsl:47-52`，`halfWidth*4 = 2w`）。

- 弧长从**轮廓起点**量起。起点（`BuiltinBuilder`，`UK\shape_core.cpp:273-332`，再经 transform）：Polygon = vertex[0]；无圆角矩形 = (l,t)；圆角矩形 = 右上角圆弧起点 (r−radius, t)，顺时针；Circle/Ellipse = 局部角度 0 处 (cx+rx, cy)。所有闭合轮廓都是 y 向下坐标中的角度递增方向。
- 仅对“描边 + 非 Solid + 闭合 + 周长>0”的部件生效；开放部件（Line/Polyline、立体的边）按普通弧长 `d` 起算。

### 4.2 标准层的 8 段拆分【码】（`UK\shape_uink_standard.inl:77-115`）

- 有填充时先写 1 个只填充项（同几何，`stroke` 去掉）。
- 再写 8 个 Polyline(1)：第 k 段覆盖 `[kP/8, (k+1)P/8]`，取端点插值点加中间原始顶点；**奇数段反向**，所以每段都从一个锚点出发向外走；每段 `dashOffset = style.dashOffset + ClosedDashCoordinate(0, …) = dashOffset + (Dotted ? 0 : 2w)`，dashArray 不变。用标准 dash 语义（图案位置 = 沿线距离 + dashOffset）即可复现与 Inkeys 相同的外观。
- 读取时期望项数：闭合虚线部件 = 8 + (有填充 ? 1 : 0)，其他部件 = 1（`UK\uink_draw3_import.cpp:178-186`）。

### 4.3 细分容差【码】

- 全局上限 `BuildOptions.maxErrorPixels = 0.25`，`BuildGeometry` 拒绝 >0.25 的值（`UK\shape_core.h:121`、`UK\shape_core.cpp:587-589`）。
- 圆/椭圆/圆角（`BuiltinBuilder`）：`tol = 0.25 / (displayScale × MaxScale(transform))`（局部单位），`step = 2·acos(1 − tol/R)`（R ≤ tol 时 step = π/2），段数 = `max(1, ceil(|sweep|/step))`，R 取较长半轴（`UK\shape_core.cpp:277-291,338`）。导出时 displayScale = 1。
- 弧/扇形/立体：`ExpandAdvanced` 的容差 = `0.25 / max(1, MaxScale(transform))`（`UK\shape_core.cpp:591-596`）；`Validate` 比对时用默认 0.25（`UK\shape_presets.inl:195`）。
- 圆柱/圆锥底面另有“至少 32 段、4 的倍数”的规则（§3.5）。
- `MaxScale` = 2×2 线性部分的最大奇异值（`UK\shape_core.cpp:26-33`）。

---

## 5. style、aux、transform、revision、id、部件引用（问题 5）

### 5.1 `style` Map（9 键，`UK\shape_uink_metadata.inl:205-235`）

| 键 | 类型 | 范围【码】 | 默认（`UK\shape_core.h:81-86`） |
|---|---|---|---|
| `stroke` | bool | stroke 与 fill 至少一个为 true | true |
| `fill` | bool | Line/Polyline/Arrow/Arc/立体不允许 | false |
| `strokeRgb` | uint | ≤ 0xFFFFFF | 0 |
| `fillRgb` | uint | ≤ 0xFFFFFF | 0 |
| `strokeOpacity` | float | 0–1 | 1 |
| `fillOpacity` | float | 0–1 | 1 |
| `width` | float | >0；**局部单位**，画布宽度 = `width × sqrt|det(transform)|`（`UK\shape_core.cpp:345`） | 2 |
| `linePattern` | uint | 0 Solid / 1 Dashed / 2 Dotted / 3 DashDot（`UK\shape_core.h:77`） | Solid |
| `dashOffset` | float | 有限；**不随 transform 缩放**，直接按画布像素使用（`BuildPart` 只缩放 width，`UK\shape_core.cpp:345`；标准层原样写出，`UK\shape_uink_standard.inl:23`） | 0 |

校验见 `ValidStyle`（`UK\shape_core.cpp:46-54`）。手势缩放时 `width /= scale`，使画布线宽不变（`UK\shape_interaction.inl:531-533`）。

### 5.2 `aux`（根键，不在 style Map 内）【码】

- 位掩码 uint 0–7：`Center = 1, Foci = 2, Diagonals = 4`（`UK\shape_core.h:39`；写 `UK\shape_uink_metadata.inl:251`，读 `:288-292`）。
- 支持：Circle/RegularPolygon/Arc/Sector → Center；Ellipse → Foci；Rectangle/RoundedRectangle/Parallelogram/Rhombus/Trapezoid → Diagonals；其余 None（`UK\shape_core.cpp:499-510`）。默认：Circle = Center，Ellipse = Foci，其他 0（`:511-515`）。创建时不支持的位被清掉（`:768`）。
- 派生（`BuildAuxiliaryGeometry`，`UK\shape_core.cpp:516-581`）：只填充（无描边）的对象不画辅助。
  - 点（Center/Foci）：填充 Circle，单位 transform，圆心为画布坐标，**半径 = max(width × sqrt|det T|, 2)**（直径 = 2×画布线宽，最小 4px），颜色取描边色（无描边时取填充色）。Center 位置：Circle 取几何圆心，其他取 `construction.start`。Foci：先把椭圆规范化为长轴在局部 x，焦距 `sqrt(a²−b²)`。
  - Diagonals：两条 Line（顶点 0→2、1→3），Dashed，`dashOffset = 0`，使用对象 transform；矩形的四角取 `start,(end.x,start.y),end,(start.x,end.y)`。
- 辅助部件**在标准层中作为独立项写出**，计入 partCount，排在本体部件之后（`UK\shape_uink_standard.inl:131-133`）。

### 5.3 `transform`【码】

- 6 元数组 `[m11, m12, m21, m22, dx, dy]`（`UK\shape_uink_metadata.inl:193-197`）。
- 作用：`x' = m11·x + m21·y + dx`，`y' = m12·x + m22·y + dy`（`UK\shape_core.cpp:403-404`），即 (m11,m12) 是局部 x 轴的像，与 D2D `Matrix3x2F` 行向量约定相同。
- 复合：`ComposeTransforms(outer, inner)` = 先 inner 后 outer（`:405-410`）；复合部件的最终变换 = `object.transform ∘ part.transform`（`:607-608`），预设产生的部件 transform 均为单位矩阵。
- 旋转/翻转/手势都是左乘到对象 transform（`UK\shape_interaction.inl:269,498,514,530`）；构造保持在局部系不变。
- 标准层 rotation = `atan2(m12, m11)`（弧度）；只在正交（轴垂直）时写原生 Rectangle(2)/Ellipse(4)/Circle(5)，Circle 还要求两轴等长，否则退为 Ellipse（`UK\shape_uink_standard.inl:33-68`）；其余写为 Polyline(1)/Polygon(6)/Line(0)，闭合轮廓不重复首点（`:69-75`）。

### 5.4 `id` 与 `revision`【码】

- `id`：16 字节 GUID，写成 36 字符小写十六进制、字节按原顺序、8-4-4-4-12 分隔（`FormatUInkGuid`，`UK\uink_model.cpp:79-90`）；全零无效（`UK\shape_core.cpp:444`）。同一页内对象 id 不得重复（导出 `UK\uink_draw3_export.cpp:460-465`、导入 `UK\uink_draw3_import.cpp:247`）。
- `revision`：uint64，≥1。任何内容变化都必须使用新 revision（`ApplyCommand`，`UK\shape_core.cpp:827-829`；编辑要求 `newRevision > before.revision`，`UK\shape_interaction.inl:242`）；撤回可恢复旧值，不要求单调（`:827`）。分配器 `RevisionAllocator` 每个文档独立（`UK\shape_interaction.h:120-127`）。运行期用于几何缓存键（`UK\shape_core.cpp:798-807`）。

### 5.5 根键全集与部件引用【码】

根元数据（首项，`EncodeInkeysShapeMetadata`，`UK\shape_uink_metadata.inl:238-266`，加上 `UK\shape_uink_standard.inl:160-161`）：

`version(=7)`、`id`、`revision`、`kind`、`creationMode`、`legacyKind`、`geometry{start,end,radius,vertices}`、`transform`、`style`、`aux`、`parts[{id,kind,geometry,transform,style?}]`、`construction`（可选）、`partIndex(=0)`、`partCount`。

后续项（`UK\shape_uink_standard.inl:151-161`）：恰好 6 键 `{version, id, revision, reference: true, partIndex, partCount}`。读取要求（`UK\shape_uink_import.inl:32-70`、`UK\uink_draw3_import.cpp:183-196`）：
- 引用项紧跟根项、`contentId` 连续、`undoId` 与根相同、`renderOnlyWhenLatest = false`；
- `id`、`revision`、`version` 与根一致，`partIndex` 等于序号，`partCount` 与根一致；
- 根的 `partCount` 必须等于由构造重算出的标准项数（§4.2 规则）；
- `extra` 中只能有 `inkeysShape` 一个键，否则整页导入失败（`UK\shape_uink_import.inl:3-14`、`UK\uink_draw3_import.cpp:165`）。版本不是 7 时逐项退回标准层并给出 Warning（`:199-207`）。

---

## 6. 箭头与 dash（问题 6）【码】

- 箭头写成**两个标准项**，共用 `undoId`：Line(0) 杆（s→e，沿用对象 style，可以是虚线）+ Polyline(1) 头（3 点，强制 Solid，dashArray 为空）。头长 3w、半宽 1.5w，w 为对象局部 style.width，随 transform 一起缩放（`UK\shape_core.cpp:92-107`）。标准层不使用 UInk 的 marker（导入时 marker≠0 的项不被识别为 Inkeys 样式，`UK\shape_uink_import.inl:80-81`）。杆延伸到箭尖 e，与头重叠；GPU 渲染时头的图元并入杆批次并标记 `kPrimitiveForceSolid`，做一次覆盖并集（`UK\shape_core.cpp:708-714`）。
- dashArray（`UK\shape_uink_standard.inl:3-12`，w = 画布线宽）：

| linePattern | dashArray | Inkeys 内部图案（`DashDistance`，`UK\shape_core.cpp:390-400`） |
|---|---|---|
| Solid | 空 | — |
| Dashed | `{4w, 6w}` | 周期 10w，中心线可见段 [0,4w]，圆头半径 w/2 → 视觉约 5w 实 + 5w 空 |
| Dotted | `{0, 3w}` | 周期 3w，零长度段 + 圆头 = 直径 w 的点 |
| DashDot | `{4w, 5w, 0, 5w}` | 周期 14w，[0,4w] 段 + 9w 处的点 |

- 所有虚线都以**圆头**评估：可见判定为 `hypot(法向距离, DashDistance) ≤ w/2`（`UK\shape_core.cpp:755-756`；`shapePixelShader.hlsl:5` 注释 “Rounded dash caps”）。因此 Dotted 依赖圆帽才可见。
- 读取无元数据的标准项时，dashArray 必须恰好是上述三种之一或空，否则 `ShapeFromStandard` 不识别（`UK\shape_uink_import.inl:86-91`）。
- 网站现行 1.0 规范 `docs/standard/blocks/shape.md:42` 写有“不得把可见短线拆成多个 Shape”；闭合虚线 8 段拆分（§4.2）把一个对象拆成 8 个 Polyline（不是逐段短线），规范作者需注意这两句话的关系。

---

## 7. 现有元数据中可由构造派生的冗余（问题 7）

| 根字段 | 有 `construction` 时 | 无 `construction` 时 | 依据【码】 |
|---|---|---|---|
| `kind` | 可派生（§1.2 表最后一列） | **必需** | `Validate` 要求 `object.kind == expected.kind`（`UK\shape_core.cpp:453`） |
| `creationMode` | 等于 `tool.creationMode`，冗余 | 导入对象有意义（Points/CenterRadius） | `UK\shape_core.cpp:72,201,453` |
| `geometry` | 完全可派生；Compound 为空 geometry；弧/扇形是 0.25px 采样点 | **必需** | `SameGeometry` 逐值比对，容差 4ε（`UK\shape_core.cpp:156-164,454`） |
| `parts[]` | 完全可派生（箭头 2 个、立体每条边/弧段） | 预设之外不产生 Compound（`ShapeFromStandard` 不产出） | `SameParts` 比对 id/kind/geometry/transform/style（`:165-174,461`） |
| `legacyKind` | 必须为 0，冗余 | 旧四种必需 | `:453,463-473` |
| `partCount`（根） | 可由构造 + style + aux 重算 | 恒为 1（旧图形） | `UK\uink_draw3_import.cpp:178-186` |
| 引用项的 `version/revision/partCount` | 只用于一致性校验 | — | `UK\shape_uink_import.inl:67-69` |
| `tool.sides`、`rectangleCornerRadius`、`constraint`、`constraintVertex`、`rightSolid` | 对多数预设无作用，但解码要求 7 键齐全且 sides∈[3,14] | — | `UK\shape_uink_metadata.inl:144-161` |
| `end`（立体） | 不参与派生 | — | `UK\shape_presets.inl:124` |

此外：圆锥在导出前总是从构造重建，以吸收浮点尾差（`UK\shape_uink_standard.inl:121-127`）——说明“存派生值再比对”在跨架构下已出现过问题。

---

## 8. 规范附录草案【建议】

> 以下均为建议，不是现状。现状事实见 §1–§7。

### 8.1 对象层（首项）建议字段

| 字段 | 必需 | 说明 |
|---|---|---|
| `id` | 是 | GUID 字符串（36 字符小写） |
| `revision` | 是 | uint64 ≥1 |
| `preset` | 否 | 字符串 id（§8.2）；缺失表示“无预设”对象，必须带 `kind + geometry` |
| `construction` | 有 preset 时是 | 见 §8.2 |
| `kind`、`geometry` | 无 preset 时是 | Line/Polyline/Polygon/Rectangle/Ellipse/Circle 的局部几何；有 preset 时不写 |
| `legacy` | 否 | 旧四种标记（或直接作为 preset id `legacy-*`） |
| `transform` | 否 | `[m11,m12,m21,m22,dx,dy]`，缺省单位矩阵；语义按 §5.3 |
| `style` | 是 | §5.1 的 9 个字段；写明 width 为局部单位、dashOffset 为画布像素 |
| `aux` | 否 | 位掩码，缺省 0 |
| `partCount` | 是 | 标准层项数，供读取器跳组与一致性检查 |

后续项只写 `{ref: id, partIndex}`；读取器发现数量或引用不符时退回标准层而非拒绝整页。`construction` 的 `tool` 子键建议改为“只写对该预设有意义的键，未知键忽略，缺省值见 §2.2”。

### 8.2 预设表（附录用）

| id | construction 字段 | 派生摘要 | 标准层输出 |
|---|---|---|---|
| `line` | start, end | 线段 s→e | Line ×1 |
| `arrow` | start, end | 杆 s→e；头 = 以 e 为尖、长 3w、半宽 1.5w 的开口折线，恒实线 | Line + Polyline |
| `rectangle` | start, end, cornerRadius(px，默认 4×系统缩放) | 包围盒 (l,t)-(r,b)；圆角 = min(cornerRadius, 短边/2) | Rectangle（正交时）或 Polygon |
| `rounded-rectangle` | start, end | 圆角 = 短边 × 0.2 | 同上 |
| `circle` | start, end, mode(center/drag) | center：圆心 s、半径 \|e−s\|；drag：外接正方形，边长 max(w,h)，从 s 起向 e 的方向 | Circle/Ellipse 或 Polygon |
| `ellipse` | start, end | 包围盒内切椭圆 | Ellipse 或 Polygon |
| `triangle` | start, end, constraint(free/isosceles/equilateral), constraintVertex, vertices? | 无 vertices：(cx,t),(r,b),(l,b)；equilateral：中心 s、首顶点 e；有 vertices 直接用 | Polygon |
| `parallelogram` | start, end, vertices? | skew=(e.x−s.x)/4；[s,(e.x−skew,s.y),e,(s.x+skew,e.y)] | Polygon |
| `rhombus` | start, end, vertices? | 包围盒四边中点 | Polygon |
| `trapezoid` | start, end, constraint(free/isosceles), vertices? | 上底缩进 w/4 | Polygon |
| `regular-polygon` | start(中心), end(首顶点), sides 3–14 | 首顶点 e，按 +2π/n 依次旋转（y 向下时顺时针） | Polygon |
| `polyline` | vertices(≥2) | 顶点直连 | Polyline |
| `polygon` | vertices(≥3) | 简单多边形 | Polygon |
| `arc` | start(圆心), end(起点), sweep(弧度，正=顺时针) | 半径 \|e−s\|，按 0.25px 容差采样 | Polyline |
| `sector` | 同 arc | 弧点 + 圆心闭合；\|sweep\|=2π 时为整圆 | Polygon |
| `cuboid` | start(底面中心), height, baseSize, baseRotation, mirrored | 斜二测 k=1/(2√2)，45° 半长斜轴；12 条边，隐藏边 Dashed | Line ×12 |
| `cube` | 同上，bx=by=\|height\| | 同上 | Line ×12 |
| `cylinder` | start, height, radius, baseRotation, offset | 纵轴压缩 1/3；两条轮廓母线（真实切点）+ 按可见性分段的上下圆周 | Line + Polyline |
| `cone` | 同上 | 轮廓母线到锥顶 + 底面圆周分段 | Line + Polyline |
| `prism` | start, height, radius, sides 3–8, baseRotation, mirrored, offset, right | 正 n 边形底面，3n 条边 | Line ×3n |
| `pyramid` | 同 prism | 2n 条边，锥顶 = offset 处 | Line ×2n |

附录需写成公式的规则：§3.5 投影与可见性、§4.1 闭合虚线相位、§4.3 细分容差（0.25 画布像素，按 transform 最大奇异值折算；圆柱/圆锥至少 32 段且为 4 的倍数）、§6 dashArray 与圆帽。

---

## Caveats / Not Found

- **未找到**任何关于“UInk 文件中 DPI 缩放”的字段；`rectangleCornerRadius` 在 construction 中已是画布像素，只有旧矩形仍是名义 4 DIP。
- `CreationMode::Parameters`(4) 在产品路径中未被使用，只是枚举上限。
- 立体隐藏边判定依赖浮点比较（`-1e-6·|n|` 阈值）与切点插入，不同实现可能在临界视角上判定不同；本文只记录公式，未验证跨实现的一致性。
- 弧细分、圆柱圆周段数依赖 transform 的最大奇异值，因此同一构造在不同缩放下的标准层点数不同；这是现状。
- 未阅读白板历史 JSON 中图形编辑记录的细节（1.1 已决定删除）。
- 未运行任何代码，所有结论来自静态阅读。
