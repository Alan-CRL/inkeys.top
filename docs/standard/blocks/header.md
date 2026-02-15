---
title: Header 块
---

## 总体结构

Header 由 **两部分组成**：

```
Header = [
    CoreHeader,      // 固定长度
    ExtensionBlock   // 可变长度
]
```

* Header 外层为 **array(2)**
* CoreHeader 固定结构，支持原地更新
* ExtensionBlock 可变，用于扩展信息

## 具体结构

### CoreHeader 块（固定块）

```
CoreHeader = array(4)
```

| 索引 | 键名 | 类型 | MessagePack 类型 | 字节长度 | 是否可原地更新 |
| -- | ------- | ---------- | -------------- | -------- | ------- |
| 0  | `version` | uint16     | uint16         | 2 bytes  | 不支持 |
| 1  | `guid`    | string(36) | str8           | 36 bytes | 不支持 |
| 2  | `pageNum` | uint16     | uint16         | 2 bytes  | 是 |
| 3  | `time`    | uint64     | uint64         | 8 bytes  | 是 |

::: tip 提示
区域长度固定，字段顺序必须严格保持一致。
:::

### ExtensionBlock 块（扩展块）

```
ExtensionBlock = map | nil
```

若不存在扩展信息：`nil` | 若存在扩展：`map(n)`  

| 键名          | 类型     | 字节长度 |
| ------------- | ------ | ---- |
| `name`        | string | 自由长度 |
| `explanation` | string | 自由长度 |
| `bindingName` | string | 自由长度 |
| `extra`       | string | 自由长度 |

### 键名具体说明

:::: field-group

::: field name="version" required
格式对应的[规范版本号](#)  
:::

::: field name="guid" required
固定 36 字符 UUID（格式 `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`）  

此标识用于唯一标识该墨迹，创建文件时应使用随机生成器生成 GUID 并确定此值，以防止重复。
:::

::: field name="pageNum" required
当前表示的总页数  

::: warning 注意
此字段表示逻辑页数，而非 Canvas 块数量（因为一页可能包含多个图层，因此 Canvas 块数 $\seq$ 逻辑页数）。  
:::

::: field name="time" required
Unix UTC 时间戳（单位：秒）  
:::

::: field name="name" optional
文件名称  
:::

::: field name="explanation" optional
文件描述  
:::

::: field name="bindingName" optional
绑定对象名称  
:::

::: field name="extra" optional
私有扩展文本（可存储 JSON / XML / 自定义序列化内容等）  
:::

::::

## 设计原则

### CoreHeader 块设计原则

* 数组长度固定为 4
* 所有数值类型固定宽度
* 禁止使用最小整数自动编码
* 支持通过文件定位后直接覆盖写：

  * pageNum
  * time

### Extension 块设计规则

* 扩展字段长度不限制
* 可任意增加新字段
* 不影响 CoreHeader 原地更新
* 推荐使用字符串键（便于跨语言调试）

## 示例
::: tabs

@tab 完全拓展

```
[
  [
    10,
    "5fe30f46-be92-49b6-b921-a60706febf10",
    12,
    1700000000
  ],
  {
    "name": "CJK's Secret  Notes",
    "explanation": "Some secret photos are hidden inside.",
    "bindingName": "xxx.pptx",
    "extra": "..."
  }
]
```

@tab 部分拓展

```
[
  [
    10,
    "5fe30f46-be92-49b6-b921-a60706febf10",
    12,
    1700000000
  ],
  {
    "name": "CJK's Secret  Notes",
    "explanation": "Some secret photos are hidden inside."
  }
]
```

@tab 不含拓展

```
[
  [
    10,
    "5fe30f46-be92-49b6-b921-a60706febf10",
    12,
    1700000000
  ],
  nil
]
```

:::

## 原地更新说明

允许安全原地更新字段：

* CoreHeader[2] → pageNum
* CoreHeader[3] → time

禁止原地修改（需要重新完整写入）：

* `guid`
* `version`
* ExtensionBlock 结构

## 相关流程说明

在文件创建的时候需要填入 `version` `guid` `pageNum` `time`。  

在文件重新写入或增量追加写入时需要更新  `pageNum` `time` 的值。  
