# 2026-10-25 Remotion 定格片：原生素材核查

本记录仅覆盖 `screen-freeze`。没有修改或编译原生仓库，没有操作 GUI；父会话负责构图、Remotion 渲染和网站接入。

## 输入与准备

- 复用 `media/inkeys3-features/sources-redesign/manifest.json`、`asset-contract.json` 与 `export-events.jsonl`。
- 原生 revision：`d060e39bca3673a9cb25da44b7e5a4534e32d038`，原生 fixture SHA256：`db6f15b143155814001327475f4c5c6b12f3759a7de0813a9d0500264f0cce42`。
- 新脚本：`media/inkeys3-remotion/scripts/prepare-assets.mjs`，仅使用 Node 内建模块。
- 输入：`toolbar-draw` 静态、`toolbar-freeze` 72 帧、`toolbar-shape` 72 帧、`force-solids` 180 帧、`force-dashed` 120 帧，包含各资产静态终帧。
- 共 449 张原始 RGBA PNG、13,546,911 字节；复制到 Remotion `public/native/`。每张保留原始字节、共享画布与 alpha，不逐帧 trim，不重采样或重新编码。
- `src/native-assets.json` 保存消费所需路径、尺寸、压缩事件段、热点和几何；`public/native/provenance.json` 保存原生来源、全部消费文件 hash 与后期边界。
- 脚本默认校验全部输入成功后才写输出。`--check` 只读校验。原生 fixture 变化、热点参考画布变化、文件 hash/尺寸/格式或事件日志不一致时明确失败，要求重新核查坐标。

## 主栏输入

依据 `native/FeatureMediaRedesign.inc:209–269`：

- `toolbar-freeze` 在 Desktop / SoftPen / 未定格状态开始；第 24 帧 Down、第 36 帧 Up 时提交 Freeze，第 54 帧结束 hover，总计 72 帧。
- `toolbar-shape` 在 Desktop / SoftPen / **已定格**状态开始。第 36 帧 `ChangeStateModeToShape()`，没有退出 Freeze。应先显示这次真实点击，再使用 Shape 实线；虚线可继续沿用所选 Shape 工具。
- 所有主栏图片为 2738×286，sharedCrop 为 `[2952,1279,5690,1565]`。可见控件范围约 `[18,18,2331,268]`，右侧透明区域属于共享锚点，不是可见控件宽度。
- 实际 PNG 第 0 帧与第 35 帧按压像素差：Freeze 区域 `[2109,149,2310,243]`、Geometry 区域 `[759,39,960,240]`。宣传片点击热点取相应区域中央：Freeze `(2210,196)`、Geometry `(860,140)`，坐标均相对于完整 PNG。Freeze 位于末列下半格。
- `Bar.Button.cpp:432` 说明第一次点击几何按钮切换工具，再次点击才展开属性；本片只需首次切换。

## 受力图坐标与帧序列

依据 `native/FeatureMediaRedesign.inc:520–543`，共享画布为 1440×720、60fps：

| 项 | 原生端点 / 时序 |
| --- | --- |
| 摆球 / 三个箭头起点 | `(900,260)` |
| mg 终点 | `(900,420)`；帧 0–47 预览，48 提交 |
| T 终点 | `(824.824590,207.361611)`；帧 48–95 预览，96 提交 |
| Fₜ 终点 | `(824.824590,367.361611)`；帧 96–143 预览，144 提交 |
| 径向构造点 | `(975.175410,312.638389)` |
| 实线尾部 | 144–179 保留三个已提交图形 |
| 虚线 | 球 → 径向构造点 → mg 终点 → Fₜ 终点；0–83 预览，84 提交闭合多边形，85–119 保持 |

`Reveal()` 按线段数量分配时间，三段预览各约 28 帧；最后一条闭合边在 Up 提交时出现，不应在合成器中伪造成逐步自由书写。

mg 颜色 `#2D75E6`，T `#20AFCF`，Fₜ 与虚线 `#E9A23B`；统一线宽 4 原生逻辑像素。重力长度 160、角度 55°、拉力长度 `160cos55°=91.77222981616738`。Fₜ 是重力的切向分量，不能称为第三种独立力。

旧 storyboard 的单摆位置 `(620,70)+350(sin55°,cos55°)` 与真实墨迹起点不完全一致；Remotion 应以真实起点 `(900,260)` 推导支点，保证摆球、绳与三根箭头共用几何。

## 光标真实性修正

实际 `exportShapes()`（fixture 第 421–470 行）只输出 Shape 预览和提交后的图形，没有渲染 Shape 光标。旧规划对“序列自带 Shape 光标”的表述不能当作已实现事实。`Draw3.PenCursor.cpp` 说明图形使用圆形几何，PenIcon 替换仅允许软/硬笔；当前独立导出素材只含自由笔 PenIcon，没有对应 Shape 光标。

因此本轮不拿 PenIcon 或自绘圆形冒充原生 Shape 光标。工具栏可显示明确属于宣传片层的现代箭头以表达 hover / Down / Up；Shape 绘制时使用真实图形序列且省略额外工具光标。此边界已写入生成 provenance。

## 已完成验证

- `node scripts/prepare-assets.mjs`：通过；检查所有 449 PNG 的 SHA256、8-bit RGBA IHDR、声明尺寸和共享锚点，检查 444 动画帧的连续路径及 native event log 一致性。
- `node scripts/prepare-assets.mjs --check`：通过。
- `node --check scripts/prepare-assets.mjs`：通过。
- 独立 Python 检查全部输出文件字节数与 SHA256：通过。
- 再次准备后对比 metadata/provenance 文件 SHA256：完全相同，输出幂等。
- 检查原始 toolbar-freeze PNG，确认 Freeze 是右侧下半格，已冻结的选中态可见。

这些验证只证明准备层与原生来源一致；最终构图、画面连贯性、视频解码、网站构建由父会话另行验收。
