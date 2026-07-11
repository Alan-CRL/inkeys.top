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

[Device](blocks/device) 是 Header Extension 注册表中的嵌套 Map，不具有 Type ID，也不出现在顶级对象流中。

::: warning `type` 与 `inkType`
Ink 顶层 `type` 固定为 `3`；块内 `inkType` 才表示擦除、普通笔、荧光笔或高级荧光笔。不存在独立 Eraser 顶层块，也不存在 `penType` 二级字段。
:::

读取器遇到未知 Type ID 时，应跳过当前完整 MessagePack 对象并尽量继续读取后续块，不得仅因一个未知块拒绝整个文件。
