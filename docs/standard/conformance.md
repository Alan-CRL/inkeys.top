---
title: 实现一致性与样例
---

本页说明规范用语的含义、如何自证达到某个等级，并列出用于验证的公开样例。

## 规范用语

| 用语 | 含义 |
| --- | --- |
| **必须** | 不满足就不符合该规则所属的等级 |
| **不得** | 禁止的行为，约束力与“必须”相同 |
| **应** | 推荐做法；不照做时，要保证不会造成内容错位、静默丢失或安全风险 |
| **可以** | 可选，不影响互通 |

字段表中的“要求”列：

| 值 | 含义 |
| --- | --- |
| **Required** | 必须写入，并通过字段检查 |
| **Optional** | 可以省略；写入时仍要通过字段检查 |
| **Conditional** | 是否必填由该字段的说明决定 |

字段表中的“等级”列表示**读取器**从哪一级开始必须理解该字段。Required 字段无论写入器声明哪个等级，都必须写入。

## 规则编号

每条规范性规则都有稳定编号，例如 `INK-11`。编号前缀对应页面：

| 前缀 | 页面 | 前缀 | 页面 |
| --- | --- | --- | --- |
| VER | [版本与变更](version) | CANVAS | [Canvas 块](blocks/canvas) |
| TYPE | [块类型与编码](type) | INK | [Ink 块](blocks/ink) |
| COMPAT | [兼容与回退](compatibility) | SHAPE | [Shape 块](blocks/shape) |
| FILE | [墨迹主文件](file/main) | MEDIA | [Media 块](blocks/media) |
| SAVE | [保存、追加与恢复](incremental) | CLEAR | [Clear 块](blocks/clear) |
| EXTRA | [资源包](file/extra) | COLOR | [Color Map](common/color) |
| HDR | [Header 块](blocks/header) | NIB | [笔尖与端帽](common/nib) |
| HEXT | [Header Extension 块](blocks/headerExtension) | PRESET | [图形预设注册表](appendix/shape-presets) |
| DEV | [Device 结构](blocks/device) | | |

编号发布后不再改变含义，也不会被复用；删除的规则记录在[版本与变更](version)中。

## 自证等级

UInk 不设认证机构，也不提供自动化测试工具。软件按以下步骤自行验证，然后声明等级：

1. 选择目标等级，分别确定读取等级与写入等级。
2. 逐项核对[分级与认证](levels#检查清单)中该等级及以下各级的检查清单。
3. 用下方的公开样例验证：读取器打开每个样例，对照 `fixtures.json` 中该等级的期望结果；写入器生成的文件，用另一个已知正确的读取器打开核对。
4. 在软件说明中声明，例如：`UInk 1.1 读取：标准级 + Inkeys 附加级；写入：基础级`。

## 读取流程

1. 验证首块 Header（VER-3、HDR-2）；不符合时拒绝解析。
2. 读取可选的 Header Extension，为缺失的注册表建立隐式单例（HEXT-3）。
3. 依次解码其余对象：遇到 Canvas 开始新的作用域；内容块归属前一个 Canvas（FILE-3）；同一 Canvas 唯一键以最后一次为准（FILE-8）；不认识的 Type ID 跳过（TYPE-9）。
4. 结尾不完整时丢弃最后一个对象；中间损坏时停止读取，不重新同步（FILE-16、FILE-17）。
5. 用实际读到的对象重新计算页数等状态，不依赖 Header 中的统计（HDR-5）。
6. 按自身等级显示，自身等级以外的内容按[兼容与回退](compatibility)处理。

## 公开样例

1.1 样例由仓库中的生成脚本产生，全部发布在 [`/standard/uink-v11/`](/standard/uink-v11/fixtures.json)。[`fixtures.json`](/standard/uink-v11/fixtures.json) 记录每个样例的用途、覆盖的规则编号、可读的对象内容，以及在各等级下的期望结果；[`SHA256SUMS.txt`](/standard/uink-v11/SHA256SUMS.txt) 用于下载后校验。

::: warning Beta
样例的文件结构已经过独立解码检查，但各等级的期望结果尚未经过读取器实现的验证。Inkeys 适配 1.1 时会逐一验证；发现期望结果与规范不一致时，以规范正文为准，并请反馈。
:::

| 样例 | 主要等级 | 验证内容 |
| --- | --- | --- |
| `core-pages.uink` | 核心 | 多页、Pen 宽度变化、七种基础 Shape、隐式单例 |
| `core-page-append.uink` | 核心 | 同一页追加新版本，以最后出现的为准；`pageIndex` 暂时重复 |
| `basic-appearance.uink` | 基础 | 透明度、荧光笔矩形笔尖、端帽、虚线、箭头、圆角、点阵背景 |
| `standard-ppt.uink` | 标准 | PPT Workspace、`slideId` 绑定、页码绑定、保留页、结束页 |
| `standard-media.uink` + `.extra` | 标准 | 图片的 `fit` 与 `crop`、Media 受 `viewport` 映射 |
| `standard-shape-object.uink` | 标准 | 图形对象层：首个部件与后续部件、共享 `undoId` |
| `full-layers-devices.uink` | 完整 | 多图层、多 Device、嵌套 Workspace |
| `full-hdr-advanced.uink` | 完整 | HDR 颜色、Advanced Highlighter、`renderOnlyWhenLatest` |
| `full-shape-preset.uink` | 完整 | 注册预设的 `construction`；不认识的预设退回对象层 |
| `inkeys-erase-clear.uink` | Inkeys | Erase Ink、橡皮笔尖、Clear 区间 |
| `compat-v10.uink` | 核心 | 1.1 读取器尽力读取 version 10 文件 |
| `fallback-unknown.uink` | 核心 | 不认识的块、键与枚举值的回退 |
| `truncated-tail.uink` | 核心 | 最后一个对象不完整时的恢复 |
| `corrupt-middle.uink` | 核心 | 中间对象损坏时保留之前的内容并停止读取 |
| `future-minor.uink` | 核心 | `version = 12` 的文件：跳过不认识的块与键，尽力读取 |
| `core-shape-curves.uink` | 核心 | 曲线与自由图形：双曲线的两支写成两个 Polyline 并组合成对象，心形写成 Polygon |

1.0 的样例保留在 [`/standard/uink-v10/`](/standard/uink-v10/fixtures.json)，不再更新。
