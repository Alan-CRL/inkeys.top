---
title: 版本与变更
---

`Header.version` 告诉读取器文件遵循哪一版规范。本页说明版本号怎么读、读取器遇到不同版本时怎么做，并列出 1.0 到 1.1 的全部变化。

::: tip 当前版本
UInk 1.1 Beta，`Header.version = 11`。Inkeys 与 ICC-CE 完成适配、公开样例互通验证后冻结为正式版。
:::

## 版本号

| `version` | 名称 | 状态 |
| --- | --- | --- |
| `10` | UInk 1.0 Beta | 已被 1.1 取代，提供[单文件存档](/standard/uink-v10/spec.md) |
| `11` | UInk 1.1 Beta | 当前版本 |

## 规则

- **VER-1** 版本号 = 主版本 × 10 + 次版本。`10` 是 1.0，`11` 是 1.1，`20` 将是 2.0。
- **VER-2** 1.1 写入器必须写入 `version = 11`，即使文件只用到了 1.0 已有的能力。
- **VER-3** 读取器先验证首块：必须是 `array(7)` 的 Header，`type = 0`，`version` 在 `10`–`19` 之间。任一条件不满足时，读取器必须拒绝按 UInk 1.x 解析该文件。
- **VER-4** 读取器遇到同一主版本、但次版本更高的文件时，必须尽力读取：跳过不认识的块与键，按已知规则显示其余内容，并可以提示用户“文件来自更新的版本，部分内容可能无法显示”。
- **VER-5** 1.1 读取器不保证完全兼容 `version = 10` 的文件，遇到时应尽力读取：按 1.1 的规则解析，跳过不认识或不符合 1.1 的内容，显示其余内容，并可以提示用户“文件来自 UInk 1.0，部分内容可能无法正确显示”。1.0 文件中的坐标同样按 Device 像素理解，不做换算。
- **VER-6** UInk 不注册 magic 标识。`.uink` 扩展名只用于识别文件，不代替 VER-3 的检查。
- **VER-7** 完整保存同一个逻辑文件时，不得改变 `Header.guid`、已有 Workspace / Device 的 GUID 与已有页面的 `pageGuid`；“另存为”新的逻辑文件时必须生成新的 `Header.guid`。
- **VER-8** Beta 期间规范仍可修正。冻结为正式版后，任何不兼容修改都必须使用新的 `version`。

## 1.0 勘误

1.0 Beta 原文要求“`version` 必须等于 `10`，否则拒绝读取”。现改为 VER-3 与 VER-4：1.0 读取器遇到 `version = 11` 时应尽力读取。

按勘误更新后，1.0 读取器打开 1.1 文件时会忽略新增的字段，按 1.0 规则显示其余内容。未整理的按页追加文件（同一页出现多次）在 1.0 读取器中可能显示不正确；把文件[整理](glossary#保存)为紧凑文件后即可正常显示。

## 1.0 → 1.1 变化

### 新增

| 内容 | 页面 |
| --- | --- |
| 功能分级：核心级、基础级、标准级、完整级与 Inkeys 附加级 | [分级与认证](levels) |
| 读取回退与兼容导出 | [兼容与回退](compatibility) |
| 按页追加：同一页的新版本追加到文件末尾，以最后出现的为准 | [保存、追加与恢复](incremental) |
| 页面元数据：`background`、`pageState`、`pageKind`、`binding` | [Canvas 块](blocks/canvas) |
| 笔尖描述 `nib` 与端帽 `cap`；Shape 描边的 `lineCap` / `lineJoin` | [笔尖与端帽](common/nib) |
| 图形对象层 `object`，以及完整级的图形预设注册表 | [Shape 块](blocks/shape)、[图形预设注册表](appendix/shape-presets) |
| Media 的 `fit` 与 `crop` | [Media 块](blocks/media) |
| 曲线与自由图形的写法：按顺序采样成 Polyline / Polygon，断开的部分分别写（SHAPE-24、SHAPE-25） | [Shape 块](blocks/shape#曲线与自由图形) |
| 规则编号、术语表、单文件规范与 `llms.txt` | [术语表](glossary) |

### 修改

| 内容 | 1.0 | 1.1 |
| --- | --- | --- |
| 版本检查 | 只接受 `10` | 接受 `10`–`19`，见 VER-3、VER-4 |
| 坐标单位 | 平台无关的逻辑像素 | Device 像素，不记录 DPI，缩放由 `viewport.scale` 表达 |
| 同一 Canvas 唯一键 | 文件内不得重复 | 可以重复，后出现的整体替代先前的 |
| 增量写入目标 | 只能追加到最后一个 Canvas | 也可以追加任意页面的完整新版本 |
| Clear | 所有读取器必须支持 | 属于 Inkeys 附加级；其他读取器按回退规则处理 |
| Erase Ink | 标准能力 | 属于 Inkeys 附加级；未实现该级的读取器必须跳过 |
| `renderOnlyWhenLatest` | 标准能力 | 属于完整级；低等级读取器忽略 |
| PPT 页码绑定 | 无官方字段 | Canvas `binding = 1`，`slideId` 可选 |

### 未变

Header 布局、Type ID、MessagePack 编码规则、撤回模型（`undoId` 分组，不保存重做）、资源包格式与安全规则、完整保存的提交顺序。

## 存档

- [UInk 1.0 Beta 单文件存档](/standard/uink-v10/spec.md)
- [UInk 1.0 公开样例](/standard/uink-v10/fixtures.json)
