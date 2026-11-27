---
title: Device 结构
---

- 类型：Map
- 位置：Header Extension 的 `devices` 注册表

**Device 描述一块显示区域在哪里、有多大**：可以是一台显示器（Display），也可以是显示器里的一个窗口或“板中板”（Window）。Device 不是顶层块，只出现在注册表里。

::: tip 等级
- **核心级**：只需要知道有哪些 Device，按 FILE-9 取第一个 Device 的 Canvas 显示。
- **完整级**：多 Device 的位置、Window 嵌套与 `zIndex` 合成。
:::

## 单位

- **DEV-1** Device 的位置与尺寸使用像素：Display 使用系统虚拟桌面的像素坐标，Window 使用父 Device 的像素坐标。Canvas 的坐标与笔迹宽度使用所属 Device 的像素（INK-6）。
- **DEV-2** 文件不记录 DPI 缩放。同一个文件在 DPI 不同的屏幕上打开时，笔迹相对屏幕的物理大小可能不同；需要保持视觉大小的软件可以调整 Canvas 的 `viewport.scale`。
- **DEV-3** Device 只描述显示区域本身，不描述它正在看 Canvas 的哪一部分；那是 Canvas `viewport` 的职责。Device 的 `x` / `y` 不得当作 `viewport` 使用。

## 公共字段

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `guid` | string(36) | Required | Device 的永久 UUID |
| `deviceType` | int32 | Required | `0` Display、`1` Window；`2`–`127` 保留，`128`+ 私有 |
| `name` | string | Optional | 显示名称 |
| `hardware` | Map | Optional | 物理显示器的匹配信息，只用于 Display |
| `extra` | Map | Optional | 软件私有字段 |

## Display

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `x` | int32 | Required | 在系统虚拟桌面中的 X 原点，可以为负 |
| `y` | int32 | Required | 在系统虚拟桌面中的 Y 原点，可以为负 |
| `width` | uint32 | Required | 宽度，大于 `0` |
| `height` | uint32 | Required | 高度，大于 `0` |

### Hardware Map

全部字段可选，只用于把 Device 匹配到实际的显示器：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `name` | string | 硬件报告的名称 |
| `id` | string | 平台提供的硬件标识 |
| `identifiers` | `Map<string, string>` | 其他标识，键和值都是 string |
| `physicalWidth` | uint32 | 原生分辨率宽度，大于 `0` |
| `physicalHeight` | uint32 | 原生分辨率高度，大于 `0` |
| `scaleFactor` | float32 | 保存时系统的显示缩放比例，仅供参考，有限正数 |

- **DEV-4** `hardware` 中的信息不参与坐标计算。硬件无法匹配时，读取器仍使用保存的几何或当前显示区域继续加载。

## Window

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `parentDeviceGuid` | string(36) | Required | 父 Display 或 Window |
| `x` | float32 | Required | 相对父 Device 的 X |
| `y` | float32 | Required | 相对父 Device 的 Y |
| `width` | float32 | Required | 宽度，大于 `0` |
| `height` | float32 | Required | 高度，大于 `0` |
| `zIndex` | uint32 | Required | 同一父 Device 下的叠放顺序，越大越靠前 |

<!-- visual: device-tree — 两台显示器并排（第二台原点 x=3840），第一台上有一个板中板 Window，标出各自的 x/y/width/height -->
<UInkDeviceTree />

- **DEV-5** Window 可以嵌套 Window，可以部分超出父区域，超出部分由宿主裁剪。
- **DEV-6** `zIndex` 相同时，后注册的 Window 在上（FILE-13）。
- **DEV-7** Device 树不得有循环。`parentDeviceGuid` 找不到或形成循环时，读取器断开该引用，把这个 Window 当作临时的根显示区域，并报告警告（FILE-22）。
- **DEV-8** 不认识的 `deviceType`：当作本次加载临时使用的根显示区域（FILE-21）。

## 示例

```jsonc
[
  {
    "guid": "11111111-1111-4111-8111-111111111111",
    "deviceType": 0,
    "name": "主显示器",
    "x": 0, "y": 0, "width": 3840, "height": 2160,
    "hardware": { "id": "DISPLAY\\ACR1234", "scaleFactor": 1.5 }
  },
  {
    "guid": "22222222-2222-4222-8222-222222222222",
    "deviceType": 1,
    "name": "板中板",
    "parentDeviceGuid": "11111111-1111-4111-8111-111111111111",
    "x": 120.0, "y": 80.0, "width": 1280.0, "height": 720.0,
    "zIndex": 10
  }
]
```

## 回退

| 读取器缺少的能力 | 显示方式 |
| --- | --- |
| 多 Device（完整级以下） | 只显示第一个注册 Device 的 Canvas，或由软件让用户选择 |
| Window 合成（完整级以下） | Window 上的 Canvas 当作独立页面显示，不叠加到父 Device 上 |

## 相关

- [Header Extension 块](headerextension)
- [Canvas 块](canvas)
