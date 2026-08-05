---
title: Canvas 块
---

- Type ID: 2
- Type: Map
- Required

Canvas 是扁平内容流中的页面图层记录。使用显式注册表时，它通过 GUID 分别引用 Workspace 与 Device；使用隐式单例时，它省略对应 GUID。Canvas 后面的 Ink、Shape 和 Media 归属该 Canvas，作用域在下一个 Canvas 或文件末尾结束。

## 字段

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `type` | uint16 | Required | 固定为 `2` |
| `workspaceGuid` | string(36) | Conditional | 使用显式 Workspace 注册表时必填 |
| `deviceGuid` | string(36) | Conditional | 使用显式 Device 注册表时必填 |
| `pageGuid` | string(36) | Required | 逻辑页面的永久 UUID |
| `pageIndex` | uint32 | Required | Workspace 内从 0 连续的当前页序 |
| `pageNumber` | uint32 | Required | 用户界面显示页码，不参与排序 |
| `layerIndex` | uint32 | Required | 同一设备页面内从 0 连续的图层索引 |
| `layerNumber` | uint32 | Required | 用户界面显示图层号，不参与排序 |
| `slideId` | int32 | Conditional | PPT Workspace 必填的 PowerPoint COM `SlideID` |
| `viewport` | Map | Conditional | 仅 `layerIndex = 0` 可以保存；Device 可见区域对应的 Canvas 世界坐标与统一缩放 |
| `extra` | Map | Optional | 私有扩展 |

Canvas 不保存自身边界几何，其显示视口始终填满对应的显式或隐式 Device。Ink、Shape 与 Media 使用平台无关的 Canvas 逻辑像素；`viewport` 只决定这些世界坐标如何映射到 Device 局部逻辑像素，不修改内容本身的坐标。

## Viewport Map

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `x` | float32 | Required | Device 左上角对应的 Canvas 逻辑 X，可为负数 |
| `y` | float32 | Required | Device 左上角对应的 Canvas 逻辑 Y，可为负数 |
| `scale` | float32 | Required | Device 逻辑像素 / Canvas 逻辑像素，必须为有限正数 |

`viewport.x/y` 使用 Canvas 世界坐标。它们与 Display Device 的系统绝对 `x/y`、Window Device 的父级相对 `x/y` 没有继承或换算关系。

Canvas 世界坐标到 Device 局部坐标的映射为：

```text
deviceX = (canvasX - viewport.x) * viewport.scale
deviceY = (canvasY - viewport.y) * viewport.scale
```

反向映射为：

```text
canvasX = deviceX / viewport.scale + viewport.x
canvasY = deviceY / viewport.scale + viewport.y
```

`scale = 1` 表示一 Canvas 逻辑像素对应一 Device 逻辑像素，`2` 表示放大两倍，`0.5` 表示缩小到一半。Device 当前可见的 Canvas 世界宽高分别为 `Device.width / scale` 与 `Device.height / scale`。物理像素和 DPI 不参与该公式。Device 或窗口尺寸改变时保持 viewport 左上角不变，并向右下改变可见范围。

`viewport` 缺失时默认 `{ x: 0, y: 0, scale: 1 }`。UInk 1.0 不注册视口旋转、错切或 X/Y 非等比缩放。

### 页面归属与权威层

为避免显式 GUID 与隐式单例产生歧义，本文使用以下逻辑键：`workspaceKey` 是显式 `workspaceGuid` 或文件内隐式 Workspace 单例，`deviceKey` 是显式 `deviceGuid` 或文件内隐式 Device 单例。`viewport` 归属于 `(workspaceKey, deviceKey, pageGuid)`。同一页面在不同 Device 上可以使用不同 `viewport`。

只有同页同 Device 的 `layerIndex = 0` Canvas 可以保存 `viewport`，其他图层必须省略并继承第 0 层。第 0 层缺失 `viewport` 或 `viewport` 无效时，所有图层统一使用默认值。读取器遇到非第 0 层的 `viewport` 时忽略该字段并警告，不得用它覆盖第 0 层状态。

`viewport` 适用于所有 Workspace 类型。软件可以禁止用户在屏幕批注、白板或 PPT 中平移缩放，但合法的非默认 `viewport` 必须按照相同公式解释。

## 页面身份、排序与唯一性

- `pageGuid` 在整个 UInk 文件中永久唯一，在完整保存或页面重排时保持不变；复制为新页面时必须生成新 UUID。
- 复制页面时，新页面继承源页面的 `viewport`；软件可以在复制后调整并保存新的最终值。
- 同一逻辑页跨设备、跨图层共享 `pageGuid`。
- 同一 Workspace 内，`pageGuid` 与 `pageIndex` 严格一一对应，`pageIndex` 从 0 开始且无空洞。
- 每个 `(workspaceKey, deviceKey, pageGuid)` 下的 `layerIndex` 从 0 开始且无空洞；不同 Device 允许具有不同图层数量。
- `(workspaceKey, deviceKey, pageGuid, layerIndex)` 是 Canvas 唯一键，在同一文件内不得重复。
- 同页同 Device 中 `layerIndex` 越大越靠前；该合成顺序不依赖 Canvas 的物理排列。
- `pageNumber` 与 `layerNumber` 仅供显示，允许跳号或重复。
- Canvas 块在对象流中的排列不决定合成顺序。为便于流式读取和人工检查，写入器应依次按 Workspace 注册顺序、`pageIndex`、Device 注册顺序和 `layerIndex` 排列 Canvas；隐式单例只有一个注册顺位。

## 多显示器白板

同步翻页使用同一个 Workspace：同一页在多个 Device 上具有相同 `pageGuid` 和 `pageIndex`，但每个 Device 使用独立 Canvas、独立 Ink/Shape/Media、独立 `contentId` 与 `undoId`。UInk 不同步不同屏幕上的绘制内容。

同一逻辑页在不同 Device 上可以保存不同 viewport；每个 Device 内由第 0 层保存唯一 viewport。

各屏幕独立翻页时使用多个 Workspace，每个 Workspace 维护自己的页面序列。

## PPT 锚定

`workspaceType = 2` 时，Canvas 必须保存 `slideId`。读取器使用 `Slides.FindBySlideID` 定位幻灯片。定位失败时，读取器必须保留该 Canvas，将其标记为未绑定并提示宿主绑定失效；不得按 `pageIndex`、当前页或其他幻灯片自动重新附着。用户或宿主可以通过显式重新绑定流程选择新幻灯片，随后执行完整保存。

同一 PPT 页面跨设备显示时共享 `pageGuid` 和 `slideId`，但仍使用独立 Canvas 内容。

## 示例

```jsonc
{
  "type": 2,
  "workspaceGuid": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "deviceGuid": "11111111-1111-4111-8111-111111111111",
  "pageGuid": "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  "pageIndex": 0,
  "pageNumber": 1,
  "layerIndex": 0,
  "layerNumber": 0,
  "slideId": 256,
  "viewport": {
    "x": -320.0,
    "y": 180.0,
    "scale": 1.5
  },
  "extra": {}
}
```

该 Canvas 可以不包含任何 Ink/Shape/Media，用于保存用户已创建但尚未绘制的空白页或图层。每个显式 Workspace 至少应包含一个 Canvas。

## 容错

使用显式注册表时，如果 `workspaceGuid` 或 `deviceGuid` 缺失或无法解析，读取器可以构造仅供本次加载使用的临时 Workspace 或根 Device，并报告警告。页面身份或 `pageIndex` 缺失或无效时，读取器可以按 Canvas 在对象流中的先后顺序生成临时独立页面；`layerIndex` 缺失或无效时，应在对应临时页面下按对象流顺序生成临时图层。上述临时身份只用于本次加载。

第 0 层 `viewport` Map 缺少任一必填字段、`x/y` 包含 NaN/Infinity，或 `scale` 非正、包含 NaN/Infinity 时，整个 `viewport` 无效并回退默认值。非第 0 层 `viewport` 一律忽略。所有默认值、继承和容错结果均不得自动回写源文件。
