# UInk 1.1 规范正文设计（草案 v1）

> 状态：待用户审阅（2026-11-24）。格式内容以父任务 `design.md` 为准，本文只定文档的组织方式、写法和生成机制。

## 1. 页面结构（侧边栏）

| 分组 | 页面 | 路由 | 状态 |
| --- | --- | --- | --- |
| — | 概览 | `/standard/` | 主页子任务创建 |
| 开始 | 规范介绍 | `/standard/intro` | 改写 |
| | 快速开始：写一个最小读取器 | `/standard/quick-start` | **新增** |
| | 分级与认证 | `/standard/levels` | **新增** |
| | 兼容与回退 | `/standard/compatibility` | **新增**：读取回退、兼容导出、版本规则 |
| 文件 | 文件结构 | `/standard/file/main` | 改写 |
| | 保存、追加与恢复 | `/standard/incremental` | 改写：加入按页追加与整理 |
| | 资源包 `.uink.extra` | `/standard/file/extra` | **新增**：从 intro 与 Media 拆出 |
| 块 | Header / Header Extension / Device / Canvas / Ink / Shape / Media / Clear | `/standard/blocks/*` | 改写 |
| 公共结构 | Color Map | `/standard/common/color` | 改写 |
| | 笔尖与端帽 | `/standard/common/nib` | **新增**：Ink 的 `nib` / `cap` 与 Shape 的 `lineCap` / `lineJoin` |
| 附录 | 块类型与编码 | `/standard/type` | 改写 |
| | 图形预设注册表（完整级） | `/standard/appendix/shape-presets` | **新增** |
| | 实现一致性与样例 | `/standard/conformance` | 改写：样例清单改为 1.1 |
| | 版本与变更 | `/standard/version` | 改写：版本规则、1.0 勘误、1.0 → 1.1 变更、1.0 存档链接 |
| | 术语表 | `/standard/glossary` | **新增** |

- 已有路由全部保留，不需要重定向。侧边栏中原来指向 `/standard/intro#墨迹拓展文件` 的条目改为指向新增的资源包页。

## 2. 写作规范

面向两类读者：第一次接触的人，以及按规则逐条实现的 Agent。

### 2.1 块页面模板

```
# Ink 块
一句话：Ink 表示一条完整的笔迹。

::: tip 等级
核心级读取 Pen 的点与宽度；基础级加透明度、荧光笔、笔尖……
:::

## 什么时候用
## 字段            ← 表格增加“等级”列
## 规则            ← 编号列表，一条规则一句话
## 图示            ← 可视化子任务填充（见 §2.4）
## 示例            ← 可读的伪 JSON，注明对应样例文件
## 回退            ← 不支持时怎么显示；导出到低等级时怎么做
## 相关
```

### 2.2 语言

- 短句。一句只讲一件事；先给结论，再讲条件。
- 术语第一次出现时加粗并链接术语表；全站同一概念只用一个词（例如统一用“读取器”“写入器”，不混用“解析器”“编码器”）。
- 规范性用词沿用 1.0 的四个：**必须**、**不得**、**应**、**可以**。
- 不写“本文”“如下所述”之类的空话；不写说明书式的显而易见的解释。
- 示例的值要能和样例文件对上。

### 2.3 规则编号 【推荐】

- 每条规范性规则带稳定编号，例如 `INK-3`、`CANVAS-7`，写在规则行首。
- 分级检查清单、回退表、样例的 `fixtures.json` 都引用这些编号，Agent 可以按编号逐条核对。
- 编号一旦发布就不再复用；删除的规则在变更页里注明。

### 2.4 图示占位

- 用 `<!-- visual: ink-nib — 圆形与矩形笔尖、宽度含义对比 -->` 这样的注释标出图的位置和意图，可视化子任务据此制作。
- 等级标注直接用主题自带的 `<Badge>`，不新增组件。

## 3. 等级与认证页面（`/standard/levels`）

- 等级定义与“包含关系”示意。
- 分级矩阵（父任务 §2.2 定稿版）。
- 每个等级分别列出读取检查清单与写入检查清单：每一项引用规则编号和对应样例。
- 声明方式示例：`UInk 1.1 读取：标准级 + Inkeys 附加级；写入：基础级`。
- 说明：等级不写进文件；文件可以自由组合功能。

## 4. 兼容与回退页面（`/standard/compatibility`）

- 版本规则：主版本 × 10 + 次版本；同主版本向前读取；1.1 读取器必须读 version 10。
- 读取回退表与写入降级表（父任务 §3 定稿版），逐行引用规则编号。
- 兼容导出指南：Inkeys 导出低等级文件的步骤（烘焙橡皮、删除 Clear 之前的内容、整理按页追加的文件……）。
- 含不支持内容的外部文件：默认另存为。

## 5. 单文件规范与 `llms.txt`

- 本地 VuePress 插件 `docs/.vuepress/plugins/uinkSpecBundle.ts`，在 `config.ts` 的 `plugins` 中注册。
- 构建结束时，按侧边栏顺序读取 `docs/standard/**` 的 Markdown 源文件：去掉 frontmatter 与 Vue 组件标签，保留图示占位注释的文字说明，拼成 `/standard/uink-v11/spec.md` 写入构建产物。
- 同时生成 `/standard/llms.txt`：项目一句话说明、单文件规范链接、各页面链接。（站点已启用 plume 的 `llmstxt: true`，它生成根目录 `/llms.txt` 全站索引；本插件若写根目录会覆盖它，因此放在 `/standard/` 下。）
- 1.0 存档：改写开始前，用同一插件逻辑从当前 1.0 源文件生成一次，提交为静态文件 `docs/.vuepress/public/standard/uink-v10/spec.md`，之后不再变化。

## 6. 样例

### 6.1 生成脚本

- 位置：`scripts/uink-fixtures/`。
- 用 Node 编写，自带一个极小的 MessagePack 编码器，**不新增依赖**：描述文件中的值显式标注类型（例如 `{"u16": 0}`、`{"f32": 1.5}`），以满足规范要求的精确类型与位宽。
- 输入：`scripts/uink-fixtures/cases/*.json`（每个样例一个文件，含对象列表、用途、期望结果）。
- 输出：`docs/.vuepress/public/standard/uink-v11/` 下的 `.uink`、`.uink.extra`、`fixtures.json`、`SHA256SUMS.txt`。
- `package.json` 增加 `fixtures:uink` 脚本。重复运行时输出必须逐字节一致。

### 6.2 样例清单（初稿）

| 样例 | 主要等级 | 验证 |
| --- | --- | --- |
| `core-pages` | 核心 | 多页、Pen 宽度变化、基础 Shape、隐式单例 |
| `core-page-append` | 核心 | 同一页追加新版本，以最后出现的为准；`pageIndex` 暂时重复 |
| `basic-appearance` | 基础 | 透明度、荧光笔矩形笔尖、端帽、虚线、箭头、圆角、点阵背景 |
| `standard-ppt` | 标准 | PPT Workspace、`slideId` 绑定、页码绑定、保留页、结束页 |
| `standard-media` + `.extra` | 标准 | 图片 `fit` / `crop`、Media 受 viewport 映射 |
| `standard-shape-object` | 标准 | 图形对象层：首部件 `object`、后续部件引用、共享 `undoId` |
| `full-layers-devices` | 完整 | 多图层、多 Device、嵌套 Workspace |
| `full-hdr-advanced` | 完整 | HDR 颜色、Advanced Highlighter、`renderOnlyWhenLatest` |
| `full-shape-preset` | 完整 | 注册预设的 `construction`；未知预设退回标准层 |
| `inkeys-erase-clear` | Inkeys | Erase Ink、橡皮笔尖、Clear 区间 |
| `compat-v10` | 核心 | version 10 文件由 1.1 读取器读取 |
| `fallback-unknown` | 核心 | 未知块、未知键、未知枚举值的回退 |
| `truncated-tail` | 核心 | 截断尾块恢复 |

- 每个样例在 `fixtures.json` 中写明各等级下的期望结果（文字描述：显示哪些对象、如何回退），并列出覆盖的规则编号。
- 1.0 样例目录 `uink-v10/` 保持不变。

## 7. 1.0 勘误

- 发布在“版本与变更”页：version 10 读取器遇到同主版本更高次版本（例如 11）时，应尽力读取，不再拒绝。
- 坐标单位语义的变化（Device 像素）写进变更页，并说明不对 version 10 文件做特殊处理（D15）。

## 8. 图形预设注册表的资料来源

- 21 种预设的名称、`construction` 参数、立体投影常量、闭合虚线相位规则、弧细分容差，来自 Inkeys 代码（`inkStrokeModelerTest/draw3/shape_presets.inl` 等）。
- 执行时先做一次只读调研，把调研结果写进本任务 `research/`，再据此写附录。是否交给 Codex 做，执行时再询问用户。
