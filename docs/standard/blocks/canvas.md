---
title: Canvas 块
---

- Type ID: 2
- Type: Map
- Required

Canvas 是扁平内容流中的页面图层记录。它通过 UUID 分别引用 Workspace 与 Device；其后的 Ink/Media 归属该 Canvas，直到下一个 Canvas 或文件末尾。

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
| `extra` | Map | Optional | 私有扩展 |

Canvas 不保存几何。其局部原点为所引用 Device 的左上角，区域大小等于该 Device 的完整显示面。

## 页面身份、排序与唯一性

- `pageGuid` 在整个 UInk 文件中永久唯一，在完整重写或页面重排时保持不变；复制为新页面时必须生成新 UUID。
- 同一逻辑页跨设备、跨图层共享 `pageGuid`。
- 同一 Workspace 内，`pageGuid` 与 `pageIndex` 严格一一对应，`pageIndex` 从 0 开始且无空洞。
- 每个 `(workspaceGuid, deviceGuid, pageGuid)` 下的 `layerIndex` 从 0 开始且无空洞；不同设备允许具有不同图层数量。
- `(workspaceGuid, deviceGuid, pageGuid, layerIndex)` 不得重复。
- `pageNumber` 与 `layerNumber` 仅供显示，允许跳号或重复。
- 物理顺序不作强制要求，但写入器应按 Workspace 注册顺序、`pageIndex`、Device 注册顺序、`layerIndex` 写入。

## 多显示器白板

同步翻页使用同一个 Workspace：同一页在多个 Device 上具有相同 `pageGuid/pageIndex`，但每个 Device 使用独立 Canvas、独立 Ink/Media、独立 contentId 与 undoId。UInk 不同步不同屏幕上的绘制内容。

各屏幕独立翻页时使用多个 Workspace，每个 Workspace 维护自己的页面序列。

## PPT 锚定

`workspaceType = 2` 时 Canvas 必须保存 `slideId`。读取器优先使用 `Slides.FindBySlideID` 定位幻灯片；失败后按 `pageIndex` 回退。仍无法定位时保留 Canvas 并提示宿主绑定失效，不得附着到任意当前页。

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
  "extra": {}
}
```

该 Canvas 可以不包含任何 Ink/Media，用于保存用户已创建但尚未绘制的空白页或图层。每个显式 Workspace 至少应包含一个 Canvas。

## 容错

显式注册表下的 `workspaceGuid` 或 `deviceGuid` 缺失、无效时，读取器可以构造仅用于本次加载的临时 Workspace 或根 Device 并警告。缺少页面或图层编号时，可以按物理顺序生成临时独立页面；所有容错值均不得回写源文件。
