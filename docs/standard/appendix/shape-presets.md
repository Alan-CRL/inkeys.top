---
title: 图形预设注册表
---

**本附录登记 UInk 1.1 的图形预设**：每个预设的名称、`construction` 参数，以及如何从参数生成部件。完整级编辑器据此重建图形，让用户在另一款软件里继续拖动顶点、修改边数或高度。

::: tip 等级
完整级。低等级读取器直接显示文件中的部件，不需要阅读本附录（SHAPE-12、SHAPE-15）。
:::

## 通用约定

- **PRESET-1** 显示永远以文件中的部件为准。编辑器从 `construction` 重建的部件可以与文件中的部件有细微差异（浮点误差、采样点数），这不是错误；用户编辑后，以重建结果替换全部部件。
- **PRESET-2** `construction` 中的坐标都是对象的**局部坐标**（`transform` 之前），y 轴向下，单位与 Canvas 相同。最终部件 = 局部几何经对象 `transform` 变换后的结果。
- **PRESET-3** 点写成 `{ x: float32, y: float32 }`，与 Shape 几何一致。
- **PRESET-4** `construction` 只写对该预设有意义的键；读取器忽略不认识的键，缺少的键使用本页的缺省值。缺少必需的键或取值无效时，对象退回对象层（SHAPE-15），不拒绝整页。
- **PRESET-5** 不认识的 `preset` 名称：退回对象层。私有预设使用 `x-厂商-名称` 形式，例如 `x-inkeys-protractor`。
- **PRESET-6** 曲线按 **0.25 个 Canvas 单位**的最大误差采样成折线：半径为 `R` 的圆弧，每段角度 `step = 2 × acos(1 − tol / R)`，其中 `tol = 0.25 / max(1, M)`，`M` 为对象 `transform` 线性部分的最大奇异值；`R ≤ tol` 时 `step = π / 2`。

### `construction` 字段

| 字段 | 类型 | 缺省 | 说明 |
| --- | --- | --- | --- |
| `start` | Point | — | 起点；含义随预设变化 |
| `end` | Point | — | 终点；含义随预设变化 |
| `vertices` | `Array<Point>` | — | 顶点表；编辑后的三角形、四边形，或折线、多边形 |
| `mode` | int32 | 见各预设 | 创建方式：`0` Drag（拖出外框）、`1` Center（圆心 + 半径） |
| `constraint` | int32 | `0` | `0` Free、`1` Isosceles 等腰、`2` Equilateral 等边 |
| `constraintVertex` | uint32 | `0` | 三角形的约束顶点下标 `a`（`0`–`2`）；底边为顶点 `(a+2)%3 → (a+1)%3` |
| `cornerRadius` | float32 | `0` | 矩形圆角半径 |
| `sides` | uint32 | `3` | 边数 |
| `sweep` | float32 | — | 圆弧扫角，弧度；正值为顺时针（y 轴向下） |
| `height` | float32 | — | 立体的高，沿屏幕竖直方向；负值向上，不得为 `0` |
| `baseSize` | Point | — | 长方体底面的长（`x`）与宽（`y`） |
| `radius` | float32 | — | 圆柱、圆锥、棱柱、棱锥底面外接圆半径 |
| `baseRotation` | float32 | `0` | 底面绕竖直轴旋转的角度，弧度；投影方向不变 |
| `mirrored` | bool | `false` | 斜轴方向：`false` 向右上 45°，`true` 向左上 135° |
| `offset` | Point | `{0, 0}` | 顶面或锥顶相对底面中心的偏移（模型坐标，随 `baseRotation` 旋转） |
| `right` | bool | `false` | 直棱柱、直棱锥：为 `true` 时 `offset` 必须为 `{0, 0}` |

### style

`object.style` 保存编辑用的样式。部件上的 `stroke` / `fill` 是它的计算结果。

| 字段 | 类型 | 缺省 | 说明 |
| --- | --- | --- | --- |
| `stroke` | bool | `true` | 是否描边；`stroke` 与 `fill` 至少一个为 `true` |
| `fill` | bool | `false` | 是否填充；只用于可填充的预设 |
| `strokeColor` | Color Map | 黑色 | 描边颜色 |
| `fillColor` | Color Map | 黑色 | 填充颜色 |
| `strokeOpacity` | float32 | `1` | 描边透明度 |
| `fillOpacity` | float32 | `1` | 填充透明度 |
| `width` | float32 | `2` | 线宽，**局部单位**；部件的描边宽度 = `width × √\|det T\|` |
| `linePattern` | int32 | `0` | `0` Solid、`1` Dashed、`2` Dotted、`3` DashDot |
| `dashOffset` | float32 | `0` | 虚线偏移，Canvas 单位，不随 `transform` 缩放 |

- **PRESET-7** `linePattern` 按下表换算成部件的 `dashArray`（`w` 为部件的描边宽度），并使用 Round 端帽：

  | `linePattern` | `dashArray` |
  | --- | --- |
  | Solid | 空 |
  | Dashed | `[4w, 6w]` |
  | Dotted | `[0, 3w]` |
  | DashDot | `[4w, 5w, 0, 5w]` |

### aux

`object.aux` 是辅助标记的位掩码：

| 位 | 名称 | 适用预设 | 生成的辅助部件 |
| --- | --- | --- | --- |
| `1` | Center | `circle`、`regular-polygon`、`arc`、`sector` | 圆心处一个实心 Circle |
| `2` | Foci | `ellipse` | 两个焦点处各一个实心 Circle |
| `4` | Diagonals | `rectangle`、`rounded-rectangle`、`parallelogram`、`rhombus`、`trapezoid` | 两条对角线（顶点 0→2、1→3），Dashed |

- **PRESET-8** 辅助部件排在本体部件之后，计入 `partCount`。点是只有填充、没有描边的 Circle：半径为 `max(部件描边宽度, 2)`，颜色取描边颜色、透明度取 `strokeOpacity`（没有描边时取填充颜色与 `fillOpacity`）；只有填充、没有描边的对象不生成辅助部件。不适用的位忽略。

## 平面预设

记 `s = start`、`e = end`，`l = min(s.x, e.x)`、`r = max(s.x, e.x)`、`t = min(s.y, e.y)`、`b = max(s.y, e.y)`、`w = r − l`、`h = b − t`、`cx = l + w/2`、`cy = t + h/2`。

<!-- visual: preset-planar — 平面预设一览：每个图形上标出 start、end 与派生出的顶点 -->
<UInkPresetPlanar />

| `preset` | 必需参数 | 局部几何 | 部件 |
| --- | --- | --- | --- |
| `line` | `start`、`end` | 线段 `s → e` | Line ×1 |
| `arrow` | `start`、`end` | 杆 `s → e`；箭头见 PRESET-9 | Line + Polyline |
| `rectangle` | `start`、`end` | 外框 `(l, t)`–`(r, b)`；圆角 `min(cornerRadius, min(w, h) / 2)` | Rectangle ×1 |
| `rounded-rectangle` | `start`、`end` | 同上，圆角固定为 `min(w, h) × 0.2` | Rectangle ×1 |
| `circle` | `start`、`end`、`mode` | 见 PRESET-10 | Circle ×1 |
| `ellipse` | `start`、`end` | 外框内切椭圆，中心 `(cx, cy)`，半轴 `w/2`、`h/2` | Ellipse ×1 |
| `triangle` | `start`、`end` | 见 PRESET-11 | Polygon ×1 |
| `parallelogram` | `start`、`end` | `k = (e.x − s.x) / 4`；顶点 `s`、`(e.x − k, s.y)`、`e`、`(s.x + k, e.y)` | Polygon ×1 |
| `rhombus` | `start`、`end` | 外框四边中点：`(cx, t)`、`(r, cy)`、`(cx, b)`、`(l, cy)` | Polygon ×1 |
| `trapezoid` | `start`、`end` | `(l + w/4, t)`、`(r − w/4, t)`、`(r, b)`、`(l, b)` | Polygon ×1 |
| `regular-polygon` | `start`（中心）、`end`（第一个顶点）、`sides`（3–14） | 第 `i` 个顶点 = 把 `e − s` 绕 `s` 旋转 `2πi / sides`（顺时针） | Polygon ×1 |
| `polyline` | `vertices`（≥ 2） | 依次连接 | Polyline ×1 |
| `polygon` | `vertices`（≥ 3） | 简单多边形：不自交、面积不为 0 | Polygon ×1 |
| `arc` | `start`（圆心）、`end`（起点）、`sweep` | 见 PRESET-12 | Polyline ×1 |
| `sector` | 同 `arc` | 见 PRESET-12 | Polygon ×1 |

- **PRESET-9** 箭头：`d = (e − s) / |e − s|`，箭头长 `L = 3 × style.width`，`base = e − d × L`，`n = (−d.y, d.x)`。箭头部件是三点 Polyline `[base + n × 1.5 × style.width, e, base − n × 1.5 × style.width]`，**始终为实线**，即使杆是虚线。箭头不使用 Marker（SHAPE-9）。
- **PRESET-10** 圆：`mode = 1`（Center）时圆心 `s`、半径 `|e − s|`；`mode = 0`（Drag）时边长 `side = max(w, h)`，半径 `side / 2`，圆心 `s + (sx, sy) × side / 2`，其中 `sx`、`sy` 为 `e − s` 对应分量的符号（为 `0` 时取 `+1`）。`circle` 的 `mode` 缺省为 `1`。
- **PRESET-11** 三角形：有 `vertices`（3 点）时直接使用。否则：`constraint = 2`（等边）时以 `s` 为中心、`e` 为第一个顶点作正三角形（同 `regular-polygon`）；其余情况顶点为 `(cx, t)`、`(r, b)`、`(l, b)`。`constraint = 1`（等腰）的 `vertices` 必须满足约束顶点在底边的中垂线上。
- **PRESET-12** 圆弧：圆心 `s`，半径 `R = |e − s|`，起始角 `atan2(e.y − s.y, e.x − s.x)`，扫角 `sweep`，`0 < |sweep| ≤ 2π`。按 PRESET-6 计算段数 `max(2, ceil(|sweep| / step))`，等角采样（含两端）。扇形在弧点之后加上圆心闭合；`|sweep| = 2π` 时不加圆心，并去掉与首点重合的末点。
- **PRESET-13** `parallelogram`、`rhombus`、`trapezoid` 被编辑后写入 `vertices`（4 点）：平行四边形满足 `v0 + v2 = v1 + v3`；菱形还要求四边等长；梯形 `constraint = 0` 时上下底保持水平（`v0.y = v1.y`、`v2.y = v3.y`），倾斜放进 `transform`。

## 立体预设

立体用斜二测投影画在平面上：底面在“模型平面”里，通过投影变成平行四边形或椭圆，再沿屏幕竖直方向拉出高度。

<!-- visual: preset-solids（交互）— 长方体、圆柱、圆锥、棱柱、棱锥；拖动 baseRotation 与 mirrored，隐藏边实时变成虚线 -->
<UInkPresetSolids />

| `preset` | 必需参数 | 底面 | 部件 |
| --- | --- | --- | --- |
| `cuboid` | `start`（底面中心）、`height`、`baseSize` | 矩形 `(±baseSize.x/2, ±baseSize.y/2)` | Line ×12 |
| `cube` | 同上，`baseSize.x = baseSize.y = \|height\|` | 正方形 | Line ×12 |
| `cylinder` | `start`、`height`、`radius` | 圆 | Line + Polyline，数量随可见性变化 |
| `cone` | `start`、`height`、`radius` | 圆，顶面收成锥顶 | Line + Polyline |
| `prism` | `start`、`height`、`radius`、`sides`（3–8） | 正 `sides` 边形 | Line ×3n |
| `pyramid` | `start`、`height`、`radius`、`sides`（3–8） | 正 `sides` 边形，顶面收成锥顶 | Line ×2n |

`end` 不参与立体的几何。

### 投影

- **PRESET-14** 投影系数 `(kx, ky)`：`cuboid`、`cube`、`prism`、`pyramid` 为 `(k, −k)`，其中 `k = 1 / (2√2) ≈ 0.3535533906`；`mirrored = true` 时 `kx` 取负。`cylinder`、`cone` 为 `(0, −1/3)`，不受 `mirrored` 影响。
- **PRESET-15** 模型点 `(x, y, z)` 先绕竖直轴旋转 `θ = baseRotation`：`x' = cosθ·x − sinθ·y`，`y' = sinθ·x + cosθ·y`；再投影为局部点 `start + (x' + kx·y', ky·y' + z)`。底面 `z = 0`，顶面 `z = height`；顶面与锥顶的模型坐标再加上 `offset`。
- **PRESET-16** 圆柱、圆锥的底面圆周按 PRESET-6 采样，`R` 取 `radius × M'`（`M'` 为矩阵 `[[1, 0], [kx, ky]]` 的最大奇异值），段数至少 32 且向上取整为 4 的倍数；第一个采样点为模型点 `(radius·cosθ, −radius·sinθ)`，使四个轴端点落在投影椭圆的极值上。另外在两条轮廓母线的切点处插入采样点：令视线 `V` 见 PRESET-17，`a = V.x − V.z·offset.x / height`，`b = V.y − V.z·offset.y / height`，`c = cone ? −V.z·radius / height : 0`；`|c| < hypot(a, b)` 时，在角度 `atan2(b, a) ± acos(c / hypot(a, b))` 处插入半径为 `radius` 的点，然后按角度重新排序。

### 隐藏边

- **PRESET-17** 视线向量 `V = (kx·cosθ − sinθ, −kx·sinθ − cosθ, ky)`。取立体内部点 `I = (offset.x / 2, offset.y / 2, height / 2)`，每个面的法线 `n` 取朝外方向（与“面上一点 − I”的点积为正）。`dot(n, V) < −10⁻⁶ × |n|` 的面是**背面**。
- **PRESET-18** 一条边**隐藏**，当且仅当与它相邻的两个面都是背面。隐藏边写成虚线（`linePattern = Dashed`），可见边沿用对象样式。

### 部件顺序

- **PRESET-19** 底面顶点按以下顺序编号：长方体、正方体为 `v0 = (−bx/2, −by/2)`、`v1 = (bx/2, −by/2)`、`v2 = (bx/2, by/2)`、`v3 = (−bx/2, by/2)`（`bx`、`by` 为 `baseSize.x`、`baseSize.y`）；棱柱、棱锥为 PRESET-15 旋转前的正多边形顶点，`v0 = (radius, 0)`，依次按 `2π / sides` 顺时针旋转。底边 `i` 为 `vi → v(i+1)`，侧面 `i` 由底边 `i` 与对应的顶边或锥顶构成，侧棱 `i` 从 `vi` 出发。对每个 `i = 0 … n−1` 依次输出：底边 `i`、顶边 `i`（锥体没有）、侧棱 `i`。圆柱、圆锥没有直的底边与顶边，侧棱只在轮廓母线处输出；底面（与圆柱顶面）的圆周按可见性切段，从可见性变化处开始，同一可见性的连续弧合并成一个 Polyline。
- **PRESET-20** 立体只描边，不填充；对象 `transform` 只能是等比缩放、翻转与平移（不能旋转），朝向由 `baseRotation` 表达。

## 闭合虚线

- **PRESET-21** 闭合图形（矩形、圆、多边形等）的虚线以四个锚点固定相位：设轮廓周长为 `P`，从轮廓起点量起的距离为 `d`，则 `quarter = P / 4`，`centered = d − quarter × floor(d / quarter + 0.5)`，相位坐标为 `|centered| + (Dotted ? 0 : 2w)`。锚点处总是一段实线的中点（点线时为一个点），图案向两侧对称展开。相位坐标与 `dashOffset` 的方向一致（SHAPE-26）。
- **PRESET-22** 轮廓起点：多边形为第一个顶点；直角矩形为左上角；圆角矩形为右上角圆弧的起点，顺时针；圆与椭圆为局部角度 `0` 处 `(cx + rx, cy)`。
- **PRESET-23** 写入部件时，有填充先写一个只有填充的部件；再把描边按 `[kP/8, (k+1)P/8]` 拆成 8 条 Polyline，奇数段反向，每段 `dashOffset = style.dashOffset + (Dotted ? 0 : 2w)`（SHAPE-8）。读取器按普通虚线规则绘制这 8 段即可得到对称的外观。

## 旧版图形

以下预设没有 `construction`，以部件本身为准（SHAPE-13）：

| `preset` | 部件 |
| --- | --- |
| `legacy-solid-line` | Line，实线 |
| `legacy-dashed-line` | Line，`dashArray = [4w, 6w]` |
| `legacy-outline-rectangle` | Rectangle，只描边，带小圆角 |
| `legacy-filled-rectangle` | Rectangle，只填充 |

## 相关

- [Shape 块](../blocks/shape)
- [笔尖与端帽](../common/nib)
