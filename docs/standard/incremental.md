---
title: 增量写入
---

UInk 的增量写入是可选的当前画布崩溃保护。它只向既有对象流末尾追加完整 MessagePack 对象，不替代正常关闭、显式保存或结构变化时的完整重写；软件可以完全不实现增量写入。

## 可以追加的内容

目标 Workspace 与 Device 已由 Header Extension 显式注册，或者文件按 Header Extension 规则使用隐式单例时，可以追加：

- 文件末尾最后一个 Canvas 中已经完整结束的 [Ink](blocks/ink)、[Shape](blocks/shape) 或 [Media](blocks/media)；
- 引用既有 Workspace 与 Device 的新 [Canvas](blocks/canvas)，随后逐个追加完整 Ink/Shape/Media；新 Canvas 为 `layerIndex = 0` 时可以保存最终 viewport，其他图层必须省略 viewport。

尚未完成的轨迹不得写入；MessagePack Map 不允许只写一部分后等待补齐。只有文件末尾最后一个 Canvas 可以继续追加内容，不能在末尾重复旧 Canvas 来模拟对旧页、旧图层或既有 viewport 的补丁。

## Header 快照

增量写入不得原地更新 Header。Header 的 `deviceNum`、`workspaceNum`、`pageNum` 和 `time` 保持最近一次完整保存的值，读取器从实际有效对象流重算当前逻辑状态。

追加新页面后 Header.pageNum 可以暂时偏小；该差异不是文件损坏。完整重写时才重新计算 Header 快照。

## 顺序要求

- 新内容的 `contentId` 承接当前 Canvas 的 Ink/Shape/Media 共享序列。
- `undoId` 不得小于此前内容的 undoId。
- 新 Canvas 的 `(workspace, device, pageGuid, layerIndex)` 不得与既有 Canvas 重复；缺失 GUID 时按隐式单例解释。
- 追加同一逻辑页在另一 Device 上的 Canvas 时复用 `pageGuid/pageIndex`；逻辑页数不变，Header 快照也不更新。
- 如果目标不是文件末尾最后一个 Canvas，则必须完整重写。

## 崩溃恢复

读取器逐个解析顶层 MessagePack 对象：

1. EOF 恰好位于对象边界时，文件正常结束。
2. EOF 位于最后一个对象内部时，丢弃该不完整对象并保留此前所有完整对象。
3. 已完成对象之间出现无法解码的字节错误时，保留此前对象并停止读取余下字节，不尝试搜索后续对象边界。
4. 能完整解码但字段无效的对象按对应块的容错规则跳过，并继续读取下一对象。

软件准备继续追加一个恢复后的文件时，必须先把文件截断到最后一个完整有效对象的末尾，再从最后一个有效 Canvas 内容恢复 `contentId` 和 `undoId`。

## 必须完整重写的情况

- 新增、删除或修改 Device/Workspace 注册项；
- 修改 Workspace 宿主绑定、父子关系或当前页；
- 撤回或重做；
- 返回旧页、旧图层或更早 Canvas 修改；
- 普通板擦切断已经保存的旧 Ink/Shape；
- 修改、移动或删除既有 Ink、Shape、Media；
- 切换既有 PDF 的 `pageIndex`；
- 修改既有页面的 Canvas viewport；
- 改变页面、图层、pageIndex 或 pageGuid 结构；
- 任何无法保证追加结果与当前画面一致的情况。

新增 Workspace 时，必须在同一次完整重写中注册 Workspace 并写入其至少一个 Canvas。

完整重写只移除真正已经撤回的块。带 `renderOnlyWhenLatest = true`、当前被修正结果隐藏但尚未撤回的 Ink/Shape 仍是有效内容，必须保留。写入器重新整理各 Canvas 的 contentId 与 undoId，并重新计算 Header 快照。文件永久 `Header.guid`、既有 Workspace/Device GUID 与既有页面 `pageGuid` 均不得改变。

完整重写只在同页同 Device 的 `layerIndex = 0` Canvas 保存最终 viewport。viewport 不产生 `contentId` 或 `undoId`，不属于 Ink/Shape/Media 的撤回历史；软件在撤回内容时是否调整 viewport 由软件决定。复制页面时，新页面继承源页面 viewport。

## 完整保存提交顺序

完整保存必须先写入临时文件并在成功完成后替换目标文件：

1. 构造新的 `.uink.extra`，完成关闭和校验后替换资源包。提交前的资源包必须同时包含旧主文件仍引用的资源和新主文件将引用的资源，避免资源包替换后、主文件替换前发生崩溃时破坏旧状态。
2. 构造新的 `.uink`，完成关闭和校验后原子替换主文件。
3. `.uink` 是当前有效内容的权威来源。主文件提交后才可以删除不再引用的 ZIP 条目或整个无用资源包；崩溃产生的多余资源允许延后清理，缺失资源按 Media 缺失规则加载。

一次完整保存不得直接在原主文件上边解析边覆盖，以免失败时同时失去旧文件和新文件。

::: warning 两种擦除模式
Erase Ink 是新的完整 Ink，可以直接追加；会切断既有 Ink/Shape 的普通板擦必须完整重写。Erase 不作用于 Media。
:::

## 推荐保存策略

运行期间可以在当前末尾 Canvas 抬笔后追加，以减少崩溃造成的数据丢失。正常关闭、显式保存、撤回、切换旧页修改或出现结构变化时执行完整重写。

参见[墨迹主文件](file/main)和[实现一致性与样例](conformance)。
