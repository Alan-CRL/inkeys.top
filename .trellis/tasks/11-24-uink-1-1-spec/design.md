# UInk 1.1 技术设计（草案 v2）

> 状态：草案，供用户审阅（2026-11-24）。标 **【已定 Dn】** 的条目来自 `prd.md` 中的已确认决策；标 **【推荐】** 的条目尚待确认。

## 1. 版本与兼容

- **【已定 D1】** `Header.version = 11`。定义：version = 主版本 × 10 + 次版本（10 = 1.0，11 = 1.1，20 = 2.0）。
- 读取器遇到**同主版本、更高次版本**的文件时必须尽力读取：跳过未知 Type ID 与未知键，按已知规则显示。遇到不同主版本时拒绝读取。
- 1.1 读取器必须能读 version 10（1.1 基本是 1.0 的超集，见 §6）。
- 给 1.0 Beta 发布勘误：把“version 必须等于 10”改为同主版本规则。ICC-CE 等实现更新后即可读 1.1；未更新的旧构建仍会拒绝，属于 Beta 期可以接受的代价。
- Header 仍为 `array(7)`，不增加 magic。

## 2. 功能分级

### 2.1 定义 【已定 D2、D10】

- 等级是**实现的一致性等级**（给读写器实现者的对接与认证参考），**不写进文件**。文件可以自由组合任何功能。
- 四个主等级：**核心级（Core）→ 基础级（Basic）→ 标准级（Standard）→ 完整级（Full）**，高等级包含低等级的全部要求。
- **Inkeys 附加级**可以叠加在任一主等级上。
- 读取器与写入器分别认证，例如“读取：标准级 + Inkeys 附加级；写入：基础级”。
- 读取器遇到自身等级以外的内容时，按 §3 回退，保证核心内容正常显示；不得因此拒绝整个文件。
- 写入器应能导出“目标等级兼容版”：只使用目标等级的功能，必要时按 §3 右栏烘焙或丢弃内容。

### 2.2 分级矩阵 【推荐】

每格列出该等级**新增**的要求（读取器必须正确处理；声称该等级的写入器可以使用）。

| 板块 | 核心级 Core | 基础级 Basic | 标准级 Standard | 完整级 Full | Inkeys 附加级 |
| --- | --- | --- | --- | --- | --- |
| **文件与编码** | Header、MessagePack 对象流、跳过未知块 / 键、截断尾块恢复、读 version 10 / 11 | — | 增量写入（向最后一个 Canvas 追加完整块） | — | — |
| **页面** | 多页：`pageGuid` / `pageIndex`；隐式单例；**按页追加的读取规则（同一页以最后出现的为准）【D4】** | 页面背景（颜色 + 图案）、`pageNumber` 显示页码 | Workspace 类型（屏幕批注 / 白板 / PPT）；PPT 绑定（`slideId`、绑定方式、保留页、结束页）；当前页；`viewport` 平移缩放 | 多图层（`layerIndex > 0`）、多 Device（多显示器、Window 板中板）、嵌套 Workspace | — |
| **Ink** | Pen：点坐标 + 每点宽度、`color.fallback`（sRGB）；圆头；**可以忽略透明度** | 块级 `opacity`、Highlighter（整条覆盖后合成一次）、笔尖描述 `nib`、端帽 `cap` | — | Advanced Highlighter（点级颜色 / 透明度锚点）、`texture`、`renderOnlyWhenLatest`【D11】 | **Erase Ink 及橡皮笔尖形状【D5】** |
| **Shape** | Line / Polyline / Rectangle / Square / Ellipse / Circle / Polygon 几何（含 `rotation`）；描边颜色与宽度；单色填充颜色；可以忽略透明度 | `opacity`、`dashArray` / `dashOffset`、`startMarker` / `endMarker`、圆角、`lineCap` / `lineJoin` | 图形对象层（`objectId`、`revision`、`partIndex` / `partCount`、`preset`、`transform`）【D6】 | 预设注册表与 `construction` 参数【D6】；`renderOnlyWhenLatest`【D11】 | — |
| **Media** | — | — | 图片（PNG / JPEG / SVG）：尺寸、`transform`、`opacity`、`fit` 与 `crop`【D8】 | PDF 页、音频、视频及播放参数 | — |
| **Clear** | — | — | — | — | **Clear 与跨 Clear 撤回区间【D3】** |
| **颜色** | `fallback`（sRGB 24 位） | — | — | HDR：`space` + `components` | — |
| **撤回** | 不要求（只需显示） | — | `undoId` 分组撤回【D9】 | — | — |

各等级的定位：

| 等级 | 一句话 | 典型实现 |
| --- | --- | --- |
| 核心级 | 画得出多页的笔迹和基础图形 | 任何支持多页与矢量的绘图软件、文件预览器 |
| 基础级 | 笔迹和图形的外观正确 | 笔记、白板类软件 |
| 标准级 | 课堂批注软件的日常场景 | ICC-CE、Inkeys |
| 完整级 | 全部能力 | 规范参考实现、Inkeys |

## 3. 回退规则（读取器）与降级规则（写入器）【推荐】

| 内容 | 不支持该能力的读取器 | 写入器导出到较低等级时 |
| --- | --- | --- |
| 块级 `opacity` | 按不透明绘制 | 保留字段（低等级读取器会忽略） |
| Highlighter | 按 Pen 绘制 | 保留 |
| `nib` 笔尖描述 | 按圆形笔尖、`width` 为直径绘制 | 保留 |
| `cap` / `lineCap` / `lineJoin` | 圆头、圆角连接 | 保留 |
| 页面背景 | 透明 / 软件默认背景 | 保留 |
| `dashArray`、Marker、圆角 | 实线、无端头、直角 | 保留 |
| Workspace 类型、PPT 绑定 | 当作普通白板页面显示 | 保留 |
| `viewport` | 按 `{x: 0, y: 0, scale: 1}` 显示 | 保留 |
| 图形对象层 | 当作独立 Shape 显示，不能整体编辑 | 保留 |
| 预设 `construction` | 退回对象层或标准 Shape 层，不拒绝整页 | 保留 |
| Media（核心级 / 基础级读取器） | 跳过 | 可以丢弃 |
| PDF / 音视频（标准级读取器） | 保留布局占位，提示不支持 | 可选：PDF 当前页栅格化为 PNG |
| 多图层 | 按 `layerIndex` 从小到大叠加，当作单层显示 | 合并到第 0 层 |
| 多 Device | 只显示第一个注册 Device 的 Canvas（或由软件选择） | 只导出一个 Device |
| HDR 颜色 | 使用 `fallback` | 只写 `fallback` |
| `renderOnlyWhenLatest` | 忽略（原稿与修正结果同时显示） | 删除被隐藏的原稿 |
| **Erase Ink** | **必须跳过**（橡皮失效），不得按普通笔绘制 | 把擦除结果烘焙进笔画几何（普通板擦切断），删除 Erase Ink |
| **Clear** | 推荐：只显示最后一个 Clear 之后的内容；做不到时提示用户内容可能有误 | 删除最后一个 Clear 及其之前的全部内容 |
| 未知块 / 未知键 | 跳过 | — |

外部文件含有读取器不支持的内容时，沿用 1.0 的保存规则：默认另存为，用户确认后才能覆盖。

## 4. 线格式变更

### 4.1 按页追加 【已定 D4】

- 规则：对象流中再次出现**相同 Canvas 唯一键** `(workspaceKey, deviceKey, pageGuid, layerIndex)` 时，后出现的 Canvas 及其全部内容**整体替代**先前的 Canvas 及其内容。读取器以最后一次出现为准。
- 1.0 的“只能向最后一个 Canvas 追加”放宽为：可以向最后一个 Canvas 追加内容块，**也可以**追加任意页面的完整新版本。
- 页面顺序由 `pageIndex` 决定，不由对象流顺序决定。按页追加可能导致 `pageIndex` 暂时重复或出现空洞，此时读取器按 `pageIndex` 排序，相同值按最后出现的位置排序，并为本次加载重新编号。
- 页面删除：不定义删除标记，删除页面时做完整保存（整理）【D14】。
- 导出 / 整理：重写为每个 Canvas 只出现一次、按推荐顺序排列的紧凑文件。整理时机由软件决定。
- 页面目录靠顺序扫描，不加文件尾索引。
- 崩溃恢复规则不变（丢弃不完整尾块；再次追加前截断）。

### 4.2 页面元数据 【已定 D12】

写在 Canvas 上，以同页同 Device 的第 0 层为准（与 `viewport` 规则相同），其他图层省略。

| 字段 | 类型 | 等级 | 说明 |
| --- | --- | --- | --- |
| `background` | Map | 基础 | `{ color: Color Map, pattern: int32 }`；`pattern`：0 Blank、1 Dots、2 Grid，3–127 保留，128+ 私有；未知值回退 Blank |
| `pageState` | int32 | 标准 | 0 Active（缺省）、1 Retained（保留页，例如 PPT 中已删除的幻灯片） |
| `pageKind` | int32 | 标准 | 0 Normal（缺省）、1 EndScreen（PPT 结束页，可以没有 `slideId`） |
| `binding` | int32 | 标准 | PPT 绑定方式：0 SlideId（缺省）、1 PageIndex；为 PageIndex 时 `slideId` 可选 |

- Inkeys 删除私有键 `inkeysPageState`、`inkeysBindingMode`、`inkeysPageKind`、`inkeysWorkspace`、`inkeysWhiteboardHistory`；PPT 页码绑定不再使用私有 `workspaceType = 128`。

### 4.3 Ink

- 新增 `nib`（基础级）：

  | 字段 | 类型 | 取值 |
  | --- | --- | --- |
  | `shape` | int32 | 0 Circle（缺省）、1 Rectangle |
  | `aspect` | float32 | 宽 ÷ 高；Circle 忽略 |
  | `orientation` | int32 | 0 Fixed（轴对齐、竖直）、1 FollowDirection |
  | `widthMeaning` | int32 | 0 Diameter（缺省）、1 Height、2 EqualAreaDiameter |

  Inkeys 取值：荧光笔 `{shape: 1, aspect: 0.125, orientation: 0, widthMeaning: 1}`；矩形橡皮 `{1, 1/1.5, 0, 2}`；方形橡皮 `{1, 1, 0, 2}`。Inkeys 删除私有键 `inkeysEraserShape`。

  > 2026-11-24：`widthMeaning` 已被决策 D20 取代（见 `prd.md`），矩形笔尖的 `width` 一律是笔尖高度。
- 新增 `cap`（基础级）：0 Round（缺省）、1 Square、2 Butt。荧光笔与矩形橡皮为平头扫掠。
- 明确：未实现 Inkeys 附加级的读取器必须跳过 `inkType = 0`。
- 不增加压感、倾斜、时间等点级通道【D8】。

### 4.4 Shape

- Stroke 新增 `lineCap`（与 Ink `cap` 同一枚举）与 `lineJoin`（0 Round 缺省、1 Miter、2 Bevel）。
- 写明：`dashArray` / `dashOffset` 的单位与坐标单位相同；长度为 0 的 dash 段在圆头下画成圆点（点线依赖圆头）；闭合虚线拆分的含义；同一对象的多个部件共享 `undoId`。
- 新增**图形对象层**（标准级），挂在首个部件的 `object` 字段：`{ id, revision, preset, partCount, transform, style?, aux? }`；后续部件只写 `{ ref, partIndex }`。不再存冗余的 `geometry` 与 `parts`。
- 完整级附录：注册的预设名称及其 `construction` 参数、立体投影常量、闭合虚线相位规则、弧细分容差。
- 兼容：未知键一律忽略；对象层或 construction 无法识别、数量或几何不符时，退回标准 Shape 层，**不拒绝整页**。
- 不增加 Path 曲线几何【D8】；曲线用 Polyline 表达。

### 4.5 Media

- 新增 `fit`（0 Fill、1 Contain、2 Cover、3 None）与 `crop`（源图像素矩形 `{x, y, width, height}`）。
- 写明：Media 与 Ink、Shape 一样受页面 `viewport` 映射。

### 4.6 坐标单位 【已定 D13】

- Canvas 坐标单位 = 所属 Device 的像素（物理像素）。文件不记录 DPI 缩放。
- 缩放由 `Canvas.viewport.scale` 表达：`deviceX = (canvasX − viewport.x) × scale`，渲染器按 `scale` 放大或缩小笔迹宽度。
- 需同步改写：Device 几何（Display / Window 的 x / y / width / height）、`hardware.scaleFactor` 的说明、Canvas 与 Ink 页面中“平台无关逻辑像素”的表述。
- 已知影响（写进文档的实现提示）：同一文件在不同 DPI 的屏幕上打开时，笔迹相对屏幕的物理大小会不同；需要保持视觉大小的软件可以自行调整 `viewport.scale`。

### 4.7 Clear 【已定 D3】

- 线格式不变（Type ID 6），整体归 Inkeys 附加级。
- Inkeys 写入时每页最多一个 Clear；规范允许任意数量。

### 4.8 不变的部分

- 撤回模型：`undoId` 分组，不保存重做与编辑历史【D9】。
- `.uink.extra` ZIP、资源路径与安全规则、完整保存提交顺序。
- 不要求完整性校验（格式中本来就没有）。

## 5. 文档与主页（方向草案）

- 每个块页面统一结构：一句话说明 → 适用场景 → 等级标注 → 字段表（每个字段标等级）→ 图示 → 示例 → 回退说明。
- 新增“分级与认证”页面：分级矩阵、回退表、读写认证检查清单。
- 新增“兼容导出”指南：如何从高等级降级（§3 右栏）。
- 可视化：Ink 点与宽度、笔尖形状、端帽、Shape 几何参数、dash、对象层部件、viewport 映射、Clear 区间时间线、按页追加的对象流。
- 面向 Agent：每个版本提供单文件纯文本版规范。
- UInk 主页：新建 `/standard/` 落地页（目前没有独立主页，`intro` 充当首页）。
- 公开样例：每个等级至少一组，外加各回退场景。

## 6. 与 1.0 的兼容性检查

| 变更 | 1.0 读取器（更新到同主版本规则后） | 1.1 读取器读 1.0 文件 |
| --- | --- | --- |
| 新字段（nib、cap、background、object、fit…） | 未知键忽略，按 1.0 显示 | 不受影响 |
| 按页追加 | 会遇到重复 Canvas 键（1.0 未定义）：**紧凑文件不受影响，未整理的追加文件可能显示错误** | 不受影响 |
| 未实现 Inkeys 级时必须跳过 Erase | 1.0 读取器本来就认识 Erase | 不受影响 |
| Clear 改为 Inkeys 附加级 | 无格式变化 | 无格式变化 |
| `renderOnlyWhenLatest` 降到完整级 | 无格式变化 | 低等级 1.1 读取器忽略它，显示可能与 1.0 读取器不同 |
| 坐标单位改为 Device 像素 | 无格式变化；1.0 文件按逻辑像素写入，1.1 读取器按 Device 像素理解 | **语义变化**：在非 100% 缩放的屏幕上，1.0 文件的显示大小会不同；不做特殊处理【D15】 |

## 7. 待确认问题

已确认：Q7 → D14（不加删除标记）、Q9 → D15（version 10 不特殊处理）、可视化 → D16、Agent 版 → D17。

仍待确认：

- 分级矩阵（§2.2）与回退表（§3）的逐项归属，等用户整体审阅。
- 等级的中英文名称：核心 Core / 基础 Basic / 标准 Standard / 完整 Full / Inkeys。
- UInk 主页的视觉方向（单独讨论）。
- 1.1 发布状态（Beta 还是正式冻结）。
