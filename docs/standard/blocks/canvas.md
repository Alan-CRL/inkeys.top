---
title: Canvas 块
---

- Type ID：`2`
- 类型：Map

**Canvas 是“某一页在某块屏幕上的某个图层”**。它后面跟着的 Ink、Shape、Media、Clear 都画在这个 Canvas 上，直到下一个 Canvas 出现。Canvas 还保存这一页的元数据：页码、背景、PPT 绑定，以及平移缩放状态 `viewport`。

::: tip 等级
- **核心级**：`pageGuid`、`pageIndex`、`layerIndex`、`workspaceGuid`、`deviceGuid`；同一个唯一键以最后出现的为准。
- **基础级**：`pageNumber`、`background`。
- **标准级**：`viewport`；PPT 的 `slideId`、`binding`、`pageState`、`pageKind`。
- **完整级**：多图层（`layerIndex > 0`）合成、`layerNumber`。
:::

## 字段

| 字段 | 类型 | 要求 | 等级 | 说明 |
| --- | --- | --- | --- | --- |
| `type` | uint16 | Required | 核心 | 固定为 `2` |
| `workspaceGuid` | string(36) | Conditional | 核心 | 使用显式 Workspace 注册表时必填 |
| `deviceGuid` | string(36) | Conditional | 核心 | 使用显式 Device 注册表时必填 |
| `pageGuid` | string(36) | Required | 核心 | 页面的永久 UUID |
| `pageIndex` | uint32 | Required | 核心 | 页面在 Workspace 内的顺序，从 `0` 开始 |
| `pageNumber` | uint32 | Required | 基础 | 界面上显示的页码，不参与排序 |
| `layerIndex` | uint32 | Required | 核心 | 图层顺序，从 `0` 开始 |
| `layerNumber` | uint32 | Required | 完整 | 界面上显示的图层号，不参与排序 |
| `viewport` | Map | Optional | 标准 | 平移与缩放，只写在第 0 层，见 [viewport](#viewport) |
| `background` | Map | Optional | 基础 | 页面背景，只写在第 0 层，见[页面元数据](#页面元数据) |
| `pageState` | int32 | Optional | 标准 | 页面状态，只写在第 0 层 |
| `pageKind` | int32 | Optional | 标准 | 页面类型，只写在第 0 层 |
| `binding` | int32 | Optional | 标准 | PPT 绑定方式，只写在第 0 层 |
| `slideId` | int32 | Conditional | 标准 | PowerPoint 的 `SlideID`，见 [PPT 绑定](#ppt-绑定) |
| `extra` | Map | Optional | — | 软件私有字段 |

## 页面身份

- **CANVAS-1** `pageGuid` 在整个文件中唯一，页面重排或完整保存后保持不变；复制出的新页面必须生成新的 UUID。
- **CANVAS-2** 同一页在多个 Device、多个图层上的 Canvas 共享 `pageGuid` 与 `pageIndex`。
- **CANVAS-3** 紧凑文件中，同一 Workspace 内 `pageGuid` 与 `pageIndex` 一一对应，`pageIndex` 从 `0` 开始连续。按页追加时可能暂时重复或有空洞，读取器按 SAVE-14 处理。
- **CANVAS-4** 每个 `(Workspace, Device, pageGuid)` 下，`layerIndex` 从 `0` 开始连续。不同 Device 的图层数可以不同。
- **CANVAS-5** `(Workspace, Device, pageGuid, layerIndex)` 是 Canvas 唯一键。同一个键出现多次时，后出现的整体替代先出现的（FILE-8）。
- **CANVAS-6** `pageNumber` 与 `layerNumber` 只用于显示，可以跳号或重复。
- **CANVAS-7** 复制页面时，新页面继承原页面的 `viewport` 与页面元数据。

## 页面元数据

页面元数据属于“某页在某个 Device 上”，与 `viewport` 一样只写在第 0 层：

- **CANVAS-8** `viewport`、`background`、`pageState`、`pageKind`、`binding` 只能写在 `layerIndex = 0` 的 Canvas 上，其他图层继承第 0 层。读取器遇到写在其他图层上的这些字段时忽略它们并报告警告。

### `background`（基础级）

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `color` | [Color Map](../common/color) | Required | 背景颜色 |
| `pattern` | int32 | Optional | `0` Blank（缺省）、`1` Dots 点阵、`2` Grid 方格；`3`–`127` 保留，`128`+ 私有 |

<!-- visual: background-patterns — 同一页在 Blank、Dots、Grid 三种图案下的样子 -->
<UInkBackgroundPatterns />

- **CANVAS-9** 图案的间距、线色由软件决定。不认识的 `pattern` 按 Blank 显示。
- **CANVAS-10** 没有 `background` 时，背景透明（屏幕批注、PPT）或由软件决定（白板）。

### `pageState`、`pageKind`、`binding`（标准级）

| 字段 | 值 | 含义 |
| --- | --- | --- |
| `pageState` | `0` Active（缺省） | 正常页面 |
| | `1` Retained | 保留页：内容仍保存，但不在正常页序中显示。例如 PPT 中对应幻灯片已被删除的批注 |
| `pageKind` | `0` Normal（缺省） | 普通页面 |
| | `1` EndScreen | PPT 放映结束后的黑屏页，可以没有 `slideId` |
| `binding` | `0` SlideId（缺省） | 按 `slideId` 绑定幻灯片 |
| | `1` PageIndex | 按顺序绑定：第 `pageIndex` 页对应第 `pageIndex + 1` 张幻灯片 |

- **CANVAS-11** 标准级读取器不把保留页放进正常页序；可以单独列出，供用户查看或重新绑定。
- **CANVAS-12** 不认识的 `pageState`、`pageKind`、`binding` 取值按缺省值处理。

## PPT 绑定

- **CANVAS-13** `workspaceType = 2` 时，`binding = 0`（缺省）的普通页面必须写 `slideId`；`binding = 1` 或 `pageKind = 1` 的页面可以不写。
- **CANVAS-14** 按 `slideId` 绑定时，读取器用 `Slides.FindBySlideID` 定位幻灯片。找不到时，必须保留该 Canvas 并标记为未绑定，提示用户；不得按 `pageIndex`、当前页或其他幻灯片自动重新附着。用户通过明确的重新绑定操作选择新幻灯片后，写入器保存新的绑定。
- **CANVAS-15** 同一张幻灯片在多个 Device 上显示时，各 Canvas 共享 `pageGuid` 与 `slideId`，内容各自独立。

## viewport

`viewport` 描述 Device 左上角对着 Canvas 的哪个位置，以及放大了多少倍。

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `x` | float32 | Required | Device 左上角对应的 Canvas X，可以为负 |
| `y` | float32 | Required | Device 左上角对应的 Canvas Y，可以为负 |
| `scale` | float32 | Required | 缩放比例，有限正数；`1` 表示一个 Canvas 单位对应一个 Device 像素 |

<!-- visual: viewport-mapping（交互）— 拖动与缩放 Device 取景框，实时显示 x / y / scale 与公式的计算结果 -->
<UInkViewportMapping />

Canvas 坐标与 Device 坐标的换算：

```text
deviceX = (canvasX − viewport.x) × viewport.scale
deviceY = (canvasY − viewport.y) × viewport.scale

canvasX = deviceX / viewport.scale + viewport.x
canvasY = deviceY / viewport.scale + viewport.y
```

- **CANVAS-16** `viewport` 缺失时为 `{ x: 0, y: 0, scale: 1 }`。
- **CANVAS-17** 内容块（Ink、Shape、Media）都按同一个 `viewport` 映射；笔迹宽度、描边宽度同样乘以 `scale`。
- **CANVAS-18** Device 当前能看到的 Canvas 范围宽 `Device.width / scale`、高 `Device.height / scale`。Device 尺寸变化时保持左上角不变，向右下扩大或缩小可见范围。
- **CANVAS-19** `viewport.x` / `y` 是 Canvas 坐标，与 Device 自身的 `x` / `y` 没有关系（DEV-3）。
- **CANVAS-20** UInk 不注册视口旋转、错切或非等比缩放。
- **CANVAS-21** 所有 Workspace 类型都可以使用 `viewport`。软件可以不允许用户平移缩放，但遇到合法的非默认 `viewport` 时必须按本节公式显示。
- **CANVAS-22** `viewport` 缺少字段、`x` / `y` 不是有限数、或 `scale` 不是有限正数时，整个 `viewport` 无效，使用缺省值。

## 其他规则

- **CANVAS-23** Canvas 不保存自身的边界；它的显示视口始终铺满所引用的 Device（FILE-10）。
- **CANVAS-24** 使用显式注册表时，`workspaceGuid` 或 `deviceGuid` 缺失或找不到，读取器建立临时 Workspace 或根 Device，并报告警告（FILE-23）。
- **CANVAS-25** `pageGuid`、`pageIndex` 缺失或无效时，读取器可以按对象流顺序生成临时页面；`layerIndex` 缺失或无效时，在临时页面下按对象流顺序生成临时图层。临时结果不得写回文件。

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
  "viewport": { "x": -320.0, "y": 180.0, "scale": 1.5 },
  "background": { "color": { "fallback": 16777215 }, "pattern": 1 }   // 白色点阵
}
```

PPT 结束页：

```jsonc
{
  "type": 2,
  "workspaceGuid": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "pageGuid": "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  "pageIndex": 24, "pageNumber": 25, "layerIndex": 0, "layerNumber": 0,
  "pageKind": 1                                                         // 没有 slideId
}
```

## 回退

| 读取器缺少的能力 | 显示方式 |
| --- | --- |
| `background`（核心级） | 透明或软件默认背景 |
| `viewport`（核心级、基础级） | 按 `{ x: 0, y: 0, scale: 1 }` 显示 |
| PPT 绑定、`pageState`、`pageKind`（核心级、基础级） | 所有页面按 `pageIndex` 作为普通页面显示，保留页也显示 |
| 多图层（完整级以下） | 按 `layerIndex` 从小到大叠加，当作一层显示 |

## 相关

- [墨迹主文件](../file/main)
- [Header Extension 块](headerExtension)
- [Device 结构](device)
- [保存、追加与恢复](../incremental)
