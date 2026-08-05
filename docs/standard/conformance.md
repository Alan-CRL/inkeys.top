---
title: 实现一致性与样例
---

本页汇总第三方 UInk version `10` 读取器和写入器必须共同遵守的线格式边界。各块页面仍是字段语义的权威定义。

## 规范性术语

- **必须**：实现不满足时不属于当前 UInk 草案的兼容实现。
- **应当**：推荐行为；偏离时需要保证不会造成错误附着、静默丢失或安全风险。
- **可以**：不影响基础互操作的可选行为。

## 编码检查

- 首对象必须是 `array(7)` Header，Type ID 为 `0`，version 为 `10`。
- 写入器使用字段表声明的精确 MessagePack 类型；读取器可以接受范围内可无损转换的数值编码。
- Map 中重复的已知键使当前完整对象无效。未知键可以忽略，但不得改变已知字段的解释。
- `contentId` 只在当前文件版本的 Canvas 内有效；完整重写后不具备稳定身份。
- Header 计数是最近一次完整保存快照，实际对象流具有更高优先级。

## 读取流程

1. 验证 Header 固定布局；Header 无效时拒绝当前文件。
2. 读取可选 Header Extension，建立显式注册表或文件内隐式单例。
3. 逐个读取完整顶层对象，并根据最近一个 Canvas 建立作用域。
4. 完整但字段无效的块按块级规则跳过；未知 Type ID 跳过完整对象。
5. EOF 内的不完整最后对象被丢弃；中间字节解析失败时停止读取余下内容。
6. 根据有效对象流重算页面、内容编号、显示顺序和 Header 快照差异。

## 保存边界

- 增量追加只修改文件尾部，不修改 Header。
- 完整保存使用临时文件，资源包先提交且暂时保留旧、新主文件引用资源的并集，再原子替换主文件；主文件提交后才清理多余资源。
- 软件自己创建且确认所有对象都能理解的文件可以直接覆盖。外部导入或含未知内容的文件默认另存为；用户明确确认覆盖时，软件可以丢弃无法理解的未知内容。
- 完整保存移除已撤回内容，但保留被 latest 规则隐藏、仍可通过撤回结果恢复的原稿。

## 公开样例

所有样例文件及其可读清单均通过 [`fixtures.json`](/standard/uink-v10/fixtures.json) 发布。清单保存用途、十六进制和 SHA-256；`.uink` 条目还保存可完整解码的对象及 `expectedObjects`，`.uink.extra` 条目保存 ZIP `entries`。[`SHA256SUMS.txt`](/standard/uink-v10/SHA256SUMS.txt) 可用于下载后校验。

| 文件 | 验证目标 |
| --- | --- |
| [implicit-single-canvas.uink](/standard/uink-v10/implicit-single-canvas.uink) | 无 Header Extension 的隐式 Device/Workspace 单例 |
| [explicit-multilayer.uink](/standard/uink-v10/explicit-multilayer.uink) | 显式注册表、多 Device/Workspace、layer 0 viewport |
| [mixed-latest.uink](/standard/uink-v10/mixed-latest.uink) | Ink/Shape/Media 混合顺序与 latest 撤回语义 |
| [incremental-tail.uink](/standard/uink-v10/incremental-tail.uink) | Header 快照落后于追加页面，读取器重算状态 |
| [truncated-tail.uink](/standard/uink-v10/truncated-tail.uink) | 最后一个对象被截断，仅丢弃不完整尾块 |
| [unknown-block.uink](/standard/uink-v10/unknown-block.uink) | 跳过完整未知 Type ID 并继续读取 |
| [numeric-compat.uink](/standard/uink-v10/numeric-compat.uink) | 读取可无损转换的非规范数值编码 |
| [media-safe.uink](/standard/uink-v10/media-safe.uink) | 安全 Media 路径和资源引用 |
| [media-safe.uink.extra](/standard/uink-v10/media-safe.uink.extra) | 包含安全 PNG/SVG 条目的资源包 |

## 第三方实现检查表

- [ ] 能读取规范类型和可无损转换的数值编码。
- [ ] 不依赖 Header 计数分配不受限内存。
- [ ] 能恢复不完整尾块并在再次追加前截断无效字节。
- [ ] 按 layer、Workspace 和 Window Device 规则确定合成顺序。
- [ ] 只从 layer 0 读取 viewport，并正确处理隐式单例。
- [ ] 正确执行 Ink/Shape latest、逐步撤回和隐藏原稿持久化。
- [ ] 不把 Erase 应用于 Media，不把失配 PPT Canvas 自动附着到 pageIndex。
- [ ] 在读取 ZIP 资源前完成路径、安全和资源预算检查。
- [ ] 对含未知内容的外部文件默认使用另存为。
