# 交接：S1 第三张卡片“PPT 演示”

写于 2026-11-18，写给接手制作第三张卡片的 agent。
这份文件只说明“这里有什么、之前发生过什么”。第三张卡片的创意、风格和具体做法由接手的 agent 自己决定，下面的内容都不是限制。

## 1. 要做的是什么

官网 `/new-index3` 的 S1 区块有三张竖向卡片，每张下方是一段无声循环的小动画，用 Remotion 制作，浅色、深色各一版。

| 卡片 | 状态 |
| --- | --- |
| 屏幕批注 | 已完成，提交 `e0e4d70` |
| 自由白板 | 已完成，提交 `7da0cc6` |
| **PPT 演示** | **待制作** |

内容规划里关于第三张卡片的原文（`.trellis/tasks/11-16-new-index3-content-plan/content-plan.md` 的 S1 一节）：

- 卡片文案：**PPT 演示**：`放映时自动跟上，边讲边写。`
- 媒体设计：幻灯片标题被圈出 → 翻到下一页画箭头 → 翻回第一页，之前的圈仍在。

同一份规划的 S2“卡片 2 · 会议与演讲”对 PPT 场景有更详细的描述（墨迹随页切换与保存、底栏翻页按钮、两侧翻页按钮闲置时淡化），可以参考。

前两张卡片都只做到“能在 Remotion Studio 里预览”。用户说过成片渲染、静态封面和接入网页等三张都做好之后一起处理。

## 2. 经验和记录在哪里

| 文件 | 里面有什么 |
| --- | --- |
| `.trellis/spec/frontend/remotion-video-guidelines.md` | 制作经验的汇总：先定方向再写代码、画面约定、视线引导、节奏取值、“用镜头讲”的做法、软件界面的事实、笔迹的四项要求、放进网页的注意事项、本机环境、Remotion 实现经验、和 Codex 的分工。**这个文件还没有提交到 Git**（在工作区里，和别的未提交改动放在一起）。 |
| `.trellis/spec/frontend/native-media-guidelines.md` | 原生离屏导出的约定。同样未提交。 |
| `.trellis/tasks/11-16-new-index3-s1-card-motion/prd.md` | 这组卡片的需求（R1–R12）和验收项。 |
| `.trellis/tasks/11-16-new-index3-s1-card-motion/design.md` | 第一张卡片的设计、帧级分镜、节奏的演变过程、网页接入时的排法。 |
| `.trellis/tasks/11-16-new-index3-s1-card-motion/design-whiteboard.md` | 第二张卡片的设计记录：和第一张的区别、用到的软件事实、分镜、原生图的来历。 |
| `.trellis/tasks/11-16-new-index3-s1-card-motion/research/` | 四次 Codex 工作的任务说明和报告：主栏与墨迹调查、桌面主栏导出、白板调查、白板主栏与分页栏导出。任务说明可以当模板。 |
| `.trellis/tasks/11-16-new-index3-content-plan/content-plan.md` | 整个首页的内容规划（S0–S6 定稿），包括交互、版式、文案和媒体的总原则。 |
| `.trellis/tasks/11-16-new-index3-design-system/` | 首页的设计系统与布局。 |
| `media/nh3-remotion/README.md` | 工程怎么预览、抽帧、导出，改什么去哪个文件，目录说明，环境要求。 |
| `media/nh3-remotion/native/README.md`、`native-whiteboard/README.md` | 两套原生导出适配各自怎么构建、导出、裁切。 |

Claude 的本机记忆（`C:\Users\alan-\.claude\projects\D--Project-Inkeys-website\memory\`）里还有四条，换用其他 agent 时读不到，要点已经写进本文件第 6 节和上面的规范文档。

## 3. 工程里现成的东西

工程在 `media/nh3-remotion/`，卡片按 384×576 的 1 倍坐标设计，按 2 倍（768×1152）渲染，60 帧每秒。

| 位置 | 内容 |
| --- | --- |
| `src/cards/screen-annotation/` | 第一张卡片。固定机位；指针串起“写 → 点按钮 → 写”。 |
| `src/cards/whiteboard/` | 第二张卡片。没有指针；整块屏幕放在可推拉、平移的舞台里（`camera.ts`），时间线常量一段接一段推算（`Card.tsx`）。 |
| `src/ink/path.ts` | 把控制点变成“像人写的”带时间采样点（速度随曲率变化）。 |
| `src/ink/softPen.ts`、`Strokes.tsx`、`InkStroke.tsx` | 软笔模型（粗细随速度、实时笔锋）和渲染。 |
| `src/ink/highlighter.ts` | 荧光笔。 |
| `src/ink/handwriting.ts` | 手写小字：字形是贝塞尔路线，目前有 `y`、`=`、`s`、`in`、`x`、`h`。更多字形的作者路线在 `media/inkeys3-brush-showcase/handwriting-revision/v3/`（`english_paths.py`、`math_paths.py`）。 |
| `src/components/` | 屏幕框、内容切换（位移＋模糊＋淡入）、桌面主栏（按下、水波、状态交叉淡化）、指针、预览用的文字叠加。 |
| `src/theme/` | 颜色与字体令牌（取自官网 `home.css`）、缓动、关键帧取值函数。 |
| `public/toolbar/` | 桌面主栏的原生图：`soft`、`highlight`、`soft-freeze`，浅色深色各一套。 |
| `public/whiteboard/` | 白板主栏和分页栏（1/1、2/2）的原生图，浅色深色各一套。 |
| `native/`、`native-whiteboard/` | 上面两组图的离屏导出适配（临时给软件源码打补丁、构建、导出、按字节还原）。 |
| `.cache/src` | 软件源码的独立副本（提交 `bcc11421`，分支 `refactoring/draw` 的旧一点的位置），已经构建过，依赖齐全，不入库。在里面打补丁和构建不会影响 `D:/Project/Inkeys/Repo/Inkeys`。 |
| `.cache/node-x64/node.exe` | 运行 Remotion 用的 x64 Node（见第 5 节）。 |

Studio 里现有的合成：`S1-ScreenAnnotation-Light/-Dark`、`S1-Whiteboard-Light/-Dark`、四个叠了网页文字的预览合成、`InkTest-*`、`GlyphTest-Light`。

## 4. 第三张卡片目前缺什么

这些是已知的空白，是否需要、怎么补由接手的 agent 判断：

- **PPT 放映模式下的界面事实没有专门调查过。** 主栏在放映时长什么样、分页栏和屏幕两侧的翻页按钮的外观与淡化规则、墨迹随页切换的行为，都还没有带出处的结论。之前两次调查的任务说明（`research/codex-ui-survey-brief.md`、`codex-whiteboard-survey-brief.md`）可以照着改。
- **PPT 模式的原生图没有。** 现有的图只有桌面主栏和白板的主栏、分页栏。`media/inkeys3-theme-promo/native/HeroExport.inc` 里有导出分页栏（`BarPageSurface`）的更早先例。
- **示例幻灯片的画面没有。** 规划要求示例内容自制、用英文、避免版权问题。
- **软件仓库的位置已经变了。** `D:/Project/Inkeys/Repo/Inkeys` 现在在 `refactoring/draw` 的 `11cf0164`，比副本新。两次调查的结论分别对应 `dev` 的 `c06697b1` 和 `refactoring/draw` 的 `bcc11421`。

## 5. 环境

- Windows 11 ARM64。Remotion 的合成器只有 x64 版本，所以预览、抽帧、渲染都走 `node scripts/run.mjs <studio|still|render>`，它会改用 `.cache/node-x64/node.exe`。
- 预览：`node scripts/run.mjs studio --port=3123`；在 Claude 桌面应用里是 `.claude/launch.json` 的 `remotion-studio` 配置。写这份文件时 3000 和 3123 两个端口各有一个 Studio 在运行。
- 抽帧：单帧约 16 秒。输出要重定向到文件并给每帧加超时，接到管道里会挂住。
- ffmpeg 在 `D:/Project/Resource/ffmpeg/ffmpeg.exe`（这个版本不支持 glob 输入，用 `%02d.png` 这种序号）。
- 系统的 `python` 有问题，用 `python3`；需要 numpy 时用 `uv run --no-project --with numpy --with pillow python <脚本>`。
- 字体用系统自带的 Segoe UI Variable 和 Georgia。
- D 盘写这份文件时剩约 12 GB。源码副本连中间文件约占 2 GB。

## 6. 可用的 skills 和工具

用户级 skills（`C:\Users\alan-\.claude\skills\`）：

| Skill | 用途 |
| --- | --- |
| `animate` | 从头做一段动画时的决策顺序（要不要动、缓动、时长、退出） |
| `choreograph` | 多个元素一起动时的先后、重叠和静止 |
| `review-animations` | 评审已有的动效 |
| `improve-animations` | 审计一批动效并给出改进计划 |
| `animation-performance` | 网页动画的性能 |
| `apple-design` | Apple 式的界面与物理感动效 |
| `video-shotcraft` | 用真实页面和镜头卡制作产品宣传片（Remotion） |

Remotion 插件的 skills：`remotion:remotion-best-practices`（总入口）、`remotion-markup`、`remotion-studio`、`remotion-render`、`remotion-docs`、`remotion-multimedia`、`remotion-create` 等。

项目里的 Trellis skills 在 `.agents/skills/`（`trellis-start`、`trellis-before-dev`、`trellis-check`、`trellis-finish-work` 等），工作流说明在 `.trellis/workflow.md`。这组卡片归在已有的任务 `11-16-new-index3-s1-card-motion` 下。

前两张卡片实际用到的：`remotion:remotion-studio`、`choreograph`（第二张的设计阶段）。`review-animations` 和独立的终检子代理两张都没有做。

Codex CLI：`%LOCALAPPDATA%\Programs\OpenAI\Codex\bin\codex.exe`，可用模型 `gpt-6.1-terra`、`gpt-6.2-sol`、`gpt-6.2-astra`。前两张卡片里它做过只读的源码调查和导出适配的编写，用的命令形如：

```bash
codex exec -C <目录> -m gpt-6.2-sol -c model_reasoning_effort=high -c service_tier=default --sandbox read-only -o <报告路径> - < <任务说明>
```

两点实际遇到的情况：它的工作区沙箱在本机不能运行 Python、不能构建；非交互运行时如果任务说明没写“属于已有的 Trellis 任务、不要提问”，它会停下来问要不要新建任务。

## 7. 用户说过的话

以下是用户在前两张卡片制作过程中给过的反馈，按原意记录，供参考：

- 第一版 10 秒觉得慢，6 秒又觉得书写太快；指针“到位后立刻点击不自然”，要求到位后停一下再按、点完停一下再走。
- 定格那一处：主栏到位后几乎立刻定格，“等人视线到了火星，再定格”。
- 墨迹的四项要求（2026-11-16）：和被标记的对象对位、软笔有实时笔锋、颜色在深浅两版里都清楚、速度像人写的。
- 主栏越过屏幕边框（“出框”）是用户自己提出的。
- 第一张卡片完成后的评价：和网上看到的同类作品相比“非常平淡”。Claude 当时给出的原因分析记在规范文档的“用镜头讲，而不是把操作演一遍”一节。
- 第二张卡片：用户把创意全权交给 Claude，看过后的评价是“效果不错”，随后同意补上原生的主栏和分页栏。
- 首页层面：不使用滚动进度驱动动画；文案面向普通用户，不堆术语和数字；视频里不放说明文字，说明由网页文字叠加；画面里的示例内容和软件界面用英文。
- 用户让 Claude 提交时才提交；提交信息不带 AI 署名；与用户用简体中文交流。

## 8. 工作区的状态

- 分支 `main`，最近两次提交就是这两张卡片。
- 工作区里另有约 50 处与这组卡片无关的未提交改动（`NewHome3` 的删除、别的 Trellis 任务、别的 `media/` 目录等），前两张卡片提交时都没有动它们。
- `.trellis/spec/frontend/` 下的两份规范文档和 `index.md` 的改动未提交。
