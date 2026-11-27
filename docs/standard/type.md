---
title: 块类型与编码
---

主文件由一个接一个的 MessagePack 对象组成，每个顶层对象叫一个**块**。块的第一个字段 `type`（Header 中是数组第 0 项）就是 Type ID，读取器靠它判断块的种类。

## Type ID

| Type ID（uint16） | 块 | MessagePack 类型 | 读取器从哪一级开始需要支持 |
| --- | --- | --- | --- |
| `0` | [Header](blocks/header) | Array | 核心级 |
| `1` | [Header Extension](blocks/headerextension) | Map | 核心级 |
| `2` | [Canvas](blocks/canvas) | Map | 核心级 |
| `3` | [Ink](blocks/ink) | Map | 核心级 |
| `4` | [Media](blocks/media) | Map | 标准级 |
| `5` | [Shape](blocks/shape) | Map | 核心级 |
| `6` | [Clear](blocks/clear) | Map | Inkeys 附加级 |

[Device](blocks/device) 是 Header Extension 注册表里的嵌套 Map，没有 Type ID，也不会作为顶层块出现。

`7` 及以上的 Type ID 保留给后续版本，UInk 不定义私有 Type ID：软件私有数据写在各块的 `extra` 中（TYPE-4）。写入器不得写出未注册的 Type ID；读取器遇到时按 TYPE-9 跳过。

::: warning `type` 与 `inkType`
Ink 块的 `type` 固定为 `3`；笔的种类（擦除、普通笔、荧光笔……）由块内的 `inkType` 区分。不存在独立的 Eraser 块，也没有 `penType` 字段。
:::

## 写入规则

- **TYPE-1** 写入器必须使用字段表声明的精确 MessagePack 类型与位宽。例如 `uint16` 不得写成正整数 fixint，`float32` 不得写成 float64。
- **TYPE-2** Header 还要遵守固定数组布局，见 [Header 块](blocks/header)。
- **TYPE-3** 重新保存时，读取阶段容错接受的数值必须规范化为字段表声明的类型。
- **TYPE-4** 软件私有字段必须放进所在 Map 的 `extra`，不得作为未注册的顶层键写入。

## 读取规则

- **TYPE-5** 数值字段可以容错接受其他 MessagePack 数值编码，但必须同时满足：源值与目标都是数值（`bool` 不算数值）；转换不改变数值（整数目标要求源值是整数，浮点目标要求能被精确表示）；转换后的值通过字段自身的范围检查。
- **TYPE-6** `bool`、`string`、Array、Map 不允许用其他类型代替。
- **TYPE-7** 同一个 Map 中重复出现任一已知键时，包含该 Map 的整个块无效。
- **TYPE-8** 读取器必须忽略不认识的键，且不认识的键不得改变已知字段的含义。
- **TYPE-9** 遇到不认识的 Type ID 时，如果该对象能完整解码，读取器必须跳过它并继续读取下一块，不得因此拒绝整个文件。无法确定对象结束位置时，按[崩溃恢复规则](incremental#崩溃恢复)停止读取。后续版本的内容块可能占用 `contentId` 编号，因此读取器不得因为 `contentId` 不连续而拒绝文件，绘制顺序仍以对象流顺序为准。
- **TYPE-10** 遇到自己等级之外但已注册的块（例如标准级以下的读取器遇到 Media），读取器按该块页面的“回退”一节处理。

## 私有编号

各枚举字段的 `128` 及以上为私有编号，由软件自行定义。UInk 不提供全局厂商命名空间，也没有 `vendorId`；只有事先约定了相同含义的软件之间才能互通。读取器遇到不认识的私有编号时，按对应字段的回退规则处理。

## 保存含未知内容的文件

- **TYPE-11** UInk 不要求写入器原样保留不认识的块或键。
- **TYPE-12** 软件自己创建、且确认所有内容都能理解的文件，可以直接覆盖保存。外部导入、或含有读取器不认识或不支持内容的文件，默认应另存为新文件；只有用户明确确认可能丢失内容后，才可以覆盖原文件。
