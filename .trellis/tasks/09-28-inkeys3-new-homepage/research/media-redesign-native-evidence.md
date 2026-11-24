# 功能演示重设计：前期探索与原生证据

> 调研日期：2026-10-24。本文记录重设计前的代码、素材、任务历史与本机工具核查。只做只读探索和规划，没有启动普通 GUI、Office/COM，没有生成新视频，也没有修改原生仓库。

## 1. 需求来源与既有交付

- 父任务 `prd.md` 的 R6 要求下方详细介绍覆盖 UI3、Draw3、笔美化、笔效果和更多功能；当前续作聚焦第一组三张功能卡。
- 2026-10-22 的 `media-prd.md` 确定三组八幕：屏幕批注、课件联动、多页白板；产品主栏、分页、笔迹和白板主题必须来自真实 UI3 / Draw3，教学背景与宣传片镜头分层。
- `media-result.md` 是旧版实际交付记录：16 个 MP4、16 张 WebP poster、8 个 GIF，旧成片统一 7 秒；桌面 1440×640 / 30fps，手机 720×720 / 30fps，README GIF 960×426 / 15fps。它保留为历史结果，不重写成新方案已交付。
- 当前 `docs/.vuepress/public/feature-media/manifest.json` 仍使用八个场景 ID：`screen-dynamic`、`screen-through`、`screen-freeze`、`slides-ink`、`slides-binding`、`slides-ready`、`board-backgrounds`、`board-pages`。
- `FeatureSections.vue:87-99` 以真实媒体时长驱动进度，`FeatureSections.vue:107-110` 以 `ended` 换幕，因此新片长可以按内容变化，不必继续统一为 7 秒。

## 2. 当前实现到底由什么组成

### 2.1 网页与播放器

- `docs/.vuepress/theme/components/NewHome3/FeatureSections.vue:22-49` 定义三组八个 slide 及网页外置标题/说明。
- `FeatureSections.vue:133-151` 处理可见性、暂停和换幕；`FeatureSections.vue:307-325` 将舞台、底板和媒体分开。
- `FeatureMedia.vue` 与 `featureMedia.ts` 负责临近视口加载、静音播放、移动端换源、失败 poster 和 decoder 清理。现有组件合同应复用，新素材不应要求重写播放器。
- 当前舞台为桌面 9:4、600px 以下 1:1；移动端必须使用独立构图，不能把桌面整体缩小。

### 2.2 宣传片合成器

- `media/inkeys3-features/storyboard.json` 是旧时间轴：全局 `durationMs=7000`、30fps，八幕共享 camera/timing 结构。
- `media/inkeys3-features/render.py:145-198` 用 Pillow 绘制教学环境；旧背景没有明确的浏览器或 Office 窗口归属。
- `render.py:226-365` 合成环境、原生控件、笔迹、文字与镜头；`render.py:387-420` 用 FFmpeg 输出 H.264。
- 主栏 22px 上浮来自 `render.py:310-319`，不是原生 dock 行为。
- 穿透椭圆脉冲来自 `render.py:267-273`，不是软件光标或点击反馈。
- 背景/标题/兼容性说明等烘焙文字位于 `render.py:186-198`、`:293-305`、`:340-355`。
- 旧 camera 多次把分页或图形推近，并淡出上下文；这造成“关键业务动作发生时，观众还在看模板运动”的焦点竞争。
- 部分场景导出也会在 `render.py:474-476` 重写共享 contact sheet；旧接触表不能默认代表全部八幕，后续应让预览文件名包含范围或 hash。

### 2.3 旧原生素材与真实性边界

- 旧 `sources/manifest.json:3-29` 固定来源为 `D:/Project/Inkeys/Repo/Inkeys-draw`，revision `afee2f142077a55d9938a7bd4ffd9d2b38d7ec42`，不是当前 `Inkeys` 工作区外观的当然证明。
- 旧产物包含 14 个资产、288 张序列帧，共 302 张 PNG；主栏、页控、白板主题和笔迹由真实渲染器导出。
- `native/FeatureMediaExport.inc` 通过已有 `--bar-eraser-offscreen-test` 入口注入 fixture。主栏/页控、白板底图和 InkRenderer 笔迹分别导出；UI 按 60Hz 推进、每两个样本输出 30fps，页控为 30fps。
- 旧墨迹是明确脚本点经真实 InkRenderer 渲染，不是实时触笔、预测或 stroke-modeler 的完整录制。
- `render.py` 只消费原生透明层并合成教学背景；PPT 页码和状态是 fixture 注入，不构成 PowerPoint / WPS / COM 端到端验收。
- 预乘 BGRA 已转换为 straight-alpha PNG，控件使用共享画布锚点；这两项必须保留，不能逐帧 trim 造成漂移或暗边。
- 旧适配只覆盖当时需要的 Bar、PageControl、Whiteboard 和 InkRenderer。新方案所需 Shape、Laser、PenIcon 和更完整输入时序必须重新核查并扩展，不能假装旧 sources 已包含。

## 3. 当前原软件分支与新能力证据

### 3.1 分支状态

- 调研仓库：`D:/Project/Inkeys/Repo/Inkeys`。
- 调研时分支：`feature/shape`；调研基线 HEAD：`d060e39bca3673a9cb25da44b7e5a4534e32d038`。
- 2026-10-24 初次读取时 `git status --short` 无输出。规划收尾时，工作区已被外部切换到 `bugfix/font@aeb178bc7c3b6c52dcda262c7ce22b5ced1e9a76`，并带有另一项字体任务的修改；不得切回、清理或覆盖这些改动。
- `feature/shape` 与 `origin/feature/shape` 仍指向上述调研基线。本文 16 条原生文件引用已在收尾时用 `git cat-file -e feature/shape:<path>` 全部验证存在，不依赖当前工作区。
- 后续实施应使用独立的 feature/shape 制作工作区并重新记录 HEAD/状态；如果分支已前进，先核查差异，不能假设仍是旧基线。
- `InkeysRepo.sln` 存在于仓库根目录。

### 3.2 UI3 输入与场景状态

- 普通主栏按钮在 Down 显示按压，Up 仍命中后提交动作：`Inkeys/Inkeys/UI/Bar/Bar.Interaction.cpp:5872-5901`（本节目录均相对 `D:/Project/Inkeys/Repo/Inkeys`，下同）。
- PPT 翻页方向键有自己的按下策略：`Inkeys/Inkeys/UI/PageControl/PageControl.cpp:2494-2504`。新时间轴不能把主栏和页控都写成同一种点击时机。
- PPT 翻页不会自动把 Shape 重置为普通 Draw：产品工具与页目标分别发布，见 `Inkeys/Inkeys/Drawing/Draw3/Draw3.Product.cpp:158-200` 和 `Inkeys/IdtPlug-in.cpp:1174-1176`。分镜必须保留当前 Shape 工具，除非 fixture 显式切换；正在构造的对象会话结束不等于工具重置。
- Whiteboard、Pierce、Freeze 都是真实按钮：`Inkeys/Inkeys/UI/Bar/Bar.Button.cpp:556-649`；可见性和选中态由场景投影计算：同文件 `:956-1040`。
- Freeze 在 PPT 或 Whiteboard 中不可用：`Inkeys/Inkeys/UI/Freeze/Freeze.cppm:87-96`、`:128-153`。定格只放在桌面/网页场景，课件场景使用正确 PPT 主栏状态。
- Freeze 捕获排除 Inkeys 自身窗口，所以正确演法是“网页停住，主栏、墨迹和指针继续”，不是把整个画面变灰或把主栏固化进背景。

### 3.3 光标事实与宣传片处理边界

- 产品配置只有 `MouseStyle { System, Drawing }` 与 `PenStyle { Circle, PenIcon }`：`Inkeys/Inkeys/Drawing/Draw3/Draw3.CursorSettings.h:7-25`。
- Mouse 软/硬笔选择 Drawing 后可显示应用画笔光标；Pen 默认 Circle，只有显式 PenIcon 才使用笔形。Shape、Highlighter、Eraser、Laser 有各自策略，不能一律套 PenIcon。
- Mouse 应用光标不走 Pen Contact 隐藏语义：`Inkeys/Inkeys/Drawing/Draw3/Draw3.PenCursor.cpp:304-323`。自由笔镜头可以采用真实 Mouse Drawing 路径让笔形在绘制时可见。
- PenIcon 为 24 DIP，左上尖端为热点，笔尾向右下：`Inkeys/Inkeys/Drawing/Draw3/Draw3.PenCursor.cpp:330-347`；GPU type 21 与真实几何在 `Inkeys/Inkeys/Drawing/Draw3/Assets/inkPixelShader.hlsl`。
- 当前没有 outline RGB / outline alpha 用户配置；现有高亮边缘偏浅：`Inkeys/Inkeys/Drawing/Draw3/Draw3.PenCursor.cpp:330-354`。浅底深边需要产品/harness 外观调整或明确标注为宣传片视觉处理，不能声称已有设置。
- 仓库没有图一那样的现代圆角发光系统箭头资源。`Inkeys/src/UI/barSelect.svg` 是工具图标，不是运行时光标。现代箭头应作为独立宣传片输入层高分辨率绘制，不能冒充默认 Windows 光标。
- 穿透/选择时由下层命中窗口拥有系统光标：`.trellis/spec/native-desktop/draw3-cursors.md:44-50`。因此“画布内 PenIcon → 离开画布/进入穿透后现代箭头”有真实交互依据。

### 3.4 Shape 虚线与立体几何

- `Inkeys/Inkeys/Drawing/Draw3/Assets/shapePixelShader.hlsl:5-17` 实现按路径距离求虚线，不是后期把实线切成图片片段。
- 当前线型为 Solid、Dashed、Dotted、DashDot；Dashed 以线宽为单位的 10w 周期构成，箭头头部保持实线。
- Polyline 每段携带路径起点和长度，dash 相位可跨段连续：`inkStrokeModelerTest/draw3/shape_core.cpp:590-595`。
- Cuboid/Cube 的部分后边与连接边、Cylinder/Cone 的底面后半弧、Prism/Pyramid 的隐藏边会由预设标成 Dashed：`inkStrokeModelerTest/draw3/shape_presets.inl:74-157`。
- 形状先经过 Down/Move 预览、Up 确认，再经事务写入文档；不能把预览帧当成已保存墨迹。
- `AutoStraighten` 仍返回 Unsupported：`Inkeys/Inkeys/Drawing/Draw3/Draw3.Bridge.cpp:138-147`。分镜只能展示明确 Shape 预设和控制点，不能宣传任意手写自动拉直或吸附。
- 新分镜选择“已有部分图形 + 青蓝可见辅助线 + 橙黄隐藏/构造虚线”，第二页加入圆锥后侧虚线弧，能同时展示直线与曲线虚线。

### 3.5 Laser 生命周期

- 激光由白热核心、所选 RGB 的外框/散射和漫反射构成：`Inkeys/Inkeys/Drawing/Draw3/Draw3.RendererLaser.cpp:37-68`。
- 默认粒子关闭；不能为了热闹默认加粒子。主要视觉保持真实 core/halo。
- 最后一次 contact Up 后进入 Hold；默认 Hold 1.0 秒、Fade 0.8 秒，Fade 使用 smoothstep：`Inkeys/Inkeys/Drawing/Draw3/Draw3.InkPrediction.cpp:58-95`。
- Laser 是瞬态工具，不写入持久墨迹。三色分屏必须用同一次 contact 横穿三个区域，不能每个区域各画一次再拼起来。

### 3.6 Whiteboard 主题与分屏边界

- 真实主题支持六色及空白/点阵/网格：`Inkeys/Inkeys/UI/Whiteboard/Whiteboard.Theme.h:11-45`。
- 当前素材实测为：白色空白、米白点阵、墨绿网格；三份 PNG 都来自 `WhiteboardVisual::DrawTheme`。
- 产品一次 `DrawTheme` 只画一个颜色和一个 pattern，没有原生三色斜分。三色斜分、斜向 wipe 属宣传片编排；真实主题像素和后期转场必须分别记录。
- 已存在的工作区分页布局/渐显动画可复用；从 Hidden 出现和已可见工作区切换不是同一种动画，不能任意编造。

## 4. 本机工具核查（2026-10-24）

| 工具 | 实测状态 | 制作决策 |
| --- | --- | --- |
| 默认 `python` | Python 3.13.14；没有 Pillow | 不作为媒体 Python，不执行 pip install |
| 媒体 Python | `C:/Users/alan-/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe`；Python 3.12.14 + Pillow 12.3.0 | 所有渲染/验证命令显式使用 |
| FFmpeg | `C:/Users/alan-/AppData/Local/JianyingPro/Apps/10.6.0.14092/ffmpeg.exe`；版本 20.5.0-f2bcd19d3f | 显式传 `--ffmpeg`，不依赖 PATH |
| 编码器 | `h264_mf=True`；`libx264=False` | 复用现有 Windows Media Foundation 路径，正式导出后必须实际解码核验 |
| Native build | `C:/Program Files/Microsoft Visual Studio/18/Community/MSBuild/Current/Bin/arm64/MSBuild.exe` 可用 | 复用 `InkeysRepo.sln Debug|ARM64`，不安装新工具链 |
| Node / pnpm | 均在 PATH；项目已有完整 `node_modules` | 只用于现有网站验证，不引入 Remotion |
| 旧模板 smoke check | `render.py --check` 通过，八幕与旧 native sources 匹配 | 只证明旧输入完整，不代表新分镜已实现 |

结论：本机不需要安装 After Effects、Blender、FFmpeg、Python 包或新 npm 依赖。新方案的质量问题来自分镜与合成设计，不是缺少商业软件。

## 5. 工具方案比较

| 方案 | 效果与适配度 | 成本 | 决策 |
| --- | --- | --- | --- |
| 现有 Python/Pillow + 原生离屏 + FFmpeg | 可精确控制透明层、60fps、矢量超采样、统一时间轴和自动验证；最贴合已有模板 | 无安装、复用代码和证据，token 最低 | 采用 |
| After Effects | 手工精细调镜方便，但原生输入、批量变体、自动验证和可重建性较差 | 需要软件/许可证与更多 GUI 操作 | 不作为依赖；用户已有且主动要求时再考虑 |
| Remotion | React/SVG 时间轴友好 | 新依赖、新渲染链和迁移成本，违背节省 token | 不采用 |
| Blender | 适合 3D，不适合本组 2D 原生透明合成 | 需要安装且复杂度过高 | 不采用 |
| OBS/普通 GUI 录屏 | 无法精确控制离屏帧、状态和重放 | 违反原始无窗口制作约束 | 不采用 |

## 6. 实施前仍需验证的技术事项（不阻塞需求收敛）

- 旧 adapter 的注入锚点是否仍匹配 `feature/shape@d060e39`；不匹配时先更新 harness-only 适配，不能用仿图兜底。
- Shape 预览/提交、Laser 全生命周期、PenIcon 与现代输入层的帧对齐；必须用同一输入时间轴驱动，不各自播放。
- 浅底深边 PenIcon 的最小 harness 外观调整及 provenance 标注；不把它写成现有用户设置。
- 60fps 正式输出的文件体积和浏览器解码情况。先做单组试片，再批量导出；若需降级必须另作决定，不能暗中缩回 30fps。
- PowerPoint / WPS 窗口、安装/插件禁止符号和链环都是明确的教学/宣传片层；不声称完成真实 Office、VSTO 或损坏 COM 环境验收。

以上是需要在实施步骤中验证的技术未知，不是需要用户补充的产品决策。当前阻塞性产品问题为空。
