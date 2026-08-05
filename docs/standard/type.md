---
title: 块类型（Type ID）
---

Type ID 用于识别墨迹主文件中的顶层 MessagePack 对象。本文将一个顶层 MessagePack 对象简称为“块”，将这些对象在文件中的先后顺序称为“对象流顺序”。

| Type ID（uint16） | 块 | MessagePack 类型 |
| --- | --- | --- |
| `0` | [Header 块](blocks/header) | Array |
| `1` | [Header Extension 块](blocks/headerExtension) | Map |
| `2` | [Canvas 块](blocks/canvas) | Map |
| `3` | [Ink 块](blocks/ink) | Map |
| `4` | [Media 块](blocks/media) | Map |
| `5` | [Shape 块](blocks/shape) | Map |

[Device](blocks/device) 是 Header Extension 注册表中的嵌套 Map，不具有 Type ID，也不出现在顶级对象流中。

## MessagePack 编码

写入器必须遵守以下规则：

1. 使用字段表声明的精确 MessagePack 类型和位宽。例如，`uint16` 不得写成正整数 fixint，`float32` 不得写成 float64。
2. 对 Header 额外遵守固定数组布局，参见 [Header 块](blocks/header)。
3. 重新保存读取时容错接受的数值时，将其规范化为字段表声明的类型。

读取器可以容错接受其他 MessagePack 数值编码，但必须依次满足以下条件：

1. 源值是数值，且目标字段也是数值；`bool` 不属于数值编码。
2. 转换不会改变数值。整数目标要求源值是数学意义上的整数；浮点目标要求源值能由目标浮点类型精确表示。
3. 转换后的值通过目标类型范围和字段自身的有效性校验。

`bool`、`string`、Array 和 Map 不允许用其他类型代替。Map 中重复出现任一已知键时，包含该 Map 的当前块无效；未知键仍按各块的扩展规则忽略。

::: warning `type` 与 `inkType`
Ink 顶层 `type` 固定为 `3`；块内 `inkType` 才表示擦除、普通笔、荧光笔或高级荧光笔。不存在独立 Eraser 顶层块，也不存在 `penType` 二级字段。
:::

各字段声明的 `128+` 私有编号没有全局厂商命名空间，也不配套 `vendorId`；只有预先约定相同编号语义的实现之间能够互操作。

## 未知对象与保存

读取器遇到未知 Type ID 时，如果当前 MessagePack 对象能够完整解码，必须跳过该对象并继续读取下一块，不得仅因一个未知块拒绝整个文件。如果无法确定未知对象的结束边界，则按[损坏恢复规则](incremental#崩溃恢复)停止读取余下字节。

UInk 不要求写入器原样保留未知对象。软件自己创建且确认所有对象都能理解的文件可以直接覆盖；外部导入或包含未知内容的文件默认应另存为新文件，只有用户明确确认可能丢失未知内容后才可以覆盖原文件。具体流程参见[实现一致性与样例](conformance)。
