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

读取器不认识 `space`，或扩展分量缺失、长度错误、包含 NaN/Infinity 时，必须使用 `fallback`。写入器应确保 fallback 不超过 `0xFFFFFF`；容错读取时可以只取低 24 位。

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
