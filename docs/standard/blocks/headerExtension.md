---
title: Header Extension 块
---

- Type ID: 1
- Type: Map
- Optional

Header Extension 保存整个 UInk 文件的可选说明、宿主场景和私有扩展。它描述文件级信息，不描述具体显示器；显示器信息由 [Device 块](device)保存。

## 位置

Header Extension 最多出现一次。若存在，必须紧跟 Header，且其后必须是第一个 Device；若不存在，第一个 Device 必须直接紧跟 Header。

## 字段

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `type` | uint16 | Required | 固定为 `1` |
| `name` | string | Optional | 文件的显示名称 |
| `explanation` | string | Optional | 文件说明 |
| `sceneType` | int32 | Optional | 宿主场景，缺失时为 `0` |
| `hostId` | string | Optional | 宿主对象的稳定匹配字符串 |
| `extra` | Map | Optional | 文件级私有扩展 |

## `sceneType`

| 值 | 场景 | 说明 |
| --- | --- | --- |
| `0` | Screen Annotation | 屏幕批注，也是缺省值 |
| `1` | Whiteboard | 白板 |
| `2` | Presentation | PPT / 演示文稿 |
| `3`–`127` | Reserved | UInk 后续版本保留 |
| `128` 及以上 | Private | 软件私有场景 |

未知 `sceneType` 应当作为通用画布加载：读取器继续处理 Device、Canvas、Ink 和 Media，但不执行无法识别的宿主绑定逻辑。

## 宿主绑定

一个 UInk 文件最多绑定一个 PPT、白板或屏幕批注宿主。`hostId` 只是匹配字符串，不等同于 Header 的文件 UUID 或 Device UUID。

PPT 软件推荐生成稳定标识并写入 `Presentation.Tags`，再将同一值写入 `hostId`；也允许使用名称等较弱的匹配方式。只读文件或无法写入 Tags 时，读取器可以降级匹配，不得因此拒绝创建或加载 UInk。

::: note PPT 页面定位
具体幻灯片由 Canvas 的 PowerPoint `SlideID` 锚定。`SlideID` 在同一演示文稿内新增或重排页面时保持稳定；找不到时回退到 `pageIndex`。
:::

## `extra`

`extra` 是字符串键到任意 MessagePack 值的 Map。写入器必须把私有文件级字段放入 `extra`，不得随意增加私有顶层键。为提升容错性，读取器仍应忽略无法识别的顶层键。

## 示例

```jsonc
{
  "type": 1,
  "name": "CJK's Presentation Notes",
  "explanation": "课堂演示批注",
  "sceneType": 2,
  "hostId": "INKKEYS-PPT-7B58E2A1",
  "extra": {}
}
```
