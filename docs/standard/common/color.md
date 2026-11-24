---
title: Color Map
---

**Color Map 是 UInk 统一的颜色结构**：一个必填的 sRGB 颜色 `fallback`，加上可选的 HDR 颜色。Ink 的颜色、Shape 的描边与填充、页面背景都使用它。

::: tip 等级
- **核心级**：`fallback`。
- **完整级**：`space` + `components`（HDR 与精确色彩）。
:::

## 字段

| 字段 | 类型 | 要求 | 等级 | 说明 |
| --- | --- | --- | --- | --- |
| `fallback` | uint32 | Required | 核心 | `0xRRGGBB` 格式的 sRGB 颜色 |
| `space` | string | Conditional | 完整 | 色彩空间，与 `components` 成对出现 |
| `components` | `Array<float32>(3)` | Conditional | 完整 | 该色彩空间中的三个分量 |

已注册的 `space`：

| 值 | 分量 |
| --- | --- |
| `srgb` | 使用 sRGB 传递函数，三个分量都在 `0`–`1` 之间 |
| `scrgb` | 线性分量，可以大于 `1` 表示 HDR 高亮，必须是有限数 |

<!-- visual: color-fallback — 同一个 HDR 黄色在 HDR 屏幕上的显示与 SDR 回退色并排 -->
<UInkColorFallback />

## 规则

- **COLOR-1** 写入器必须保证 `fallback` 不超过 `0xFFFFFF`，并让它代表扩展颜色在 SDR 屏幕上应有的样子。
- **COLOR-2** 读取器按以下顺序选择颜色：
  1. `space` 与 `components` 都缺失：使用 `fallback`。
  2. 只出现其中一个：扩展颜色无效，使用 `fallback`。
  3. `space` 不认识、`components` 长度不是 3、任一分量不是有限数、或 `srgb` 分量超出 `0`–`1`：使用 `fallback`。
  4. 否则使用扩展颜色。
- **COLOR-3** 容错读到超过 `0xFFFFFF` 的 `fallback` 时，可以只取低 24 位。`fallback` 缺失或类型错误时，所在的颜色或样式无效，按所属块的容错规则处理。
- **COLOR-4** 色域映射与 HDR / SDR 色调映射由软件决定；UInk 不保证不同屏幕上的颜色逐像素一致。

## 示例

```jsonc
{
  "fallback": 16763904,                // 0xFFCC00
  "space": "scrgb",
  "components": [1.8, 0.65, 0.1]
}
```

## 回退

| 读取器缺少的能力 | 显示方式 |
| --- | --- |
| HDR（完整级以下） | 使用 `fallback` |

## 相关

- [Ink 块](../blocks/ink)
- [Shape 块](../blocks/shape)
- [Canvas 块](../blocks/canvas)
