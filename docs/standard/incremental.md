---
title: 增量写入
---

UInk 允许在不修改此前对象流的前提下，把完整的新块追加到文件末尾。增量写入用于实时保存和崩溃恢复，不替代最终完整保存。

## 可以追加的内容

在 Header Extension 已经注册目标 Workspace 与 Device 的前提下，可以追加：

- 文件末尾最后一个 Canvas 中已经完整结束的 [Ink](blocks/ink) 或 [Shape](blocks/shape)；
- 无需改变历史顺序的新 [Media](blocks/media)；
- 引用既有 Workspace 与 Device 的新 [Canvas](blocks/canvas)，随后逐个追加其完整 Ink/Shape/Media。

尚未完成的轨迹不得写入；MessagePack Map 不允许只写一部分后等待补齐。只有文件末尾最后一个 Canvas 可以继续追加内容，不能在末尾重复旧 Canvas 来模拟对旧页的补丁。

追加后必须按固定偏移更新 Header 的 `deviceNum`、`workspaceNum`、`pageNum` 和 `time`。注册表未变化时前两项保持不变；追加新逻辑页时更新 `pageNum`。

## 顺序要求

- 新内容的 `contentId` 承接当前 Canvas 的 Ink/Shape/Media 共享序列。
- `undoId` 不得小于此前内容的 undoId。
- 新 Canvas 的 `(workspaceGuid, deviceGuid, pageGuid, layerIndex)` 不得与既有 Canvas 重复。
- 追加同一逻辑页在另一 Device 上的 Canvas 时复用 `pageGuid/pageIndex`，且不得增加 Header.pageNum。
- 如果目标不是文件末尾最后一个 Canvas，则必须完整重写。

## 必须完整重写的情况

- 新增、删除或修改 Device/Workspace 注册项；
- 修改 Workspace 宿主绑定、父子关系或当前页；
- 撤回或重做；
- 返回旧页、旧图层或更早 Canvas 修改；
- 普通板擦切断已经保存的旧墨迹；
- 修改、移动、删除既有 Media，包括切换既有 PDF 的 `pageIndex`；
- 改变页面、图层、pageIndex 或 pageGuid 结构；
- 任何无法保证追加结果与当前画面一致的情况。

新增 Workspace 时，必须在同一次完整重写中注册 Workspace 并写入其至少一个 Canvas。

完整重写必须只保存当前有效内容，移除已撤回块，重新整理各 Canvas 的 contentId 与 undoId，并重新计算三个 Header 计数。文件永久 `Header.guid`、既有 Workspace/Device GUID 与既有页面 `pageGuid` 均不得改变。

::: warning 两种擦除模式
擦除墨迹是新的完整 Ink，可以直接追加；普通板擦会修改旧墨迹并生成剩余片段，因此必须完整重写。
:::

## 推荐保存策略

软件运行期间可以持续追加，以减少崩溃导致的数据丢失。正常关闭、显式保存或出现结构性修改时，建议完整重写一次，以校验注册表引用、页面身份、编号、计数和内容顺序。

参见[墨迹主文件](file/main)中的完整作用域和混合顺序规则。
