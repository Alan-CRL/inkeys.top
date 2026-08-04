# UInk Canvas 视口规范

## Goal

在 UInk version `10` 中保存自由画布相对于 Device 可见区域的平移与缩放状态，使文件重新打开时能够恢复用户最后看到的 Canvas 世界坐标范围，同时保持现有 Device、Workspace、页面和图层模型的职责清晰。

## Background

- Device 描述显示面在系统或父 Device 上的位置与大小，即“视口显示在哪里”。
- Canvas 当前声明其原点为 Device 左上角、区域等于完整 Device，没有字段描述“Device 正在查看 Canvas 世界坐标的哪一部分”。
- Ink、Shape 与 Media 已使用 Canvas 坐标；自由平移后内容可以处于负坐标或当前可见区域之外。
- 现有文件缺少视口状态时必须继续按原点 `(0, 0)`、比例 `1` 显示，Header.version 继续保持 `10`。

## Requirements

- Canvas 需要保存 Device 可见区域到 Canvas 世界坐标的平移与统一缩放关系，不改变已有内容坐标。
- 视口直接保存为 Canvas 的可选 `viewport` Map，不新增顶层块、Type ID 或独立注册表。
- 视口归属于 `(workspaceGuid, deviceGuid, pageGuid)`，同一页面在同一 Device 下的所有 `layerIndex` 必须共享完全相同的视口状态；不同 Device 的同一页面可以有不同视口。
- 视口状态至少表达 Canvas 中的可见原点和正数缩放比例；首版不要求旋转或非等比缩放。
- `viewport.x`、`viewport.y` 保存 Device 左上角所对应的 Canvas 世界坐标；Device 或窗口尺寸变化时保持该左上角锚点，并向右下改变可见范围。
- `viewport.scale` 定义为 Device 单位除以 Canvas 单位的统一 zoom 倍数，必须为正数；`1` 为一比一，`2` 为放大两倍，`0.5` 为缩小到一半。
- 坐标映射为 `deviceX = (canvasX - viewport.x) × viewport.scale`、`deviceY = (canvasY - viewport.y) × viewport.scale`。
- Device 继续只描述屏幕/窗口显示区域，不承载页面级平移与缩放状态。
- `viewport` 适用于所有 Workspace 类型。规范不限制软件是否允许用户在屏幕批注、白板或 PPT 中平移缩放；软件可以强制使用默认视口，但合法的非默认视口必须按统一公式解释。
- 视口缺失时回退为原点 `(0, 0)`、缩放比例 `1`，兼容现有 version `10` 文件。
- 修改既有页面的视口状态属于 Canvas 元数据修改，必须完整重写，不得通过在文件末尾重复 Canvas 进行补丁。
- viewport 不参与 Ink/Shape/Media 的 undoId 历史，不产生可撤回的视口操作块；文件只保存 Canvas 的最终视口。软件在撤回墨迹时是否同步调整视口由软件自行决定。
- 复制页面时，新页面继承源页面的最终 viewport；软件可以在复制后自行调整并保存新的最终值。
- 规范必须明确 Canvas 世界坐标、Device 局部坐标和缩放比例的映射公式、字段单位、有效范围及容错行为。

## Out of Scope

- 视口旋转、错切或 X/Y 非等比缩放。
- 修改 Ink、Shape 或 Media 已保存的 Canvas 坐标。
- 修改 Header.version。

## Acceptance Criteria

- [x] Device 与 Canvas 视口的职责边界清晰，无重复的屏幕位置字段。
- [x] 文件能够恢复 Canvas 的平移和统一缩放状态，旧文件维持现有显示结果。
- [x] 同一页面存在多个图层或 Device 时，视口的归属和一致性规则无歧义。
- [x] 增量写入、完整重写、页面复制和容错规则同步覆盖视口状态。
- [x] VuePress 文档构建和差异检查通过。
