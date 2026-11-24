---
title: Media 块
---

- Type ID：`4`
- 类型：Map

**Media 把一个外部资源放到页面上**：图片、SVG、PDF 的某一页、音频或视频。主文件只保存资源的路径、位置、大小与播放参数，资源本身放在[资源包](../file/extra) `filename.uink.extra` 中。

::: tip 等级
- **标准级**：图片（PNG、JPEG、SVG）及其 `width`、`height`、`transform`、`opacity`、`fit`、`crop`。
- **完整级**：PDF 页、音频、视频及播放参数。
- 核心级与基础级读取器跳过 Media。
:::

## 字段

### 公共字段

| 字段 | 类型 | 要求 | 等级 | 说明 |
| --- | --- | --- | --- | --- |
| `type` | uint16 | Required | 标准 | 固定为 `4` |
| `contentId` | uint32 | Required | 标准 | 与 Ink、Shape、Clear 共用的内容序号（INK-2） |
| `undoId` | uint32 | Required | 标准 | 撤回组编号（INK-3） |
| `path` | string | Required | 标准 | 资源在资源包中的路径（EXTRA-3、EXTRA-4） |
| `mimeType` | string | Required | 标准 | 资源的 MIME 类型，例如 `image/png` |
| `extra` | Map | Optional | — | 软件私有字段 |

### 视觉媒体

图片、SVG、PDF 页、视频增加：

| 字段 | 类型 | 要求 | 等级 | 说明 |
| --- | --- | --- | --- | --- |
| `width` | float32 | Required | 标准 | 变换前的框宽度，大于 `0` |
| `height` | float32 | Required | 标准 | 变换前的框高度，大于 `0` |
| `transform` | `Array<float32>(6)` | Optional | 标准 | 仿射矩阵，缺省为单位矩阵 |
| `opacity` | float32 | Optional | 标准 | `0`–`1`，缺省为 `1` |
| `fit` | int32 | Optional | 标准 | 资源如何放进框里，缺省为 `0` Fill |
| `crop` | Map | Optional | 标准 | 只显示资源的一部分，见下文 |

### `fit`

| 值 | 名称 | 效果 |
| --- | --- | --- |
| `0` | Fill | 拉伸铺满框，不保持比例 |
| `1` | Contain | 保持比例完整放进框内，居中，空白处透明 |
| `2` | Cover | 保持比例铺满框，居中，超出部分裁掉 |
| `3` | None | 按资源原始像素大小（1 资源像素 = 1 Canvas 单位）放在框的左上角，超出部分裁掉 |
| `4`–`127` | 保留 | — |
| `128`+ | 私有 | — |

<!-- visual: media-fit（交互）— 同一张横图放进竖框，切换 Fill / Contain / Cover / None，并叠加 crop 矩形 -->
<UInkMediaFit />

### `crop`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `x` | float32 | Required | 裁剪区域左上角 X |
| `y` | float32 | Required | 裁剪区域左上角 Y |
| `width` | float32 | Required | 裁剪区域宽度，大于 `0` |
| `height` | float32 | Required | 裁剪区域高度，大于 `0` |

单位是资源自身的坐标：位图为像素，SVG 为 `viewBox` 单位，PDF 页为点（1/72 英寸）。

### PDF 页（完整级）

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `pageCount` | uint32 | Optional | 文档总页数，大于 `0` |
| `pageIndex` | uint32 | Optional | 当前显示的页，从 `0` 开始，缺省为 `0` |

### 音频与视频（完整级）

| 字段 | 类型 | 缺省 | 说明 |
| --- | --- | --- | --- |
| `autoplay` | bool | `false` | 打开页面时自动播放 |
| `loop` | bool | `false` | 循环播放 |
| `volume` | float32 | `1` | 音量，`0`–`1` |
| `startTime` | float64 | `0` | 起播位置，单位秒 |
| `playbackRate` | float32 | `1` | 播放速度，有限正数 |

## 规则

### 几何

- **MEDIA-1** 视觉媒体的框是左上角 `(0, 0)`、右下角 `(width, height)` 的矩形，单位为 Canvas 单位；先按 `crop` 取出资源的一部分，再按 `fit` 放进框里，最后应用 `transform`，并随页面 `viewport` 映射（CANVAS-17）。
- **MEDIA-2** `transform` 按 `[a, b, c, d, e, f]` 保存：

  ```text
  x' = a × x + c × y + e
  y' = b × x + d × y + f
  ```

  矩阵负责缩放、旋转、错切与平移。缺失、长度不是 6 或含有非有限数时，使用单位矩阵并报告警告。
- **MEDIA-3** `crop` 超出资源范围时，取与资源范围的交集；交集为空或字段无效时忽略 `crop`。不认识的 `fit` 按 Fill 处理。

### 内容顺序

- **MEDIA-4** Media 与 Ink、Shape、Clear 共用 `contentId` 与 `undoId`，按对象流顺序绘制（FILE-14）。
- **MEDIA-5** Erase Ink 不作用于 Media（INK-11）；Clear 会清掉之前的 Media。

### 资源

- **MEDIA-6** 资源包、条目或资源不可用时，保留 Media 的位置与顺序，提示资源缺失；不得影响笔迹、图形与其他 Media（EXTRA-11）。
- **MEDIA-7** SVG 按静态图像处理（EXTRA-9）。
- **MEDIA-8** UInk 注册 `application/pdf` 为标准文档类型。Word、PowerPoint 等其他文档可以作为私有类型使用，不保证跨软件互通。

### PDF 与播放

- **MEDIA-9** 能解析 PDF 时以实际页数为准；与 `pageCount` 不符时采用实际页数并报告警告。越界的 `pageIndex` 钳制到有效范围。资源缺失时，可以用 `pageCount` 与 `pageIndex` 显示页码占位。
- **MEDIA-10** `startTime` 小于 `0` 时取 `0`，超过时长时取末尾；无效的 `playbackRate` 取 `1`。
- **MEDIA-11** 自动播放可能受平台权限、静音策略或用户设置限制；无法自动播放不是错误。

### 容错

- **MEDIA-12** 有限但越界的 `opacity`、`volume` 钳制到 `0`–`1`。
- **MEDIA-13** 缺少 `path`、`mimeType`，或视觉媒体缺少 `width` / `height` 的 Media，跳过并报告警告，不影响后续内容。

### 保存

- **MEDIA-14** 存在 Media 时，完整保存按[资源包的提交顺序](../file/extra#提交顺序)进行。

## 示例

::: tabs

@tab 图片（标准级）

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
  "opacity": 0.9,
  "fit": 1,                                         // Contain
  "crop": { "x": 0.0, "y": 40.0, "width": 1600.0, "height": 900.0 }
}
```

@tab PDF 页（完整级）

```jsonc
{
  "type": 4,
  "contentId": 3,
  "undoId": 2,
  "path": "documents/lesson.pdf",
  "mimeType": "application/pdf",
  "width": 1280.0,
  "height": 720.0,
  "transform": [1.0, 0.0, 0.0, 1.0, 80.0, 60.0],
  "pageCount": 24,
  "pageIndex": 5
}
```

@tab 音频（完整级）

```jsonc
{
  "type": 4,
  "contentId": 4,
  "undoId": 3,
  "path": "audio/explanation.mp3",
  "mimeType": "audio/mpeg",
  "volume": 0.8,
  "startTime": 2.5
}
```

:::

## 回退

| 读取器缺少的能力 | 显示方式 |
| --- | --- |
| Media（核心级、基础级） | 跳过 |
| PDF、音频、视频（标准级） | 保留布局占位，提示不支持 |

导出到核心级、基础级时可以删除 Media；PDF 可以把当前页栅格化为 PNG，见[兼容导出](../compatibility#兼容导出)。

## 相关

- [资源包](../file/extra)
- [Canvas 块](canvas)
- [兼容与回退](../compatibility)
