---
title: Device 结构
---

- Type: Map
- Registry Entry

Device 是 [Header Extension](headerExtension) 的 `devices` 数组中的显示面注册项，不是顶级块，也不形成文件流作用域。Canvas 通过 `deviceGuid` 引用一个 Device，其显示视口始终填满该显示面。Device 与 Canvas 坐标统一使用平台无关的逻辑像素。

Device 只描述显示面在系统或父 Device 中的位置与大小，不保存页面正在查看的 Canvas 世界坐标。Canvas 的平移和缩放状态由 [Canvas.viewport](canvas#viewport-map) 保存；Device 的 `x/y` 不得作为 viewport 的默认值或替代值。

## 公共字段

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `guid` | string(36) | Required | Device 的永久 UUID |
| `deviceType` | int32 | Required | Device 类型 |
| `name` | string | Optional | 显示名称 |
| `hardware` | Map | Optional | 物理显示器匹配信息 |
| `extra` | Map | Optional | 私有扩展 |

| 值 | 名称 | 说明 |
| --- | --- | --- |
| `0` | Display | 系统虚拟桌面中的物理显示区域 |
| `1` | Window | 相对父 Device 的窗口或板中板区域 |
| `2`–`127` | Reserved | UInk 后续版本保留 |
| `128` 及以上 | Private | 软件私有显示面 |

`128+` 私有编号没有全局厂商命名空间，只保证预先约定的实现之间互操作。未知 `deviceType` 按仅用于本次加载的根显示面处理并警告，不得把容错结果回写文件。

## Display Device

Display 增加以下必填字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `x` | int32 | 系统虚拟桌面的逻辑 X 原点，可为负数 |
| `y` | int32 | 系统虚拟桌面的逻辑 Y 原点，可为负数 |
| `width` | uint32 | 显示区域逻辑宽度，必须大于 0 |
| `height` | uint32 | 显示区域逻辑高度，必须大于 0 |

### Hardware Map

`hardware` 的所有字段均为可选匹配信息：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `name` | string | 硬件报告的显示名称 |
| `id` | string | 平台提供的硬件标识 |
| `identifiers` | `Map<string, string>` | 其他硬件标识；键和值都必须是 string |
| `physicalWidth` | uint32 | 原生物理像素宽度，存在时必须大于 0 |
| `physicalHeight` | uint32 | 原生物理像素高度，存在时必须大于 0 |
| `scaleFactor` | float32 | 物理像素 / 逻辑像素，存在时必须为有限正数 |

物理像素、DPI 或缩放因子不参与 Canvas 线格式坐标计算，也不得覆盖 Display 保存的逻辑几何。硬件标识无法匹配时，读取器仍应使用保存的逻辑几何或当前渲染目标继续加载。

## Window Device

Window 增加以下必填字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `parentDeviceGuid` | string(36) | 父 Display 或 Window 的 UUID |
| `x` | float32 | 相对父 Device 的逻辑 X |
| `y` | float32 | 相对父 Device 的逻辑 Y |
| `width` | float32 | 窗口逻辑宽度，必须大于 0 |
| `height` | float32 | 窗口逻辑高度，必须大于 0 |
| `zIndex` | uint32 | 同一父 Device 下的合成顺序，越大越靠前 |

Window 可以嵌套 Window。`zIndex` 越大越靠前；出现相同 `zIndex` 时按 `devices` 数组从前到后合成，后项位于前项之上。Window 可以部分越出父区域，宿主负责裁剪不可见部分。

Device 树禁止循环。父项缺失或产生循环时，读取器应断开问题父引用，把该 Window 作为临时根显示面加载并警告。

## 示例

```jsonc
[
  {
    "guid": "11111111-1111-4111-8111-111111111111",
    "deviceType": 0,
    "name": "Primary Display",
    "x": 0, "y": 0, "width": 3840, "height": 2160,
    "hardware": {
      "id": "DISPLAY\\ACR1234",
      "identifiers": { "serial": "12345678" }
    }
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

## 相关说明

- [Canvas 块与 viewport](canvas)
- [墨迹主文件](../file/main)
