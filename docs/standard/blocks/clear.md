---
title: Clear 块
---

- Type ID：`6`
- 类型：Map

**Clear 表示一次可以撤回的“清空画布”**。它让同一个 Canvas 在它之前画出的内容全部消失，之后的内容从空白开始画；但之前的内容仍保留在文件里，撤回 Clear 时可以恢复。

::: tip 等级
Inkeys 附加级。未实现该级的读取器按 [CLEAR-7](#回退) 处理；写入器导出给其他软件时，删除 Clear 及其之前的内容（见[兼容导出](../compatibility#兼容导出)）。
:::

## 字段

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `type` | uint16 | Required | 固定为 `6` |
| `contentId` | uint32 | Required | 与 Ink、Shape、Media 共用的内容序号（INK-2） |
| `undoId` | uint32 | Required | 撤回组编号，Clear 独占一组 |
| `extra` | Map | Optional | 软件私有字段 |

Clear 没有范围、几何或类型筛选：它总是清空整个 Canvas 的全部可见内容。

## 规则

### 显示

<!-- visual: clear-intervals（交互）— 内容流 A、Clear1、B、Clear2、C 排成一行；逐步撤回时显示画面依次变为 C → 空 → B → 空 → A -->
<UInkClearIntervals />

- **CLEAR-1** 读取器按对象流顺序合成 Canvas：遇到 Clear 时，把此前形成的全部可见结果重置为透明；Clear 之后的内容从透明开始继续合成。
- **CLEAR-2** Clear 只作用于它所在的 Canvas，不影响同一页的其他 Device、其他图层、其他页面或其他 Workspace，也不改变 Canvas 的页面身份、`viewport` 与图层顺序。
- **CLEAR-3** Clear 清掉此前的全部可见内容，包括 Media。它不修改也不删除之前的块。

### 撤回

- **CLEAR-4** Clear 必须独占一个撤回组：它的 `undoId` 必须大于前一个内容块；Clear 是 Canvas 的第一个内容时 `undoId = 0`；Clear 之后的第一个内容块的 `undoId` 必须大于 Clear。
- **CLEAR-5** 对于内容流 `A, Clear1, B, Clear2, C`，当前显示 C。从尾部逐组撤回：撤回 C 后画布为空；撤回 Clear2 后显示 B；继续撤回 B、Clear1 后依次为空、显示 A。软件可以在当前区间已经撤空时，把“撤回 Clear”呈现为一次恢复，但文件中的顺序不变。
- **CLEAR-6** 完整保存时，可以移除已经撤回的尾部内容与 Clear；仍可通过撤回恢复的旧区间必须保留。软件明确放弃 Clear 历史时，可以删除最后一个有效 Clear 及其之前的全部内容，使当前区间成为 Canvas 的开头。

### 回退

- **CLEAR-7** 未实现 Inkeys 附加级的读取器遇到 Clear 时，应只显示该 Canvas 最后一个 Clear 之后的内容（这只需在绘制前找到最后一个 Clear）。做不到时，必须提示用户“此页的显示可能包含已被清空的内容”。

### 写入

- **CLEAR-8** 写入器不得用新 Canvas、新图层、全屏 Erase Ink 或私有字段模拟 Clear。
- **CLEAR-9** 规范不限制一个 Canvas 中 Clear 的数量。Inkeys 每页最多保留一个 Clear，只支持撤回到上一个区间，更早的内容在保存时丢弃。
- **CLEAR-10** 完整的 Clear 可以追加到最后一个 Canvas（SAVE-8）；撤回或重做 Clear、修改旧区间、压缩 Clear 历史时，整页追加新版本或完整保存。
- **CLEAR-11** 写入器应避免连续写出不产生效果的 Clear（空 Canvas 上的 Clear、紧跟另一个 Clear 的 Clear）；读取器遇到时照常处理，画面为空。

### 容错

- **CLEAR-12** 缺少 `type`、`contentId` 或 `undoId`，字段类型错误，或与相邻内容共用 `undoId` 的 Clear 无效，报告警告。
- **CLEAR-13** 忽略无效 Clear 会改变画面，因此含有无效 Clear 的文件不得直接覆盖保存，默认只读恢复或另存为。

## 示例

```jsonc
{ "type": 6, "contentId": 2, "undoId": 2 }
```

这个 Clear 清空 `contentId` 为 `0`、`1` 的内容形成的画面；`contentId = 3` 起从空白画布开始。

## 回退

| 读取器 | 显示方式 |
| --- | --- |
| 实现 Inkeys 附加级 | 按 CLEAR-1 至 CLEAR-5 显示与撤回 |
| 未实现 Inkeys 附加级 | 只显示最后一个 Clear 之后的内容；做不到时提示用户（CLEAR-7） |

导出给其他软件时删除 Clear 及其之前的内容，见[兼容导出](../compatibility#兼容导出)。

## 相关

- [Ink 块](ink)
- [Canvas 块](canvas)
- [保存、追加与恢复](../incremental)
