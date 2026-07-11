---
title: Canvas 块
---

- Type ID: 3
- Type: Map
- Required

Canvas 表示某个 Device 中的一页或一页中的一个图层。每个 Device 至少包含一个 Canvas；Canvas 可以没有 Ink 或 Media，用于保存用户新建但尚未绘制的空白页或空白图层。

## 字段

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `type` | uint16 | Required | 固定为 `3` |
| `canvasId` | uint32 | Required | Device 内从 0 连续递增的 Canvas 编号 |
| `pageIndex` | uint32 | Required | Device 内从 0 连续的逻辑页索引 |
| `pageNumber` | uint32 | Required | 用户界面显示页码，不参与排序 |
| `layerIndex` | uint32 | Required | 同页从 0 连续的图层索引，越小越先绘制 |
| `layerNumber` | uint32 | Required | 用户界面显示图层号，不参与排序 |
| `slideId` | int32 | Conditional | PPT 场景必填的 PowerPoint COM `SlideID` |
| `x` | float32 | Conditional | Window Device 下相对 Device 原点的 X |
| `y` | float32 | Conditional | Window Device 下相对 Device 原点的 Y |
| `width` | float32 | Conditional | Window Canvas 宽度，必须大于 0 |
| `height` | float32 | Conditional | Window Canvas 高度，必须大于 0 |
| `extra` | Map | Optional | 私有扩展 |

Fullscreen Canvas 不应写入窗口几何，并直接继承 Device 区域。Ink 点始终使用 Canvas 左上角为局部坐标原点。

## 页面与图层

- 不同 `pageIndex` 必须形成从 0 开始、无空洞的序列。
- 同一页的 `layerIndex` 必须形成从 0 开始、无空洞且不重复的序列。
- 只有一个图层时使用 `layerIndex = 0`、`layerNumber = 0`。
- `pageNumber`、`layerNumber` 只用于显示，允许跳号或重复。
- Canvas 在文件中的物理顺序不作强制要求，但写入器应当按 `pageIndex`、`layerIndex` 递增写入。

## PPT 锚定

`sceneType = 2` 时，每个 Canvas 必须保存 `slideId`。读取器优先使用 `Slides.FindBySlideID` 定位页面；若缺失或找不到，则按 0 起始的 `pageIndex` 回退。仍无法定位时应保留 Canvas 并提示页面绑定失效，不得把墨迹随意附着到当前页。

多显示器 PPT 使用多个 Device。相同 `slideId` 可以分别出现在不同 Device 作用域中，各 Canvas 的坐标、内容编号和撤回历史互相独立。

## 示例

::: tabs

@tab PPT 空白页

```jsonc
{
  "type": 3,
  "canvasId": 0,
  "pageIndex": 0,
  "pageNumber": 1,
  "layerIndex": 0,
  "layerNumber": 0,
  "slideId": 256,
  "extra": {}
}
```

@tab Window Canvas

```jsonc
{
  "type": 3,
  "canvasId": 1,
  "pageIndex": 1,
  "pageNumber": 2,
  "layerIndex": 0,
  "layerNumber": 0,
  "x": 120.5,
  "y": 80.0,
  "width": 1280.0,
  "height": 720.0
}
```

:::

## 容错

Canvas 缺少编号时，读取器可以按其在 Device 内的物理序号临时生成 `canvasId` 和独立 `pageIndex`，并使用 `layerIndex = 0`、`pageNumber = pageIndex + 1`、`layerNumber = 0`。这些值仅用于本次加载，不得回写源文件。
