---
title: Shape 块
---

- Type ID：`5`
- 类型：Map

**Shape 是一个可以直接画出来的参数化图形**：直线、折线、矩形、正方形、椭圆、圆、多边形。它保存最终几何、单色描边与单色填充，任何支持 Shape 的读取器都能画出相同的外观。复杂图形（箭头、立体图形等）由多个 Shape 部件组成，再用图形对象层 `object` 组合成一个可编辑的整体。

::: tip 等级
- **核心级**：七种几何（含旋转）、描边颜色与宽度、单色填充；可以忽略透明度。
- **基础级**：`opacity`、虚线、箭头、圆角、`lineCap` / `lineJoin`。
- **标准级**：图形对象层 `object`：多个部件作为一个对象选择、移动、删除。
- **完整级**：对象层中的 `construction` 与注册预设（可跨软件重新编辑）、私有几何、`renderOnlyWhenLatest`。
:::

## 什么时候用

- 用户画的直线、箭头、矩形、圆、多边形、立体图形等。
- 手写笔迹被识别为图形后的结果。
- 曲线（圆弧、抛物线、双曲线、函数图像）与不规则的自由图形：按顺序取点，写成 Polyline 或 Polygon，见[曲线与自由图形](#曲线与自由图形)。UInk 1.1 不注册曲线方程，也不注册贝塞尔曲线。

## 字段

| 字段 | 类型 | 要求 | 等级 | 说明 |
| --- | --- | --- | --- | --- |
| `type` | uint16 | Required | 核心 | 固定为 `5` |
| `contentId` | uint32 | Required | 核心 | 与 Ink 共用的内容序号（INK-2） |
| `undoId` | uint32 | Required | 标准 | 撤回组编号（INK-3） |
| `shapeType` | int32 | Required | 核心 | 几何类型，见下表 |
| `geometry` | Map | Required | 核心 | 由 `shapeType` 决定的几何数据 |
| `stroke` | Map | Conditional | 核心 | 描边；Line、Polyline 必填 |
| `fill` | Map | Conditional | 核心 | 填充；只用于闭合图形 |
| `object` | Map | Optional | 标准 | 图形对象层，见[图形对象层](#图形对象层) |
| `renderOnlyWhenLatest` | bool | Optional | 完整 | 缺省为 `false`，规则同 INK-15 |
| `extra` | Map | Optional | — | 软件私有字段 |

### `shapeType`

| 值 | 名称 | 几何 |
| --- | --- | --- |
| `0` | Line | 两个端点 |
| `1` | Polyline | 至少两个点的折线 |
| `2` | Rectangle | 矩形或圆角矩形，宽高可以不同 |
| `3` | Square | 正方形，编辑时保持等比 |
| `4` | Ellipse | 椭圆，宽高可以不同 |
| `5` | Circle | 圆，编辑时保持等比 |
| `6` | Polygon | 至少三个点的闭合多边形 |
| `7`–`127` | 保留 | — |
| `128`+ | 私有 | — |

<!-- visual: shape-geometry — 七种几何并排：标出 points、centerX/centerY、width/height、size、radius、rotation 与圆角半径 -->
<UInkShapeGeometry />

## 几何

所有坐标都是 Canvas 绝对坐标（不采用 Ink 的相对位移），单位为 Device 像素，必须是有限数。

### Line、Polyline、Polygon

`geometry.points` 是 `Array<Map>`，每个点为 `{ x: float32, y: float32 }`。

- **SHAPE-1** Line 恰好两个点；Polyline 至少两个点；Polygon 至少三个点。
- **SHAPE-2** Polygon 按顺序连接各点，并自动连接最后一点与第一点；写入器不得重复写入首点。填充使用非零环绕规则。三角形等基础多边形用 Polygon 表示。

### Rectangle 与 Ellipse

| 字段 | 类型 | 要求 | 等级 | 说明 |
| --- | --- | --- | --- | --- |
| `centerX` | float32 | Required | 核心 | 中心 X |
| `centerY` | float32 | Required | 核心 | 中心 Y |
| `width` | float32 | Required | 核心 | 宽度，大于 `0` |
| `height` | float32 | Required | 核心 | 高度，大于 `0` |
| `rotation` | float32 | Optional | 核心 | 弧度，顺时针为正，缺省为 `0` |
| `cornerRadiusX` | float32 | Optional | 基础 | 只用于 Rectangle，圆角横向半径，缺省为 `0` |
| `cornerRadiusY` | float32 | Optional | 基础 | 只用于 Rectangle，圆角纵向半径，缺省为 `0` |

- **SHAPE-3** 圆角的两个字段必须同时出现：都为 `0`（直角），或都大于 `0` 且分别不超过 `width / 2`、`height / 2`。只出现一个或取值不合规时，读取器按直角显示并报告警告。Ellipse 上出现圆角字段时忽略。

### Square

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `centerX` | float32 | Required | 中心 X |
| `centerY` | float32 | Required | 中心 Y |
| `size` | float32 | Required | 边长，大于 `0` |
| `rotation` | float32 | Optional | 弧度，缺省为 `0` |

### Circle

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `centerX` | float32 | Required | 圆心 X |
| `centerY` | float32 | Required | 圆心 Y |
| `radius` | float32 | Required | 半径，大于 `0` |

## 曲线与自由图形

UInk 只有七种几何，没有“曲线”类型。**任何曲线或不规则图形，都在曲线上按顺序取足够密的点，用直线段依次连起来**：不闭合的写成 Polyline，闭合的写成 Polygon。读取器只要按顺序连线就能画出来，不需要知道它原来是什么曲线，所以核心级读取器也能正确显示。

以双曲线 x² / a² − y² / b² = 1 为例：

1. **取点**：用参数式 x = a·cosh t、y = b·sinh t，让 t 从小到大，依次算出曲线上的点，再加上中心坐标。
2. **取多密**：点要密到折线与真实曲线的距离不超过 0.25 个单位（SHAPE-24），肉眼看不出棱角。弯得厉害的地方（顶点附近）多取点，平直的地方少取点；`a = 120`、`b = 90`、`t ∈ [−1.9, 1.9]` 时，每支约 30 个点。
3. **断开的分别写**：双曲线有左右两支，互不相连，各写成一个 Polyline（SHAPE-25）。不要把两支连成一条折线，否则中间会多出一条线。
4. **辅助线**：渐近线是两条普通的 Line，可以加虚线。
5. **组合成一个对象**（可选，标准级）：用图形对象层把两支与两条渐近线组成一个对象，编辑时一起选择、移动；没有对应的预设，所以不写 `preset`。

闭合的自由图形（心形、手绘轮廓、函数围成的区域）同理：沿边界取点，写成 Polygon，首点不重复写入（SHAPE-2），可以填充。

<!-- visual: shape-curves（交互）— 双曲线写成两条 Polyline：滑块改变每支的采样点数，折线逐渐贴近真实曲线；渐近线是两条虚线 Line，四个部件组成一个对象 -->
<UInkShapeCurves />

- **SHAPE-24** 七种几何以外的曲线与不规则图形必须写成按顺序采样的点：不闭合的写成 Polyline，闭合的写成 Polygon。写入器应让折线与原曲线的最大距离不超过 0.25 个单位（与 PRESET-6 相同）；读取器按普通 Polyline、Polygon 绘制，不得猜测或平滑成其他曲线。
- **SHAPE-25** 一条曲线由几段互不相连的部分组成时（例如双曲线的两支），每段写成一个 Shape，不得用多出来的线段把它们连起来。需要整体编辑时，用图形对象层组合（SHAPE-11），没有注册预设时不写 `preset`。

## 描边与填充

### Stroke Map

| 字段 | 类型 | 要求 | 等级 | 说明 |
| --- | --- | --- | --- | --- |
| `color` | Color Map | Required | 核心 | 描边颜色 |
| `opacity` | float32 | Required | 基础 | 描边透明度，`0`–`1` |
| `width` | float32 | Required | 核心 | 描边宽度，大于 `0` |
| `dashArray` | `Array<float32>` | Optional | 基础 | 虚线的线段与间隔长度，缺失或为空时是实线 |
| `dashOffset` | float32 | Optional | 基础 | 虚线图案的起始偏移，缺省为 `0`；正值让图案朝起点方向移动（SHAPE-26） |
| `lineCap` | int32 | Optional | 基础 | 端帽，缺省为 Round，见[笔尖与端帽](../common/nib) |
| `lineJoin` | int32 | Optional | 基础 | 拐角，缺省为 Round |
| `startMarker` | int32 | Optional | 基础 | 起点端头，缺省为 `0` |
| `endMarker` | int32 | Optional | 基础 | 终点端头，缺省为 `0` |

### Fill Map

| 字段 | 类型 | 要求 | 等级 | 说明 |
| --- | --- | --- | --- | --- |
| `fillType` | int32 | Required | 核心 | `0` Solid；`1`–`127` 保留，`128`+ 私有 |
| `color` | Color Map | Required | 核心 | 填充颜色 |
| `opacity` | float32 | Required | 基础 | 填充透明度，`0`–`1` |

### Marker

| 值 | 名称 | 含义 |
| --- | --- | --- |
| `0` | None | 无端头 |
| `1` | OpenArrow | 开放式箭头，具体外形由软件决定 |
| `2`–`127` | 保留 | — |
| `128`+ | 私有 | — |

<!-- visual: shape-stroke — 实线、虚线 {16, 8}、dashOffset 偏移、点线 {0, 3w}（圆头）、点划线，以及 OpenArrow 端头 -->
<UInkShapeStroke />

### 规则

- **SHAPE-4** 每个 Shape 至少有 `stroke` 或 `fill` 之一。Line、Polyline 必须有 `stroke`，不得有 `fill`。闭合图形可以只有描边、只有填充，或两者都有。
- **SHAPE-5** 描边在一个 Shape 内使用同一种颜色、透明度与固定宽度。
- **SHAPE-6** `width`、`dashArray`、`dashOffset` 的单位与坐标相同（Device 像素），是保存时最终可见的长度。软件缩放图形后要保存换算后的结果；读取器不得再额外缩放这些值。
- **SHAPE-7** 非空 `dashArray` 必须包含偶数个非负有限值，且总和大于 `0`。长度为 `0` 的线段在 Round 端帽下画成圆点（NIB-5）；写入器表达点线时必须使用 Round 或 Square 端帽。`dashArray` 或 `dashOffset` 无效时按实线显示。
- **SHAPE-26** `dashOffset` 是虚线图案的起始相位：路径上距起点 `s` 处，对应 `dashArray` 图案中的位置 `(s + dashOffset) mod 图案总长`。因此正值让虚线图案朝起点方向移动，负值朝终点方向移动。这与 SVG 的 `stroke-dashoffset`、Canvas 2D 的 `lineDashOffset` 相同；Direct2D 的 `dashOffset` 与 `dashes` 以描边宽度为单位，换算时除以 `width`。
- **SHAPE-8** 线型（实线、虚线、点线）只由 `dashArray` 表达，不得把一条虚线的每一小段拆成单独的 Shape。唯一的例外：为了让闭合图形的虚线在拐角处对称，写入器可以把闭合描边拆成若干条 Polyline 部件（各自带 `dashOffset`），并用图形对象层组合（SHAPE-11）。
- **SHAPE-9** Marker 只用于 Line、Polyline；闭合图形上出现时忽略并报告警告。箭头写成一个带 Marker 的 Line 或 Polyline，不额外生成 Shape。需要精确控制箭头外形时，可以改用图形对象层，把杆和头写成两个部件。
- **SHAPE-10** UInk 不注册 `miterLimit` 字段。Miter 拐角应按限值 4 绘制：尖角长度（外侧尖端到内侧拐点的距离）超过描边宽度的 4 倍时（约小于 29° 的尖角），该拐角按 Bevel 绘制，与 SVG 的缺省值相同。软件采用其他限值不算错误；抗锯齿由软件决定。

## 图形对象层

复杂图形由多个 Shape 部件组成。例如一个立方体是 12 条边（被遮挡的边是虚线），一个圆柱是两个椭圆的可见弧与不可见弧加两条侧边。图形对象层把这些部件标记为同一个对象，让编辑器可以整体选择、移动、删除；完整级编辑器还可以从 `construction` 重新生成它们，继续编辑参数。

<!-- visual: shape-object（交互）— 一个立方体拆成 12 个部件：悬停任一部件高亮整个对象；第一个部件带完整的 object，其余部件只带 ref 与 partIndex -->
<UInkShapeObject />

### 首个部件的 `object`

| 字段 | 类型 | 要求 | 等级 | 说明 |
| --- | --- | --- | --- | --- |
| `id` | string(36) | Required | 标准 | 对象的 UUID，在文件内唯一，不得全为 0 |
| `revision` | uint64 | Required | 标准 | 修订号，至少为 `1`；对象内容每次变化都使用新的值 |
| `preset` | string | Optional | 标准 | 预设名称，例如 `cuboid`、`arrow`，见[图形预设注册表](../appendix/shape-presets)；缺失表示没有预设的普通对象组 |
| `partCount` | uint32 | Required | 标准 | 部件总数（含辅助部件），至少为 `1` |
| `transform` | `Array<float32>(6)` | Optional | 标准 | 对象的仿射矩阵，布局与 Media 相同（MEDIA-2），缺省为单位矩阵 |
| `construction` | Map | Optional | 完整 | 重建对象所需的参数，只在有 `preset` 时使用，由预设定义 |
| `style` | Map | Optional | 完整 | 编辑用的样式，见[附录](../appendix/shape-presets#style) |
| `aux` | uint32 | Optional | 完整 | 辅助标记位掩码，见[附录](../appendix/shape-presets#aux) |

### 后续部件的 `object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `ref` | string(36) | Required | 首个部件的 `id` |
| `partIndex` | uint32 | Required | 部件序号，从 `1` 到 `partCount − 1` |

### 规则

- **SHAPE-11** 一个对象的全部部件必须在同一个 Canvas 中按 `partIndex` 顺序连续出现，首个部件（`partIndex` 为 `0`）带完整的 `object`，并共享同一个 `undoId`。
- **SHAPE-12** 每个部件本身都是完整、可直接绘制的 Shape，几何已经是最终结果。读取器不得再把 `transform` 应用到部件上；`transform` 只用于编辑器从 `construction` 重新生成部件。
- **SHAPE-13** 标准级读取器把一个对象的全部部件当作一个整体选择、移动、删除。编辑后，写入器更新全部部件的几何、使用新的 `revision`，并保持部件连续。没有 `preset` 或 `construction` 的对象，以部件本身为准。
- **SHAPE-14** 部件缺失、数量与 `partCount` 不符、顺序不连续、`ref` 找不到首个部件，或 `id` 重复时，读取器把相关部件当作独立的 Shape 显示，报告警告；不得拒绝整页。
- **SHAPE-15** 完整级读取器认识 `preset` 且 `construction` 有效时，可以据此重建对象供编辑；重建结果与文件中的部件不一致时，以文件中的部件为准显示。不认识的预设退回对象层（SHAPE-13）。

## 撤回、追加与擦除

- **SHAPE-16** Shape 与 Ink、Media、Clear 共用 `contentId`，按对象流顺序处理（FILE-14）。
- **SHAPE-17** 完整的 Shape 可以追加到最后一个 Canvas；修改、移动或删除已有 Shape 时，整页追加新版本或完整保存（SAVE-18）。
- **SHAPE-18** Inkeys 附加级的 Erase Ink 作用于在它之前的 Shape（INK-11）。

## 容错

- **SHAPE-19** 缺少 `type`、`contentId`、`undoId`、`shapeType`、`geometry` 或必要样式的 Shape，跳过并报告警告。
- **SHAPE-20** 不认识的 `shapeType`：跳过整个 Shape，不得猜测成其他几何。
- **SHAPE-21** 不认识的 Marker 按 None 显示，保留线条本身；不认识的 `fillType` 按 Solid 显示。
- **SHAPE-22** 字段无效且没有对应回退规则时，该几何或样式无效；最终没有有效几何、Line / Polyline 没有有效描边、或闭合图形的描边与填充都无效时，跳过整个 Shape。
- **SHAPE-23** 有限但越界的 `opacity` 钳制到 `0`–`1`。

## 示例

::: tabs

@tab 虚线双向箭头（基础级）

```jsonc
{
  "type": 5,
  "contentId": 2,
  "undoId": 1,
  "shapeType": 0,
  "geometry": { "points": [ { "x": 120.0, "y": 240.0 }, { "x": 420.0, "y": 240.0 } ] },
  "stroke": {
    "color": { "fallback": 255 },
    "opacity": 1.0,
    "width": 4.0,
    "dashArray": [16.0, 8.0],
    "lineCap": 0,
    "startMarker": 1,
    "endMarker": 1
  }
}
```

@tab 圆角矩形（基础级）

```jsonc
{
  "type": 5,
  "contentId": 3,
  "undoId": 2,
  "shapeType": 2,
  "geometry": {
    "centerX": 360.0, "centerY": 240.0, "width": 240.0, "height": 120.0,
    "cornerRadiusX": 24.0, "cornerRadiusY": 16.0
  },
  "stroke": { "color": { "fallback": 255 }, "opacity": 1.0, "width": 4.0 },
  "fill": { "fillType": 0, "color": { "fallback": 16777215 }, "opacity": 1.0 }
}
```

@tab 对象的首个与第二个部件（标准级）

```jsonc
{
  "type": 5, "contentId": 4, "undoId": 3, "shapeType": 0,
  "geometry": { "points": [ { "x": 100.0, "y": 300.0 }, { "x": 260.0, "y": 300.0 } ] },
  "stroke": { "color": { "fallback": 0 }, "opacity": 1.0, "width": 3.0 },
  "object": {
    "id": "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    "revision": 2,
    "preset": "cuboid",
    "partCount": 12,
    "transform": [1.0, 0.0, 0.0, 1.0, 0.0, 0.0]
  }
}
{
  "type": 5, "contentId": 5, "undoId": 3, "shapeType": 0,
  "geometry": { "points": [ { "x": 260.0, "y": 300.0 }, { "x": 260.0, "y": 180.0 } ] },
  "stroke": { "color": { "fallback": 0 }, "opacity": 1.0, "width": 3.0, "dashArray": [12.0, 18.0] },
  "object": { "ref": "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", "partIndex": 1 }
}
// ……其余 10 个部件
```

@tab 双曲线（核心级；组合为标准级）

```jsonc
// 左支：Polyline，顶点 (640, 540)，坐标已经加上中心 (760, 540)
{
  "type": 5, "contentId": 0, "undoId": 0, "shapeType": 1,
  "geometry": { "points": [
    { "x": 349.87, "y": 834.13 },  // t = −1.9
    // ……按 t 从小到大依次取点，顶点附近更密
    { "x": 640.0, "y": 540.0 },    // t = 0，顶点
    // ……
    { "x": 349.87, "y": 245.87 }   // t = 1.9
  ] },
  "stroke": { "color": { "fallback": 0 }, "opacity": 1.0, "width": 4.0 },
  "object": {
    "id": "eeeeeeee-0016-4000-8000-000000000001",
    "revision": 1,
    "partCount": 4                 // 左支、右支、两条渐近线；没有 preset
  }
}
// 右支：另一个 Polyline，partIndex 1
// 两条渐近线：Line，dashArray [12, 8]，partIndex 2、3
```

完整数据见公开样例 `core-shape-curves.uink`。

:::

## 回退

| 读取器缺少的能力 | 显示方式 |
| --- | --- |
| `opacity`（核心级） | 按不透明绘制 |
| 虚线、Marker、圆角（核心级） | 实线、无端头、直角 |
| `lineCap`、`lineJoin`（核心级） | 圆头、圆角 |
| 图形对象层（核心级、基础级） | 每个部件当作独立 Shape，外观不变 |
| `construction`（完整级以下） | 按对象层整体编辑，不能修改参数 |
| `renderOnlyWhenLatest`（完整级以下） | 忽略标记，全部显示 |

## 相关

- [笔尖与端帽](../common/nib)
- [图形预设注册表](../appendix/shape-presets)
- [Color Map](../common/color)
- [Ink 块](ink)
