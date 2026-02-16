---
title: Header 块
---

- Type ID: 0
- Type: Array

## 结构

### Header 块（固定块）

```
Header = array(5)
```

| 索引 | 键名 | 类型 | MessagePack 类型 | 字节长度 | 是否可原地更新 |
| -- | ------- | ---------- | -------------- | -------- | ------- |
| 0  | `type`   | uint16      | uint16      | 2 bytes | 不支持 |
| 1  | `version` | uint16     | uint16         | 2 bytes  | 不支持 |
| 2  | `guid`    | string(36) | str8           | 36 bytes | 不支持 |
| 3  | `pageNum` | uint16     | uint16         | 2 bytes  | 是 |
| 4  | `time`    | uint64     | uint64         | 8 bytes  | 是 |

::: tip 提示
区域长度固定，字段顺序必须严格保持一致。
:::

### 键名具体说明

:::: field-group

::: field name="type" required
格式对应的[块类型](../type)固定为 0  
:::

::: field name="version" required
格式对应的[规范版本号](../version)  
:::

::: field name="guid" required
固定 36 字符 UUID（格式 `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`）  

此标识用于唯一标识该墨迹，创建文件时应使用随机生成器生成 GUID 并确定此值，以防止重复。
:::

::: field name="pageNum" required
当前表示的总页数  

::: warning 注意
此字段表示逻辑页数，而非 Canvas 块数量（因为一页可能包含多个图层，因此 Canvas 块数 $\geq$ 逻辑页数）。  
:::

::: field name="time" required
Unix UTC 时间戳（单位：秒）  
:::

::::

## 设计原则

* 数组长度固定为 5
* 所有数值类型固定宽度
* 禁止使用最小整数自动编码
* 支持通过文件定位后直接覆盖写：

  * pageNum
  * time

## 示例

``` json
[
    0,
    10,
    "5fe30f46-be92-49b6-b921-a60706febf10",
    12,
    1700000000
]
```

## 原地更新说明

允许安全原地更新字段：

* Header[3] → pageNum
* Header[4] → time

禁止原地修改（需要重新完整写入）：

* `guid`
* `version`

## 相关流程说明

在文件创建的时候需要填入 `version` `guid` `pageNum` `time`。  

在文件重新写入或增量追加写入时需要更新  `pageNum` `time` 的值。  
