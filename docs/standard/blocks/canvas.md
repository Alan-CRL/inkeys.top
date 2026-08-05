---
title: Canvas 块
---

- Type ID: 2
- Type: Map
- Required

Canvas 是扁平内容流中的页面图层记录。它通过 UUID 分别引用 Workspace 与 Device；其后的 Ink/Shape/Media 归属该 Canvas，直到下一个 Canvas 或文件末尾。

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

Canvas 不保存自身边界几何，其显示视口始终填满所引用的 Device。Ink、Shape 与 Media 使用平台无关的 Canvas 逻辑像素；`viewport` 只决定这些世界坐标如何映射到 Device 局部逻辑像素，不修改内容本身的坐标。

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

viewport 缺失时默认 `{ x: 0, y: 0, scale: 1 }`。UInk 1.0 不注册视口旋转、错切或 X/Y 非等比缩放。

### 页面归属与权威层

viewport 归属于 `(workspace, device, pageGuid)`；缺失 GUID 时按 Header Extension 定义的隐式单例解释。同一页面在不同 Device 上可以使用不同 viewport。

只有同页同 Device 的 `layerIndex = 0` Canvas 可以保存 viewport，其他图层必须省略并继承第 0 层。第 0 层缺失 viewport 或 viewport 无效时，所有图层统一使用默认值。读取器遇到非第 0 层的 viewport 时忽略该字段并警告，不得用它覆盖第 0 层状态。

viewport 适用于所有 Workspace 类型。软件可以禁止用户在屏幕批注、白板或 PPT 中平移缩放，但合法的非默认 viewport 必须按照相同公式解释。

## 页面身份、排序与唯一性

- `pageGuid` 在整个 UInk 文件中永久唯一，在完整重写或页面重排时保持不变；复制为新页面时必须生成新 UUID。
- 复制页面时，新页面继承源页面的 viewport；软件可以在复制后调整并保存新的最终值。
- 同一逻辑页跨设备、跨图层共享 `pageGuid`。
- 同一 Workspace 内，`pageGuid` 与 `pageIndex` 严格一一对应，`pageIndex` 从 0 开始且无空洞。
- 每个 `(workspace, device, pageGuid)` 下的 `layerIndex` 从 0 开始且无空洞；缺失 GUID 时使用对应隐式单例，不同设备允许具有不同图层数量。
- `(workspace, device, pageGuid, layerIndex)` 不得重复；这里的 workspace/device 表示显式 GUID 或文件内隐式单例。
- 同页同 Device 中 `layerIndex` 越大越靠前；该合成顺序不依赖 Canvas 的物理排列。
- `pageNumber` 与 `layerNumber` 仅供显示，允许跳号或重复。
- 物理顺序不作强制要求，但写入器应按 Workspace 注册顺序、`pageIndex`、Device 注册顺序、`layerIndex` 写入。

## 多显示器白板

同步翻页使用同一个 Workspace：同一页在多个 Device 上具有相同 `pageGuid/pageIndex`，但每个 Device 使用独立 Canvas、独立 Ink/Shape/Media、独立 contentId 与 undoId。UInk 不同步不同屏幕上的绘制内容。

同一逻辑页在不同 Device 上可以保存不同 viewport；每个 Device 内由第 0 层保存唯一 viewport。

各屏幕独立翻页时使用多个 Workspace，每个 Workspace 维护自己的页面序列。

## PPT 锚定

`workspaceType = 2` 时 Canvas 必须保存 `slideId`。读取器使用 `Slides.FindBySlideID` 定位幻灯片；失败时保留未绑定 Canvas 并提示宿主绑定失效，不得按 `pageIndex` 或任意当前页自动重新附着。用户或宿主可以通过显式重新绑定流程选择新幻灯片，之后完整重写文件。

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

显式注册表下的 `workspaceGuid` 或 `deviceGuid` 缺失、无效时，读取器可以构造仅用于本次加载的临时 Workspace 或根 Device 并警告。缺少页面或图层编号时，可以按物理顺序生成临时独立页面。

第 0 层 viewport Map 缺少任一必填字段、`x/y` 包含 NaN/Infinity，或 `scale` 非正、包含 NaN/Infinity 时，整个 viewport 无效并回退默认值。非第 0 层 viewport 一律忽略。所有默认值、继承和容错结果均不得自动回写源文件。
