---
title: 笔尖与端帽
---

**笔尖描述 `nib` 说明一条 Ink 用什么形状的笔尖写成，端帽说明笔迹两端的形状。** 同一套字段还用于 Shape 描边的 `lineCap` 与 `lineJoin`。没有这些字段时，笔迹按圆形笔尖、圆头绘制，这也是核心级读取器的画法。

::: tip 等级
- **基础级**：`nib`、Ink 的 `cap`、Shape 描边的 `lineCap` 与 `lineJoin`。
- **Inkeys 附加级**：Erase Ink 上的 `nib`（矩形、方形橡皮）。
- 核心级读取器忽略这些字段，按圆形笔尖、圆头绘制。
:::

## Nib Map

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `shape` | int32 | Optional | `0` Circle（缺省）、`1` Rectangle；`2`–`127` 保留，`128`+ 私有 |
| `aspect` | float32 | Conditional | 矩形笔尖的宽 ÷ 高，必须大于 `0`；`shape = 1` 时必填 |
| `orientation` | int32 | Optional | `0` Fixed（缺省）、`1` FollowDirection |

<!-- visual: nib-shapes — 圆形笔尖、1:8 竖直矩形（荧光笔）、2:3 矩形与 1:1 方形（橡皮）沿同一路径扫过的形状 -->
<UInkNibShapes />

### 笔尖尺寸

设某点的 `width` 为 `w`，矩形笔尖的宽为 `W`、高为 `H`，`a = aspect`。

- 圆形笔尖：直径 = `w`。
- 矩形笔尖：`H = w`，`W = a × H`。例如 `w = 24` 时，1:8 荧光笔是 3 × 24，2:3 矩形橡皮是 16 × 24，1:1 方形橡皮是 24 × 24。

<!-- visual: nib-size — 圆形、1:8、2:3、1:1 四种笔尖在 width = 24 时的宽高标注 -->
<UInkNibSize />

### 方向

- `Fixed`：矩形与 Canvas 坐标轴对齐，高沿 Canvas Y 方向，不随书写方向转动。
- `FollowDirection`：矩形的宽沿该点的书写方向，高与书写方向垂直。

## 端帽

`cap`（Ink）与 `lineCap`（Shape 描边）使用同一个枚举：

| 值 | 名称 | 笔迹两端的形状 |
| --- | --- | --- |
| `0` | Round | 端点处加一个直径等于该处宽度的半圆 |
| `1` | Square | 端点沿书写方向向外延伸半个宽度，形成方头 |
| `2` | Butt | 在端点处截止，不延伸；矩形笔尖扫掠时，两端就是笔尖矩形自身的边 |
| `3`–`127` | 保留 | — |
| `128`+ | 私有 | — |

`lineJoin`（只用于 Shape 描边）：

| 值 | 名称 | 折线拐角 |
| --- | --- | --- |
| `0` | Round | 圆角 |
| `1` | Miter | 尖角；过长时的截断方式由软件决定 |
| `2` | Bevel | 斜切角 |

<!-- visual: caps-joins — Round / Square / Butt 端帽与 Round / Miter / Bevel 拐角并排对比 -->
<UInkCapsJoins />

## 规则

- **NIB-1** 没有 `nib` 时，笔尖为圆形，`width` 是直径。
- **NIB-2** 笔迹是笔尖沿点序列扫过的区域。点与点之间如何插值由软件决定（INK-7），但笔尖形状、大小与方向必须符合本页定义。
- **NIB-3** Ink 缺少 `cap` 时，圆形笔尖按 Round、矩形笔尖按 Butt 绘制。
- **NIB-4** Shape 描边缺少 `lineCap` 时按 Round，缺少 `lineJoin` 时按 Round。
- **NIB-5** 长度为 `0` 的虚线段（`dashArray` 中的 `0`）在 Round 端帽下画成圆点，在 Square 端帽下画成方点，在 Butt 端帽下不可见。写入器表达点线时必须使用 Round 或 Square 端帽。
- **NIB-6** `shape = 1` 而 `aspect` 缺失或无效（非正数、NaN、Infinity）时，读取器按圆形笔尖绘制并报告警告。
- **NIB-7** 不认识的 `shape`、`orientation`、`cap`、`lineCap`、`lineJoin` 取值，读取器按各自的缺省值处理。

## Inkeys 的取值

| 笔 | `shape` | `aspect` | `orientation` | 端帽 |
| --- | --- | --- | --- | --- |
| 普通笔 | Circle | — | — | Round |
| 荧光笔 | Rectangle | `0.125`（1:8） | Fixed | Butt |
| 圆形橡皮 | Circle | — | — | Round |
| 矩形橡皮 | Rectangle | `0.6666667`（2:3） | Fixed | Butt |
| 方形橡皮 | Rectangle | `1` | Fixed | Butt |

Inkeys 软件内部用“与同尺寸圆形橡皮面积相等”的习惯决定矩形、方形橡皮的大小。写入文件时，Inkeys 把软件内部的橡皮尺寸 `s` 换算成笔尖高度 `H = (s / 2) × √(π / a)`，写进点的 `width`；文件中只保存直观的宽高，读取器不需要知道这个换算。

## 回退

| 读取器缺少的能力 | 显示方式 |
| --- | --- |
| `nib`（核心级） | 圆形笔尖，`width` 当作直径 |
| `cap`、`lineCap`、`lineJoin`（核心级） | 圆头、圆角 |

荧光笔按圆形笔尖回退时，`width` 原本表示笔尖高度，当作直径后笔迹粗细不变，只是两端与转角变圆。

## 相关

- [Ink 块](../blocks/ink)
- [Shape 块](../blocks/shape)
