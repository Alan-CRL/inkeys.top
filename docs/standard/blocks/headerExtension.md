---
title: Header Extension 块
---

- Type ID: 1
- Type: Array

## 结构

```
Extension = map
```

| 键名          | 类型     | 字节长度 |
| ------------- | ------ | ---- |
| `type` | uint16 | 2 bytes |
| `name`        | string | 自由长度 |
| `explanation` | string | 自由长度 |
| `bindingName` | string | 自由长度 |
| `extra`       | string | 自由长度 |

### 键名具体说明

:::: field-group

::: field name="type" required
格式对应的[块类型](#)固定为 1  
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

* 扩展字段长度不限制
* 可任意增加新字段
* 不影响 Header 原地更新
* 推荐使用字符串键（便于跨语言调试）

## 示例

::: tabs

@tab 完全拓展

``` json
{
    "type": 1,
    "name": "CJK's Secret Notes",
    "explanation": "Some secret photos are hidden inside.",
    "bindingName": "xxx.pptx",
    "extra": "..."
}
```

@tab 部分拓展

``` json
{
    "type": 1,
    "name": "CJK's Secret Notes",
    "explanation": "Some secret photos are hidden inside."
}
```

@tab 不含拓展

``` json
{
    "type": 1
}
```

:::
