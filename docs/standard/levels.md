---
title: 分级与认证
---

UInk 的功能分成四个主等级和一个附加等级。等级告诉实现者“要对接什么”：只做核心级，就能和其他 UInk 软件正确互通；做到更高等级，能保留的内容就更多。

::: tip 等级不写进文件
文件里没有“等级”字段，可以自由组合任何功能。等级是**实现**的一致性等级：读取器和写入器分别对照本页的检查清单验证，然后声明自己达到的等级。
:::

## 五个等级

<!-- visual: levels-stack — 四个主等级逐级包含，Inkeys 附加级像一块插件叠在任一级旁边 -->

| 等级 | 一句话 | 典型实现 |
| --- | --- | --- |
| **核心级** Core | 多页的笔迹和基础图形都画在原处 | 任何支持多页与矢量的绘图软件、文件预览器 |
| **基础级** Basic | 笔迹和图形的外观正确 | 笔记、白板类软件 |
| **标准级** Standard | 课堂批注软件的日常场景 | ICC-CE、Inkeys |
| **完整级** Full | 全部能力 | 规范参考实现 |
| **Inkeys 附加级** | Inkeys 特有的橡皮与 Clear | Inkeys |

- 高等级包含低等级的全部要求：标准级读取器必须同时满足核心级和基础级。
- Inkeys 附加级可以叠加在任一主等级上，例如“标准级 + Inkeys 附加级”。
- 读取器遇到自己等级之外的内容时，按[兼容与回退](compatibility)处理：核心内容必须正常显示，不得因此拒绝整个文件。

## 分级矩阵

每格列出该等级**新增**的要求。

| 板块 | 核心级 | 基础级 | 标准级 | 完整级 | Inkeys 附加级 |
| --- | --- | --- | --- | --- | --- |
| **文件与编码** | Header、对象流、跳过未知块与键、截断尾块恢复、读取 version 10 / 11 | — | 增量写入 | — | — |
| **页面** | 多页（`pageGuid` / `pageIndex`）、隐式单例、按页追加的读取规则 | 页面背景、显示页码 | Workspace 类型、PPT 绑定（`slideId`、绑定方式、保留页、结束页）、当前页、`viewport` | 多图层、多 Device、嵌套 Workspace | — |
| **[Ink](blocks/ink)** | Pen：点坐标、每点宽度、`fallback` 颜色；圆头；可以忽略透明度 | `opacity`、Highlighter、`nib`、`cap` | — | Advanced Highlighter、`texture`、`renderOnlyWhenLatest` | Erase Ink 与橡皮笔尖 |
| **[Shape](blocks/shape)** | 七种基础几何（含旋转）、描边颜色与宽度、单色填充；可以忽略透明度 | `opacity`、虚线、箭头、圆角、`lineCap` / `lineJoin` | 图形对象层 `object` | 图形预设与 `construction`、`renderOnlyWhenLatest` | — |
| **[Media](blocks/media)** | — | — | 图片（PNG / JPEG / SVG）、`transform`、`opacity`、`fit`、`crop` | PDF、音频、视频 | — |
| **[Clear](blocks/clear)** | — | — | — | — | Clear 与跨 Clear 撤回 |
| **[颜色](common/color)** | `fallback`（sRGB） | — | — | HDR（`space` + `components`） | — |
| **撤回** | 不要求 | — | `undoId` 分组撤回 | — | — |

## 声明等级

读取与写入分别声明，格式为：

```text
UInk 1.1 读取：标准级 + Inkeys 附加级；写入：基础级
```

- 读取等级：软件能正确显示到哪一级的内容。
- 写入等级：软件写出的文件最多用到哪一级的能力。写入器永远可以只使用更低等级的能力。

## 检查清单

声明某一等级前，逐项确认该等级及以下各级的清单，并用[公开样例](conformance#公开样例)验证。

### 核心级

读取：

- [ ] 验证 Header，接受 version `10`–`19`；同主版本更高次版本与 version 10 都尽力读取。（VER-3、VER-4、VER-5、HDR-2）
- [ ] 跳过不认识的块与键；结尾不完整时只丢弃最后一个对象；中间损坏时停止读取。（TYPE-8、TYPE-9、FILE-16、FILE-17）
- [ ] 按 `pageIndex` 列出全部页面，包括空白页；同一个 Canvas 唯一键出现多次时以最后一次为准。（FILE-7、FILE-8、FILE-9、SAVE-14）
- [ ] 按点坐标与每点宽度画出 Pen 笔迹，颜色使用 `fallback`；不认识的 `inkType` 按 Pen 画。（INK-4、INK-5、INK-7、INK-13、NIB-1、COLOR-2）
- [ ] 画出七种基础 Shape（含旋转）的描边与单色填充；曲线与自由图形按采样点连线，不做平滑。（SHAPE-1–SHAPE-4、SHAPE-19–SHAPE-22、SHAPE-24）
- [ ] 跳过 Erase Ink；遇到 Clear 时按回退规则处理。（INK-11、CLEAR-7）
- [ ] 回退结果不写回源文件；含不支持内容的文件默认另存为。（COMPAT-1–COMPAT-3、TYPE-12）

写入：

- [ ] 使用精确的 MessagePack 类型与位宽，写入 `version = 11`。（TYPE-1、VER-2、HDR-1）
- [ ] 每个 Canvas 的 `contentId` 从 0 开始连续编号，`undoId` 只增不减。（INK-2、INK-3）
- [ ] 私有字段只写在 `extra` 中。（TYPE-4）
- [ ] 完整保存先写临时文件再替换，不改变文件与页面的 GUID。（SAVE-1、SAVE-2、VER-7）

### 基础级

读取：

- [ ] 按块级 `opacity` 绘制；荧光笔整条覆盖后合成一次。（INK-9、INK-10）
- [ ] 按 `nib` 与 `cap` 绘制笔尖形状与端帽。（NIB-1–NIB-7）
- [ ] 绘制虚线、箭头、圆角、`lineCap` / `lineJoin`。（SHAPE-3、SHAPE-7、SHAPE-9、NIB-4、NIB-5）
- [ ] 绘制页面背景颜色与图案。（CANVAS-8–CANVAS-10）

写入：

- [ ] 点线使用 Round 或 Square 端帽。（NIB-5、SHAPE-7）

### 标准级

读取：

- [ ] 识别 Workspace 类型；PPT 页面按 `slideId` 或页码绑定，绑定失败时保留为未绑定页；保留页不放进正常页序。（HEXT-7、HEXT-10、HEXT-14、CANVAS-11–CANVAS-15）
- [ ] 应用 `viewport`；笔迹、图形、Media 同样受 `viewport` 映射。（CANVAS-16–CANVAS-22）
- [ ] 显示图片 Media，支持 `transform`、`opacity`、`fit`、`crop`；安全读取资源包；资源缺失时保留布局。（MEDIA-1–MEDIA-7、MEDIA-12、MEDIA-13、EXTRA-1–EXTRA-11）
- [ ] 把图形对象层的多个部件当作一个对象；对象层不完整时退回独立 Shape。（SHAPE-11–SHAPE-14）
- [ ] 按 `undoId` 分组撤回。（INK-3）

写入：

- [ ] 增量写入只追加完整的块；崩溃恢复后先截断再追加。（SAVE-6–SAVE-9、SAVE-20、SAVE-22–SAVE-24）
- [ ] 按页追加与整理（如果使用）。（SAVE-10–SAVE-19）
- [ ] 存在资源时按顺序提交资源包与主文件。（SAVE-5、EXTRA-12–EXTRA-17、MEDIA-14）

### 完整级

读取：

- [ ] 按 `layerIndex` 合成多图层；支持多 Device、Window 与嵌套 Workspace。（FILE-11–FILE-13、DEV-5–DEV-7、HEXT-11、HEXT-12）
- [ ] 使用 HDR 颜色；绘制 Advanced Highlighter 的点级样式锚点。（COLOR-2、INK-12）
- [ ] 显示 PDF 页、播放音视频。（MEDIA-8–MEDIA-11）
- [ ] 按注册预设的 `construction` 重建可编辑图形。（SHAPE-15、PRESET-1–PRESET-23）
- [ ] 执行 `renderOnlyWhenLatest` 规则。（INK-15）

### Inkeys 附加级

读取：

- [ ] Erase Ink 按对象流顺序作用于之前的 Ink 与 Shape，不作用于 Media；支持橡皮笔尖形状。（INK-11、NIB-2）
- [ ] Clear 把此前的可见结果清空，并保留旧区间供撤回。（CLEAR-1–CLEAR-6）

写入：

- [ ] 导出给低等级软件时，烘焙橡皮、删除 Clear 之前的内容，生成新的紧凑文件。（COMPAT-5、COMPAT-6、[兼容导出](compatibility#兼容导出)）
