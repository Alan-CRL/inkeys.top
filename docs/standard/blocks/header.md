---
title: Header 块
---

- Type ID：`0`
- 类型：Array

**Header 是文件的第一个块**，记录文件身份、规范版本，以及最近一次完整保存时的统计快照。读取器靠它确认这是一个 UInk 文件。

::: tip 等级
核心级。所有读取器与写入器都必须支持。
:::

## 结构

Header 是固定长度的数组 `array(7)`：

| 索引 | 字段 | 类型 | MessagePack 编码 | 负载长度 |
| --- | --- | --- | --- | --- |
| 0 | `type` | uint16 | uint16 | 2 字节 |
| 1 | `version` | uint16 | uint16 | 2 字节 |
| 2 | `guid` | string(36) | str8 | 36 字节 |
| 3 | `deviceNum` | uint32 | uint32 | 4 字节 |
| 4 | `workspaceNum` | uint32 | uint32 | 4 字节 |
| 5 | `pageNum` | uint32 | uint32 | 4 字节 |
| 6 | `time` | uint64 | uint64 | 8 字节 |

<!-- visual: header-bytes — Header 的字节布局：数组头 0x97，随后 7 个字段按编码类型分格标注 -->
<UInkHeaderBytes />

## 字段

| 字段 | 说明 |
| --- | --- |
| `type` | 固定为 `0` |
| `version` | 规范版本号，1.1 为 `11`，见[版本与变更](../version) |
| `guid` | 文件首次创建时生成的 UUID，格式 `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `deviceNum` | 最近一次完整保存时的 Device 数量；使用隐式单例时为 `1` |
| `workspaceNum` | 最近一次完整保存时的 Workspace 数量；使用隐式单例时为 `1` |
| `pageNum` | 最近一次完整保存时各 Workspace 的页数之和；同一页跨 Device、跨图层只计一次，空白页也计入 |
| `time` | 最近一次完整保存完成时的 Unix UTC 时间戳，单位秒 |

## 规则

- **HDR-1** 写入器必须严格按上表写出 `array(7)`：字段顺序、数值位宽与 `guid` 的 str8 编码都不得改变，不得用 MessagePack 的最小整数编码代替固定宽度。
- **HDR-2** 读取器必须验证数组长度、`type = 0`、`version` 范围（VER-3）与 36 字符的 UUID 格式。数值字段可以按 TYPE-5 接受能无损转换的其他编码。
- **HDR-3** `guid` 标识一个逻辑文件。增量写入、完整保存、移动、重命名都不得改变它；“另存为”新的逻辑文件时必须生成新的 UUID（VER-7）。
- **HDR-4** 统计字段是快照。增量写入不得修改 Header（SAVE-20）；完整保存时重新计算全部统计字段。
- **HDR-5** 读取器以实际读到的对象重新计算状态，不得因快照与实际不符而拒绝文件，也不得按快照中的数量预分配内存。

## 示例

```json
[0, 11, "5fe30f46-be92-49b6-b921-a60706febf10", 2, 1, 12, 1700000000]
```

## 回退

Header 无效时（HDR-2 任一检查失败），读取器必须拒绝按 UInk 解析该文件，没有回退方式。

## 相关

- [版本与变更](../version)
- [块类型与编码](../type)
- [保存、追加与恢复](../incremental)
