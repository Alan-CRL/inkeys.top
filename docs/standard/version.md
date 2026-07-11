---
title: 规范版本
---

适用于 Header.version 的规范版本号。

| 规范版本号 | 说明 | 状态 |
| --- | --- | --- |
| `10` | UInk 规范 1.0 | 文档完善中 |

::: warning 完善中
UInk 1.0 的版本号保持 `10`，但字段仍在正式冻结前的完善阶段。实现者应关注后续文档调整，不应把当前内容视为已永久冻结的线格式。
:::

当前文档采用 Header `array(7)`、Header Extension 注册表以及 Type ID `0`–`4`。此前草案中 Header `array(6)`、顶级 Device 与 Type ID `0`–`5` 的 version 10 文件视为未发布草案，不属于本规范的兼容范围。

同一逻辑 UInk 文件完整重写时不得改变 Header.guid、既有 Workspace/Device GUID 或既有页面 pageGuid。只有规范线格式版本发生变化时才调整 Header.version。
