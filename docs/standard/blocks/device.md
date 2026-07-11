---
title: Device 块
---

- Type ID: 2
- Type: Map
- Required

Device 表示一个显示器及其绝对坐标区域。一个 UInk 文件可以包含多个 Device，以支持多显示器批注；每个 Device 作用于其后的 Canvas，直到下一个 Device 或文件末尾。

## 字段

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `type` | uint16 | Required | 固定为 `2` |
| `guid` | string(36) | Required | Device 的 UUID |
| `deviceType` | int32 | Required | 全屏或窗口坐标模式 |
| `x` | int32 | Required | 显示区域在系统绝对坐标中的 X 原点，单位 px |
| `y` | int32 | Required | 显示区域在系统绝对坐标中的 Y 原点，单位 px |
| `width` | uint32 | Required | 显示区域宽度，必须大于 0，单位 px |
| `height` | uint32 | Required | 显示区域高度，必须大于 0，单位 px |
| `hardware` | Map | Optional | 显示器硬件匹配信息 |
| `extra` | Map | Optional | 私有扩展 |

`x`、`y` 允许为负数，以覆盖显示器位于主显示器左侧或上方的虚拟桌面布局。

## `deviceType`

| 值 | 名称 | Canvas 几何规则 |
| --- | --- | --- |
| `0` | Fullscreen | Canvas 继承 Device 的原点与宽高 |
| `1` | Window | Canvas 额外保存相对 Device 原点的位置和尺寸 |
| `2`–`127` | Reserved | UInk 后续版本保留 |
| `128` 及以上 | Private | 软件私有模式 |

读取器遇到未知 `deviceType` 时必须按 Fullscreen 回退。

Window Canvas 可以部分超出 Device 区域。读取器应保存真实位置，并由宿主裁剪不可见部分。

## `hardware`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `name` | string | Optional | 显示器名称 |
| `id` | string | Optional | 实现首选的硬件标识 |
| `identifiers` | `Map<string, string>` | Optional | EDID、序列号、系统设备路径等候选标识 |

硬件标识仅用于尽量恢复原显示器。无法匹配时，读取器仍应使用 Device 保存的绝对几何或当前运行环境的显示区域继续加载。

## 示例

```jsonc
{
  "type": 2,
  "guid": "7c9ad880-6798-4a43-8b2d-5ddb0d27b206",
  "deviceType": 0,
  "x": 0,
  "y": 0,
  "width": 3840,
  "height": 2160,
  "hardware": {
    "name": "Primary Display",
    "id": "DISPLAY\\ACR1234",
    "identifiers": {
      "manufacturer": "ACR",
      "serial": "12345678"
    }
  },
  "extra": {}
}
```

## 容错

Device 缺少必填定位信息时，读取器可以构造仅用于本次加载的临时 Device：采用 Fullscreen、当前渲染目标的原点和尺寸，并生成临时 UUID。容错值不得回写源文件。
