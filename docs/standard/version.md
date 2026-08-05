---
title: 规范版本
---

本页定义 `Header.version` 使用的规范版本号。

| 规范版本号 | 说明 | 状态 |
| --- | --- | --- |
| `10` | UInk 1.0 Beta | Beta，线格式已冻结 |

::: tip version 10 Beta 冻结边界
当前文档定义 version `10` 的首个 Beta 兼容基线。Header 布局、已注册 Type ID、字段类型与既有字段语义、对象作用域、排序规则以及保存恢复契约不得再做不兼容修改。

不改变既有对象解释的文字澄清和可选扩展可以继续使用 version `10`。任何要求现有兼容读取器改变既有数据解释或无法按当前容错规则安全处理的修改，都必须使用新的 `Header.version`。
:::

当前 Beta 使用 Header `array(7)`、Header Extension 注册表以及 Type ID `0`–`5`，其中 Type ID `5` 为 Shape。此前 Header `array(6)`、顶级 Device 或 Type ID `5` 为 Media 的文件均视为已废弃的预 Beta 草案。

UInk 不注册额外的 magic 标识。`.uink` 扩展名只用于文件识别；读取器还必须同时验证首对象是 Header、Header 数组长度为 `7`、Type ID 为 `0` 且 `version = 10`。任一条件不满足时，读取器必须拒绝按当前规范解析该文件。

同一逻辑 UInk 文件执行完整保存时，不得改变 `Header.guid`、既有 Workspace/Device GUID 或既有页面 `pageGuid`。“另存为”新的逻辑文件时，必须生成新的 `Header.guid`。

version `10` 已随 UInk 1.0 Beta 正式冻结。冻结前的草案调整不提供迁移保证；今后的不兼容修改必须使用新的 `Header.version`。
