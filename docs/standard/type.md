---
title: 块类型（Type ID）
---

Type ID 用于识别墨迹主文件中的顶层 MessagePack 对象。

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

- 写入器必须使用字段表声明的精确类型和位宽。例如 `uint16` 不得写成正整数 fixint，`float32` 不得写成 float64。
- Header 使用额外的固定布局要求，参见 [Header 块](blocks/header)。
- 读取器可以接受能够无损转换到目标类型、且通过目标字段范围校验的其他 MessagePack 数值编码；重新保存时必须规范化为声明类型。
- bool、string、Array 和 Map 不允许用其他类型代替。Map 中重复出现已知键时，当前完整块无效；未知键仍按各块的扩展规则忽略。

::: warning `type` 与 `inkType`
Ink 顶层 `type` 固定为 `3`；块内 `inkType` 才表示擦除、普通笔、荧光笔或高级荧光笔。不存在独立 Eraser 顶层块，也不存在 `penType` 二级字段。
:::

各字段声明的 `128+` 私有编号没有全局厂商命名空间，也不配套 `vendorId`；只有预先约定相同编号语义的实现之间能够互操作。

## 未知对象与保存

读取器遇到未知 Type ID 时，应跳过当前完整 MessagePack 对象并尽量继续读取后续块，不得仅因一个未知块拒绝整个文件。

UInk 不要求写入器原样保留未知对象。软件自己创建且确认所有对象都能理解的文件可以直接覆盖；外部导入或包含未知内容的文件默认应另存为新文件，只有用户明确确认可能丢失未知内容后才可以覆盖原文件。具体流程参见[实现一致性与样例](conformance)。
