---
title: 规范版本
---

适用于 Header.version 的规范版本号。

| 规范版本号 | 说明 | 状态 |
| --- | --- | --- |
| `10` | UInk 规范 1.0 | 预 Beta 草案，线格式未冻结 |

::: warning version 10 不保证草案兼容
当前文档是 version `10` 的唯一权威定义。进入 Beta 前，version `10` 可以发生不兼容修改；此前草案文件不属于兼容范围，读取器不得仅凭相同版本号猜测旧布局。
:::

当前草案使用 Header `array(7)`、Header Extension 注册表以及 Type ID `0`–`5`，其中 Type ID `5` 为 Shape。此前 Header `array(6)`、顶级 Device 或 Type ID `5` 为 Media 的文件均视为已废弃草案。

UInk 不注册额外 magic。读取器通过 `.uink` 扩展名、首对象必须为 Header、Header 数组长度、Type ID `0` 和 version 的组合验证当前草案。任一条件不匹配时必须拒绝按当前规范解析。

同一逻辑 UInk 文件完整重写时不得改变 Header.guid、既有 Workspace/Device GUID 或既有页面 pageGuid。“另存为”新的逻辑文件时必须生成新的 Header.guid。

version `10` 正式冻结后，任何不兼容线格式修改都必须使用新的 Header.version；冻结前的草案调整不提供迁移保证。
