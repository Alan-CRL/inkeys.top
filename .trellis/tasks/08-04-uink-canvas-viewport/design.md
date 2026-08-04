# UInk Canvas 视口设计

## 数据边界

Device 只保存显示面或窗口在系统/父 Device 中的位置和大小；Canvas 保存页面在该 Device 上的查看状态。viewport 不改变 Ink、Shape、Media 的 Canvas 世界坐标。

viewport 直接作为 Canvas Map 的可选字段，不新增 Type ID、顶层块或注册表。它对所有 Workspace 类型有效；软件可以在屏幕批注或 PPT 场景中禁止交互平移缩放，但不能改变合法 viewport 的线格式含义。

## Viewport Map

```jsonc
{
  "viewport": {
    "x": 0.0,
    "y": 0.0,
    "scale": 1.0
  }
}
```

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `x` | float32 | Required | Device 左上角对应的 Canvas 世界 X，可为负数 |
| `y` | float32 | Required | Device 左上角对应的 Canvas 世界 Y，可为负数 |
| `scale` | float32 | Required | Device 单位 / Canvas 单位，必须为有限正数 |

缺少 `viewport` 或单个字段时，读取器使用完整默认值 `{x: 0, y: 0, scale: 1}` 并警告。非法 x/y、非正或非有限 scale 时，读取器使用默认值，不回写容错结果。

## 坐标映射

Device 局部坐标原点为 Device 左上角，Canvas 世界坐标到 Device 局部坐标的映射为：

```text
deviceX = (canvasX - viewport.x) * viewport.scale
deviceY = (canvasY - viewport.y) * viewport.scale
```

反向映射为：

```text
canvasX = deviceX / viewport.scale + viewport.x
canvasY = deviceY / viewport.scale + viewport.y
```

视口可见 Canvas 宽度和高度分别由 `Device.width / scale` 与 `Device.height / scale` 推导；不在 Canvas 中重复保存 Device 宽高。首版不支持旋转、错切或非等比缩放。

## 归属与多图层一致性

viewport 的逻辑归属为 `(workspaceGuid, deviceGuid, pageGuid)`。同一页面在同一 Device 下的所有 `layerIndex` 必须保存完全相同的 viewport；同一页面在不同 Device 上可以有不同 viewport。

写入器应在同一页面的每个 Canvas 块中重复保存相同 viewport，避免物理块读取顺序影响视口。读取器以 `layerIndex` 最小且有效的 Canvas 为权威值；其他层缺失时继承权威值，值不一致时使用权威值并警告。没有有效值时使用默认 viewport。

## 保存、复制与撤回

- 新增 Canvas 时可以随 Canvas 一起增量追加 viewport。
- 修改既有页面 viewport 属于既有 Canvas 元数据修改，必须完整重写；不得在文件末尾重复旧 Canvas 作为补丁。
- viewport 不占用 `contentId`，不产生 `undoId`，不进入 Ink/Shape/Media 撤回历史。
- 软件撤回墨迹时可以自行保持、调整或重置 viewport，文件格式不规定这一交互行为。
- 复制页面时继承源页面 viewport；软件可以在复制完成后调整并保存新的最终 viewport。

## 兼容与容错

旧 Canvas 没有 viewport 时按 `(0, 0, 1)` 显示。读取器不得因为 viewport 缺失拒绝 Canvas，也不得把 Device 的系统 x/y 误当作 Canvas viewport x/y。容错产生的默认值和修复结果不得回写源文件。
