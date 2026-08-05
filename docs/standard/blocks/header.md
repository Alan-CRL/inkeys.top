---
title: Header 块
---

- Type ID: 0
- Type: Array

Header 是墨迹主文件的固定首块，保存文件身份、规范版本以及最近一次完整保存时的统计快照。

## 结构

```text
Header = array(7)
```

| 索引 | 字段 | 类型 | MessagePack 类型 | 负载字节长度 |
| --- | --- | --- | --- | --- |
| 0 | `type` | uint16 | uint16 | 2 bytes |
| 1 | `version` | uint16 | uint16 | 2 bytes |
| 2 | `guid` | string(36) | str8 | 36 bytes |
| 3 | `deviceNum` | uint32 | uint32 | 4 bytes |
| 4 | `workspaceNum` | uint32 | uint32 | 4 bytes |
| 5 | `pageNum` | uint32 | uint32 | 4 bytes |
| 6 | `time` | uint64 | uint64 | 8 bytes |

::: warning 固定布局
写入器必须严格保持数组长度、字段顺序、数值宽度和 `guid` 的 str8 编码，不得使用 MessagePack 的最小整数自动编码替代上表指定的固定宽度类型。读取器仍必须要求 `array(7)`、固定字段顺序和 36 字符 UUID string，但数值字段可以接受范围内可无损转换的其他 MessagePack 数值编码。
:::

## 字段说明

:::: field-group

::: field type
@required
固定为 `0`，参见[块类型](../type)。
:::

::: field version
@required
当前 UInk 1.0 草案使用规范版本号 `10`，参见[规范版本](../version)。
:::

::: field guid
@required
UInk 文件首次创建时生成的 36 字符 UUID，格式为 `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`。

该值标识同一个逻辑 UInk 文件。增量写入、完整重写、移动或重命名文件时均不得改变；“另存为”新的逻辑文件时必须生成新的 UUID。
:::

::: field deviceNum
@required
最近一次完整保存时的 Device 逻辑项总数。显式注册表统计 Display 与 Window；使用隐式默认 Device 时固定为 `1`。
:::

::: field workspaceNum
@required
最近一次完整保存时的 Workspace 逻辑项总数。使用隐式默认 Workspace 时固定为 `1`。
:::

::: field pageNum
@required
最近一次完整保存时各 Workspace 逻辑页数之和。同一 Workspace 中共享 `pageGuid` 的多个设备或图层只计一页；空白页也必须计入。
:::

::: field time
@required
最近一次完整保存完成时的 Unix UTC 时间戳，单位为秒。
:::

::::

## 示例

```json
[
  0,
  10,
  "5fe30f46-be92-49b6-b921-a60706febf10",
  2,
  1,
  12,
  1700000000
]
```

## 快照与实际对象流

增量追加期间不得原地修改 Header。追加新页面后，`pageNum` 和 `time` 可以暂时落后于实际对象流；读取器必须从完整有效的 Header Extension、Canvas 和内容块重算当前状态，不得因快照不一致拒绝文件或按 Header 计数进行不受限预分配。

完整重写时写入器重新计算所有快照字段，并把完整 Header 与其余对象写入临时主文件后整体替换。Header.guid 和 Header.version 不得在同一逻辑文件的完整重写中改变。
