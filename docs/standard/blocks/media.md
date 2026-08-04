---
title: Media 块
---

- Type ID: 4
- Type: Map

Media 在墨迹主文件中保存资源引用、顺序、撤回分组和呈现参数。实际资源位于对应的 `.uink.extra` ZIP；ZIP 只是资源容器，不包含额外索引。

## 基础字段

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `type` | uint16 | Required | 固定为 `4` |
| `contentId` | uint32 | Required | Canvas 内 Ink/Shape/Media 共享的连续内容编号 |
| `undoId` | uint32 | Required | 与 Ink 共享的撤回操作分组 |
| `path` | string | Required | `.uink.extra` 内的安全相对路径 |
| `mimeType` | string | Required | 标准 MIME 类型 |
| `extra` | Map | Optional | 私有扩展 |

`contentId` 按 Ink、Shape 与 Media 的混合物理顺序从 0 连续递增。相同 `undoId` 的连续 Ink/Shape/Media 可以构成同一步撤回。

## 资源路径

`path` 必须相对于 `.uink.extra` 根目录，统一使用 `/` 分隔。不得写入绝对路径、URI，或使用 `..` 跳出 ZIP 根目录。

资源包或目标文件缺失时，读取器必须继续渲染基础墨迹并提示媒体缺失；是否显示占位符由软件决定。未知 MIME 类型应跳过渲染并继续读取后续块。

## 视觉媒体

图片、SVG、视频和 PDF 页面等视觉媒体增加：

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `width` | float32 | Required | 变换前的 Canvas 逻辑宽度，必须大于 0 |
| `height` | float32 | Required | 变换前的 Canvas 逻辑高度，必须大于 0 |
| `transform` | `Array<float32>(6)` | Optional | 二维仿射矩阵，缺失时为单位矩阵 |
| `opacity` | float32 | Optional | 范围 `0`–`1`，缺失时为 `1` |

矩阵按 `[a, b, c, d, e, f]` 保存：

```text
x' = a*x + c*y + e
y' = b*x + d*y + f
```

矩阵统一负责缩放、旋转、错切和平移。矩阵缺失、长度错误或包含非有限数时，读取器使用单位矩阵并报告警告。

## PDF 文档媒体

UInk 1.0 注册 `application/pdf` 为标准文档媒体。Word、PowerPoint 等格式可以作为软件私有扩展使用，但本版本不保证跨软件互操作。

PDF Media 是一个单页视觉视口，使用视觉媒体的 `width`、`height`、`transform` 与 `opacity` 控制当前页面。可以增加：

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `pageCount` | uint32 | Optional | 文档总页数，存在时必须大于 0 |
| `pageIndex` | uint32 | Optional | 当前页面的 0 起始索引，缺失时为 `0` |

能解析 PDF 资源时，实际页数具有最高优先级；与 `pageCount` 不一致时采用实际页数并警告。非法 `pageCount` 应被忽略，越界 `pageIndex` 应钳制到实际有效范围。

资源缺失时，读取器可以使用 `pageCount/pageIndex` 显示页数占位信息；缺少 `pageCount` 时仍应保留 Media 的布局占位，不得影响基础墨迹。

## 音视频播放

音频和视频可以包含：

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `autoplay` | bool | `false` | 加载 Canvas 时自动播放 |
| `loop` | bool | `false` | 循环播放 |
| `volume` | float32 | `1` | 音量，范围 `0`–`1` |
| `startTime` | float64 | `0` | 媒体内部起播偏移，单位秒 |
| `playbackRate` | float32 | `1` | 播放速度，必须为有限正数 |

`startTime` 小于 0 时钳制到 0，大于媒体时长时钳制到媒体末尾。非法 `playbackRate` 回退到 1。

## 示例

::: tabs

@tab 图片

```jsonc
{
  "type": 4,
  "contentId": 2,
  "undoId": 1,
  "path": "images/diagram.png",
  "mimeType": "image/png",
  "width": 800.0,
  "height": 450.0,
  "transform": [1.0, 0.0, 0.0, 1.0, 120.0, 80.0],
  "opacity": 0.9
}
```

@tab 音频

```jsonc
{
  "type": 4,
  "contentId": 3,
  "undoId": 2,
  "path": "audio/explanation.mp3",
  "mimeType": "audio/mpeg",
  "autoplay": false,
  "loop": false,
  "volume": 0.8,
  "startTime": 2.5,
  "playbackRate": 1.0
}
```

@tab PDF 单页视口

```jsonc
{
  "type": 4,
  "contentId": 4,
  "undoId": 3,
  "path": "documents/lesson.pdf",
  "mimeType": "application/pdf",
  "width": 1280.0,
  "height": 720.0,
  "transform": [1.0, 0.0, 0.0, 1.0, 80.0, 60.0],
  "opacity": 1.0,
  "pageCount": 24,
  "pageIndex": 5
}
```

:::

## 容错与扩展

有限但越界的 opacity 和 volume 应钳制到 `0`–`1`。缺少 path、MIME 或必要视觉尺寸的 Media 应跳过并报告警告，不得影响同一 Canvas 的后续内容。

写入器必须把私有块级字段放入 `extra`；读取器仍应容错忽略未知顶层键。
