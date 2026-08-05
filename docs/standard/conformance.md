---
title: 实现一致性与样例
---

本页汇总第三方 UInk version `10` 读取器和写入器必须共同遵守的线格式边界。本文将一个顶层 MessagePack 对象称为“块”；各块页面仍是字段语义和块级容错的权威定义。

## 规范性术语

- **必须**：实现不满足时不属于当前 UInk 草案的兼容实现。
- **不得**：禁止行为，与“必须不”具有相同约束力。
- **应 / 应当**：推荐行为；偏离时需要保证不会造成错误附着、静默丢失或安全风险。
- **可以**：不影响基础互操作的可选行为。

字段表中的要求列使用以下含义：

- **Required**：字段必须存在并通过字段校验。
- **Optional**：字段可以省略；存在时仍须通过字段校验或按页面定义的容错规则处理。
- **Conditional**：字段是否必需或是否允许出现，由该字段所在页面列出的条件决定。

## 编码检查

- 首对象必须是 `array(7)` Header，Type ID 为 `0`，version 为 `10`。
- 写入器必须使用字段表声明的精确 MessagePack 类型和位宽。
- 读取器只有在数值不变、目标类型可精确表示且字段范围有效时，才能接受其他 MessagePack 数值编码；完整规则参见[块类型与编码](type#messagepack-编码)。
- Map 中重复的任一已知键使包含该 Map 的当前完整块无效。未知键可以忽略，但不得改变已知字段的解释。
- `contentId` 只在当前文件版本的 Canvas 内有效；完整保存后不具备稳定身份。
- Header 计数是最近一次完整保存快照，实际对象流具有更高优先级。

## 读取流程

1. 读取并验证首对象的 Header 固定布局。Header 无效时，拒绝按当前规范解析文件。
2. 读取紧随 Header 的可选 Header Extension。为缺失或空的 Device/Workspace 注册表分别建立文件内隐式单例。
3. 从下一个顶层对象开始顺序解码。每遇到 Canvas 就开始新的内容作用域；后续 Ink/Shape/Media 归属最近的 Canvas。
4. 未知 Type ID 跳过当前完整对象。能完整解码但字段无效的已知块，按对应块页面的规则跳过或回退。
5. EOF 位于最后一个对象内部时，丢弃该不完整对象。解析非末尾对象或对象间字节失败时，停止读取余下字节，不尝试重同步。
6. 使用有效对象流重算页面与内容状态，并检查 Header 快照差异。Header 计数不得作为不受限内存分配依据。

## 保存边界

1. 增量追加只修改文件尾部，不修改 Header。恢复后的文件必须先截断无效尾部，再允许追加。
2. 完整保存先确定新主文件引用的资源集合。存在资源时，先准备暂时包含旧、新引用资源并集的临时资源包，再生成并校验临时主文件。
3. 提交时先替换资源包，最后原子替换主文件。主文件提交后才能清理多余资源。
4. 完整保存移除已撤回内容，但保留被末尾最新组规则隐藏、仍可通过撤回结果恢复的原稿。
5. 软件自己创建且确认所有对象都能理解的文件可以直接覆盖。外部导入或含未知内容的文件默认另存为；只有用户明确确认可能丢失未知内容后，软件才能覆盖原文件。

## 公开样例

所有样例文件及其可读清单均通过 [`fixtures.json`](/standard/uink-v10/fixtures.json) 发布。清单保存用途、十六进制和 SHA-256；`.uink` 条目还保存可完整解码的对象及 `expectedObjects`，`.uink.extra` 条目保存 ZIP `entries`。[`SHA256SUMS.txt`](/standard/uink-v10/SHA256SUMS.txt) 可用于下载后校验。

| 文件 | 验证目标 |
| --- | --- |
| [implicit-single-canvas.uink](/standard/uink-v10/implicit-single-canvas.uink) | 无 Header Extension 的隐式 Device/Workspace 单例 |
| [explicit-multilayer.uink](/standard/uink-v10/explicit-multilayer.uink) | 显式注册表、多 Device/Workspace、`layerIndex = 0` 的 viewport |
| [mixed-latest.uink](/standard/uink-v10/mixed-latest.uink) | Ink/Shape/Media 混合顺序与末尾最新组的撤回语义 |
| [incremental-tail.uink](/standard/uink-v10/incremental-tail.uink) | Header 快照落后于追加页面，读取器重算状态 |
| [truncated-tail.uink](/standard/uink-v10/truncated-tail.uink) | 最后一个对象被截断，仅丢弃不完整尾块 |
| [unknown-block.uink](/standard/uink-v10/unknown-block.uink) | 跳过完整未知 Type ID 并继续读取 |
| [numeric-compat.uink](/standard/uink-v10/numeric-compat.uink) | 读取可无损转换的非规范数值编码 |
| [media-safe.uink](/standard/uink-v10/media-safe.uink) | 安全 Media 路径和资源引用 |
| [media-safe.uink.extra](/standard/uink-v10/media-safe.uink.extra) | 包含安全 PNG/SVG 条目的资源包 |

## 第三方实现检查表

- [ ] 写入精确声明类型，并只容错读取能够无损转换且通过字段校验的数值编码。
- [ ] 不依赖 Header 计数分配不受限内存。
- [ ] 能恢复不完整尾块并在再次追加前截断无效字节。
- [ ] 按 `layerIndex`、Workspace 和 Window Device 规则确定合成顺序。
- [ ] 只从 `layerIndex = 0` 读取 viewport，并正确处理隐式单例。
- [ ] 判断 Ink/Shape 末尾最新组时跳过 Media，并正确执行逐步撤回和隐藏原稿持久化。
- [ ] 不把 Erase 应用于 Media，不把失配 PPT Canvas 自动附着到 `pageIndex`。
- [ ] 在读取 ZIP 资源前完成路径、安全和资源预算检查。
- [ ] 对含未知内容的外部文件默认使用另存为。
