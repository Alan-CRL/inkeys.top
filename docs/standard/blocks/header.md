---
title: Header 块
---

- Type ID: 0
- Type: Array

Header 是墨迹主文件的固定首块，保存文件身份、规范版本和可原地更新的统计信息。

## 结构

```text
Header = array(7)
```

| 索引 | 字段 | 类型 | MessagePack 类型 | 字节长度 | 可原地更新 |
| --- | --- | --- | --- | --- | --- |
| 0 | `type` | uint16 | uint16 | 2 bytes | 否 |
| 1 | `version` | uint16 | uint16 | 2 bytes | 否 |
| 2 | `guid` | string(36) | str8 | 36 bytes | 否 |
| 3 | `deviceNum` | uint32 | uint32 | 4 bytes | 是 |
| 4 | `workspaceNum` | uint32 | uint32 | 4 bytes | 是 |
| 5 | `pageNum` | uint32 | uint32 | 4 bytes | 是 |
| 6 | `time` | uint64 | uint64 | 8 bytes | 是 |

::: warning 固定布局
数组长度、字段顺序和数值宽度必须严格保持一致。写入器不得使用 MessagePack 的最小整数自动编码替代上表指定的固定宽度类型。
:::

## 字段说明

:::: field-group

::: field type
@required
固定为 `0`，参见[块类型](../type)。
:::

::: field version
@required
当前 UInk 1.0 使用规范版本号 `10`，参见[规范版本](../version)。
:::

::: field guid
@required
UInk 文件首次创建时生成的 36 字符 UUID，格式为 `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`。

该值标识同一个逻辑 UInk 文件。增量写入、完整重写、移动或重命名文件时均不得改变；“另存为”新的逻辑文件时必须生成新的 UUID。
:::

::: field deviceNum
@required
[Header Extension](headerExtension) 中 Device 注册项总数，Display 与 Window 均计入。使用隐式默认 Device 时固定为 `1`。
:::

::: field workspaceNum
@required
Workspace 注册项总数。使用隐式默认 Workspace 时固定为 `1`。
:::

::: field pageNum
@required
各 Workspace 逻辑页数之和。同一 Workspace 中共享 `pageGuid` 的多个设备或图层只计一页；空白页也必须计入。
:::

::: field time
@required
文件最后修改时间，使用 Unix UTC 时间戳，单位为秒。
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

## 原地更新

允许按固定偏移覆盖 Header[3] 至 Header[6] 的计数与时间。`guid` 和 `version` 不得原地修改；注册表内容改变时仍必须完整重写文件。
