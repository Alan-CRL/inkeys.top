---
title: Shape 块
---

- Type ID: 5
- Type: Map

Shape 表示一条可编辑的参数化图形。它与 Ink、Media 并列存在于 Canvas 内容流中，保存几何、单色填充和单色描边。Shape 不是 Ink 的 `inkType`，也不复用 Ink 的轨迹点。

## 字段

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `type` | uint16 | Required | 固定为 `5` |
| `contentId` | uint32 | Required | Canvas 内 Ink/Shape/Media 共享的连续内容编号 |
| `undoId` | uint32 | Required | Canvas 内非递减的撤回操作分组编号 |
| `shapeType` | int32 | Required | 几何类型 |
| `geometry` | Map | Required | 由 `shapeType` 决定的几何数据 |
| `stroke` | Map | Conditional | 描边样式；Line/Polyline 必填 |
| `fill` | Map | Conditional | 闭合 Shape 的填充样式 |
| `renderOnlyWhenLatest` | bool | Optional | 与 Ink 共用的尾部显示标记，缺失时为 `false` |
| `extra` | Map | Optional | 软件私有扩展 |

Shape 至少必须有 `stroke` 或 `fill` 之一。Line/Polyline 必须有 `stroke`，不得有 `fill`。

## `shapeType`

| 值 | 名称 | 语义 |
| --- | --- | --- |
| `0` | Line | 由两个端点定义的单个线条对象 |
| `1` | Polyline | 由至少两个点定义的单个折线对象 |
| `2` | Rectangle | 可非等比缩放的矩形 |
| `3` | Square | 保持等比语义的正方形 |
| `4` | Ellipse | 可非等比缩放的椭圆 |
| `5` | Circle | 保持等比语义的圆 |
| `6` | Polygon | 至少三个点的闭合多边形 |
| `7`–`127` | Reserved | UInk 后续版本保留 |
| `128` 及以上 | Private | 软件私有图形类型 |

`128+` 私有编号没有全局厂商命名空间，只保证预先约定的实现之间互操作。读取器遇到未知 `shapeType` 时，应跳过该完整 Shape，报告警告并继续读取后续内容。不能把未知几何安全地回退为其他几何时，不得伪造一个不同的 Shape。

`shapeType` 只描述底层几何，不描述线条是否连续。Line/Polyline 的实线、虚线、点线等外观由同一个 Stroke Map 的 `dashArray` 控制，始终作为一个 Shape、一个 `contentId` 和一个可整体编辑的对象保存，不得把可见短线拆成多个 Shape。

## 几何

### Point Map

Polyline 和 Polygon 的每个点使用 Map：

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `x` | float32 | Required | Canvas 绝对 X 坐标 |
| `y` | float32 | Required | Canvas 绝对 Y 坐标 |

坐标必须是有限数。Shape 点全部使用绝对坐标，不采用 Ink 的首点绝对、后续点相对编码。

### Line、Polyline 与 Polygon

这三种几何使用 `points`：

- Line 必须恰好有两个点；
- Polyline 至少有两个点；
- Polygon 至少有三个点，读取器按顺序连接并隐式连接末点与首点；写入器不得重复保存首点。

Polygon 用于三角形等基础多边形，不注册独立 Triangle 类型。Polygon 的填充使用非零环绕规则；软件不得依赖自交多边形获得未定义的填充结果。

### Rectangle 与 Ellipse

Rectangle 和 Ellipse 的 `geometry` 字段为：

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `centerX` | float32 | Required | 几何中心 X |
| `centerY` | float32 | Required | 几何中心 Y |
| `width` | float32 | Required | 最终宽度，必须大于 0 |
| `height` | float32 | Required | 最终高度，必须大于 0 |
| `rotation` | float32 | Optional | 弧度，Canvas 坐标系正值顺时针，缺失为 `0` |

Rectangle 和 Ellipse 允许 `width` 与 `height` 不相等。旋转后仍以这组最终 Canvas 几何显示，不使用通用仿射矩阵。

### Square

Square 的 `geometry` 字段为：

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `centerX` | float32 | Required | 几何中心 X |
| `centerY` | float32 | Required | 几何中心 Y |
| `size` | float32 | Required | 正方形边长，必须大于 0 |
| `rotation` | float32 | Optional | 弧度，缺失为 `0` |

Square 使用独立类型，以便编辑器在缩放时保持宽高比例。

### Circle

Circle 的 `geometry` 字段为：

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `centerX` | float32 | Required | 圆心 X |
| `centerY` | float32 | Required | 圆心 Y |
| `radius` | float32 | Required | 半径，必须大于 0 |

Circle 不保存 rotation，因为旋转不会改变圆的几何。Circle 使用独立类型，以便编辑器在缩放时保持等比。

## Stroke Map

Stroke 在同一个 Shape 内使用一种颜色、透明度和固定宽度，不支持逐点宽度或颜色。

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `color` | Color Map | Required | 描边颜色，支持 SDR/HDR 回退 |
| `opacity` | float32 | Required | 描边透明度，范围 `0`–`1` |
| `width` | float32 | Required | 最终可见的 Canvas 描边宽度，必须大于 0 |
| `dashArray` | `Array<float32>` | Optional | 实际 dash/gap 长度，缺失或空数组为实线 |
| `dashOffset` | float32 | Optional | dash 起始偏移，缺失为 `0` |
| `startMarker` | int32 | Optional | 起点端头，缺失为 `0` |
| `endMarker` | int32 | Optional | 终点端头，缺失为 `0` |

`width`、`dashArray` 和 `dashOffset` 使用保存时最终可见的 Canvas 长度。软件缩放 Shape 时可以自行决定是否改变它们，但写入器必须保存换算后的实际结果。读取器不得通过额外几何变换再次缩放这些值。

非空 `dashArray` 必须包含偶数个非负有限值，且总和大于 0。非法 `dashArray` 或非法 `dashOffset` 时，读取器按实线处理。具体线帽、连接处和抗锯齿外观由软件决定，UInk 不注册 `lineCap`、`lineJoin` 或 `miterLimit`。

### Marker

| 值 | 名称 | 语义 |
| --- | --- | --- |
| `0` | None | 无端头 |
| `1` | OpenArrow | 开放式箭头语义 |
| `2`–`127` | Reserved | UInk 后续版本保留 |
| `128` 及以上 | Private | 软件私有端头 |

Marker 只保存类型编号，不保存 Path、尺寸或固定比例。端头的具体外形由软件自行决定。未知 Marker 必须按 None 回退，不得丢弃主体 Line/Polyline。

`startMarker` 和 `endMarker` 只允许用于 Line/Polyline。闭合 Shape 中出现 Marker 时读取器忽略这些字段并警告。

软件内部可以用主线加两条端头线绘制箭头；写入 UInk 时应归一化为一个 Line/Polyline 及其 Marker。Marker 不产生额外的 Shape、`contentId` 或 `undoId`。

## Fill Map

Fill 首版只支持单色填充，渐变、纹理和图片填充留待后续版本或私有扩展。

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `fillType` | int32 | Required | `0` 为 Solid，`1`–`127` 保留，`128+` 私有 |
| `color` | Color Map | Required | 填充颜色，支持 SDR/HDR 回退 |
| `opacity` | float32 | Required | 填充透明度，范围 `0`–`1` |

未知 `fillType` 时，读取器使用 `color` 和 `opacity` 按 Solid 回退。Line/Polyline 不得保存 Fill；闭合 Shape 可以只保存 Fill、只保存 Stroke 或同时保存两者。

## 内容流、撤回与增量写入

Shape 与 Ink、Media 按物理块顺序混合处理。三者共享当前 Canvas 的连续 `contentId`；`undoId` 从 0 开始且只允许不递减，相同 `undoId` 的连续内容块构成一次撤回操作。

`contentId` 只标识当前文件版本中当前 Canvas 的物理顺序，完整重写后不得作为稳定外部引用。

完整 Shape 可以追加到文件末尾最后一个 Canvas。修改、移动、缩放或删除既有 Shape 必须完整重写，不得通过追加重复旧 Shape。完整重写后重新整理各 Canvas 的 `contentId` 和 `undoId`。

Erase Ink 按物理顺序作用于同一 Canvas 中此前的 Shape 与 Ink，不作用于 Media；具体裁剪、透明和背景效果由软件决定。读取器不得因为块类型不同而重新排序。

Shape 与 Ink 共用 `renderOnlyWhenLatest`。读取器忽略 Media，从 Canvas 尾部反向收集连续且标记为 `true` 的 Ink/Shape；只有末尾标记组显示，其他标记内容隐藏。分组不改变 undoId。

形状修正结果存在时，标记原稿隐藏。撤回结果后原稿成为末尾标记组并重新显示，随后仍按各自 undoId 逐步撤回。隐藏但未撤回的原稿必须在完整保存时保留。

## 容错与兼容

- 缺少 `type`、`contentId`、`undoId`、`shapeType`、`geometry` 或必要样式时跳过该 Shape，报告警告并继续读取。
- 坐标、尺寸、rotation、宽度、dash 或 opacity 含 NaN/Infinity 时，按字段回退；无法构造有效几何时跳过整块。
- Shape 的未知 `shapeType`：跳过整块。
- Stroke 的未知 Marker：按 None 回退并保留主体几何。
- Fill 的未知 `fillType`：使用 Color Map 和 opacity 按 Solid 回退。
- 旧读取器遇到未知 Type ID `5` 时，可以跳过当前完整 MessagePack 对象并继续读取后续块。
- 外部导入或包含未知块的文件默认另存为；用户明确确认可能丢失未知内容后才允许覆盖源文件。

## 示例

### 虚线双向箭头

```jsonc
{
  "type": 5,
  "contentId": 2,
  "undoId": 1,
  "shapeType": 0,
  "geometry": {
    "points": [
      { "x": 120.0, "y": 240.0 },
      { "x": 420.0, "y": 240.0 }
    ]
  },
  "stroke": {
    "color": { "fallback": 255 },
    "opacity": 1.0,
    "width": 4.0,
    "dashArray": [16.0, 8.0],
    "startMarker": 1,
    "endMarker": 1
  }
}
```

### 旋转正方形与 HDR 填充

```jsonc
{
  "type": 5,
  "contentId": 3,
  "undoId": 2,
  "shapeType": 3,
  "geometry": {
    "centerX": 320.0,
    "centerY": 220.0,
    "size": 180.0,
    "rotation": 0.3926991
  },
  "stroke": {
    "color": { "fallback": 255 },
    "opacity": 1.0,
    "width": 5.0
  },
  "fill": {
    "fillType": 0,
    "color": {
      "fallback": 16763904,
      "space": "scrgb",
      "components": [1.8, 0.65, 0.1]
    },
    "opacity": 0.5
  }
}
```

## 相关说明

- [块类型](../type)
- [Color Map](../common/color)
- [墨迹主文件](../file/main)
- [Canvas 块](canvas)
- [Ink 块](ink)
- [增量写入](../incremental)
