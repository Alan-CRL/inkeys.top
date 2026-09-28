---
title: Clear 块
---

- Type ID: 6
- Type: Map

Clear 表示当前 Canvas 内容流中的一次完整可撤回清空。它把同一 Canvas 在该对象之前形成的可见合成结果重置为透明，但不删除旧内容；旧内容继续保留在文件中，供后续按 `undoId` 撤回 Clear 时恢复。

## 字段

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `type` | uint16 | Required | 固定为 `6` |
| `contentId` | uint32 | Required | Canvas 内 Ink/Shape/Media/Clear 共享的连续内容编号 |
| `undoId` | uint32 | Required | Canvas 内非递减的撤回操作分组编号；Clear 必须独占该组 |
| `extra` | Map | Optional | 私有扩展 |

`contentId` 与 Ink、Shape、Media 共用同一编号空间，并严格按照顶层对象流顺序从 0 连续递增。Clear 的 `undoId` 必须大于它前一个内容块的 `undoId`；当 Clear 是 Canvas 的首个内容时使用 `undoId = 0`。Clear 后第一个内容块也必须大于该 Clear 的 `undoId`，从而保证 Clear 独占撤回组。

当前标准 Clear 没有几何、范围或内容类型筛选字段。未来版本可以增加矩形范围，以及仅清空 Ink/Shape、保留 Media 等可选模式；缺少这些未来字段时始终表示清空当前 Canvas 的全部可见内容。

## 作用域与呈现

读取器按对象流顺序合成当前 Canvas：

1. Ink、Shape 与 Media 按各自规则作用到当前结果。
2. 遇到 Clear 时，把当前 Canvas 已形成的全部可见结果重置为透明。
3. Clear 后的内容从透明结果继续合成。

Clear 只作用于它所属的单个 Canvas。它不影响同页其他 Device、其他 `layerIndex`、其他页面或其他 Workspace，也不改变 Canvas 的 `pageGuid`、`pageIndex`、`slideId`、`viewport` 或图层顺序。

Clear 清空此前全部可见类型，包括 Media。它不修改旧块本身；被 Clear 隐藏的旧内容仍是有效撤回历史。写入器不应使用新 Canvas、新图层、全屏 Erase Ink 或私有 `extra` 模拟标准 Clear。

## 撤回与重做

Clear 必须独占一个 `undoId`，不得与相邻 Ink、Shape、Media 或另一个 Clear 共用撤回组。

对于以下内容流：

```text
A, Clear1, B, Clear2, C
```

当前显示只包含 C。按撤回组从尾部操作时，撤回 C 后画布为空；再撤回 Clear2 后显示 B；继续撤回 B、Clear1 后依次为空和显示 A。实现可以在当前区间已经撤空时，把“撤回 Clear”呈现为一次区间恢复，但文件中的操作顺序不得改变。

UInk 不保存已撤回后的 Redo 状态。完整保存可以移除真正已经撤回的尾部内容或 Clear 并重新整理编号；仍有效但被后续 Clear 隐藏、可通过撤回恢复的旧区间必须保留。应用明确丢弃 Clear 历史时，可以把最后一个有效 Clear 之前的内容和该 Clear 一并压缩掉，使当前可见区间成为新的 Canvas 根。

## 增量写入

完整 Clear 块可以追加到文件末尾最后一个 Canvas：

- `contentId` 承接当前 Canvas 的连续内容序列；
- `undoId` 使用新的分组编号并独占该组；
- 写入前必须完成整个 MessagePack Map，不得留下待补齐对象。

目标不是文件末尾最后一个 Canvas、撤回或重做 Clear、修改旧区间，或压缩 Clear 历史时必须执行完整保存。

## 示例

```jsonc
{
  "type": 6,
  "contentId": 2,
  "undoId": 2
}
```

该对象清空当前 Canvas 在 `contentId = 0` 和 `1` 形成的可见结果。后续 `contentId = 3` 从透明 Canvas 继续合成。

## 容错

- 缺少 `type`、`contentId` 或 `undoId`，字段类型错误，或 Clear 与相邻内容共用 `undoId` 时，当前 Clear 无效并报告警告。
- 忽略无效 Clear 会改变可见结果，因此包含无效 Clear 的文件不得被视为可安全原地覆盖；默认应只读恢复或另存为。
- Map 中重复任一已知键时当前 Clear 无效；未知键按通用 Map 扩展规则忽略。
- 空 Canvas 或上一有效操作已经是 Clear 时再次出现 Clear，呈现结果仍为空；写入器应避免生成这种无效果的连续 Clear，读取器可以保留其撤回组。

## 相关说明

- [块类型](../type)
- [墨迹主文件](../file/main)
- [Canvas 块](canvas)
- [Ink 块](ink)
- [Shape 块](shape)
- [Media 块](media)
- [增量写入](../incremental)
