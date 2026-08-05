---
title: Color Map
---

Color Map 同时提供基础 SDR 回退色和可选 HDR 色彩空间数据。Ink、Shape 的填充和 Shape 的描边都使用同一结构。

## 字段

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `fallback` | uint32 | Required | `0xRRGGBB` sRGB 回退色 |
| `space` | string | Conditional | 与 `components` 成对出现 |
| `components` | `Array<float32>(3)` | Conditional | 颜色空间中的三个分量 |

注册的 `space`：

- `srgb`：三个分量范围为 `0`–`1`；
- `scrgb`：三个分量使用线性 float32，可使用大于 `1` 的 HDR 值，只要求为有限数。

读取器按以下顺序选择颜色：

1. `space` 和 `components` 都缺失时，使用 `fallback`。
2. 两个扩展字段只出现一个时，扩展颜色无效，使用 `fallback`。
3. `space` 未知、`components` 长度不是 3、任一分量包含 NaN/Infinity，或者 `srgb` 分量超出 `0`–`1` 时，使用 `fallback`。
4. `space` 和 `components` 均有效时，使用扩展颜色；`scrgb` 分量允许大于 `1`，但必须是有限数。

写入器必须确保 `fallback` 不超过 `0xFFFFFF`，并让它表达扩展颜色在 SDR 中的预期回退外观。容错读取到更大的 uint32 时，可以只取低 24 位。`fallback` 缺失或类型无效时，包含该 Color Map 的必填颜色或样式无效；读取器按所属 Ink/Shape 的容错规则处理。

`srgb` 使用标准 sRGB 传递函数，`scrgb` 使用线性分量。显示到具体 HDR/SDR 设备时的色域映射和 tone mapping 由软件决定。Color Map 同时携带扩展颜色和 SDR 回退意图，但不承诺不同显示设备获得像素级一致的结果。

```jsonc
{
  "fallback": 16763904,
  "space": "scrgb",
  "components": [1.8, 0.65, 0.1]
}
```

## 相关说明

- [Ink 块](../blocks/ink)
- [Shape 块](../blocks/shape)
