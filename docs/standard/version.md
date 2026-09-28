---
title: 规范版本
---

本页定义 `Header.version` 使用的规范版本号。

| 规范版本号 | 说明 | 状态 |
| --- | --- | --- |
| `10` | UInk 1.0 Beta | Beta，规范持续完善中 |

::: tip version 10 Beta 演进边界
version `10` 当前仍处于 Beta 草案阶段，规范可以继续补充新的标准块、字段和语义。本文档始终定义最新的 version `10` 基线；较早的同版本草案不承诺向前或向后兼容。

实现只有在支持本文档当前注册的全部必需结构与呈现语义时，才能声明兼容 version `10`。规范正式冻结时应在本页明确记录冻结日期和兼容边界。
:::

当前 Beta 使用 Header `array(7)`、Header Extension 注册表以及 Type ID `0`–`6`，其中 Type ID `5` 为 Shape、Type ID `6` 为 Clear。此前 Header `array(6)`、顶级 Device、Type ID `5` 为 Media，或不认识 Clear 语义的 version `10` 文件与实现均视为较早草案，不属于当前兼容基线。

UInk 不注册额外的 magic 标识。`.uink` 扩展名只用于文件识别；读取器还必须同时验证首对象是 Header、Header 数组长度为 `7`、Type ID 为 `0` 且 `version = 10`。任一条件不满足时，读取器必须拒绝按当前规范解析该文件。

同一逻辑 UInk 文件执行完整保存时，不得改变 `Header.guid`、既有 Workspace/Device GUID 或既有页面 `pageGuid`。“另存为”新的逻辑文件时，必须生成新的 `Header.guid`。

version `10` 尚未冻结。Beta 期间的草案调整不提供迁移保证；正式冻结后再发布的不兼容修改必须使用新的 `Header.version`。
