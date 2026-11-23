## A. 渲染管线与脏区

Draw3 的普通书写路径可以概括为**逐段生成墨迹、按批绘制、按帧合成脏矩形**。动画里最贴近实现的画面，是一个随笔尖移动、大小随笔宽和尾段变化的轴对齐矩形。

- **L2、L1、L0 和最终输出。** L2 缓存已定稿的画布像素。L1 逐批累积当前活动笔画的稳定前缀。L0 每帧重建还可能变化的真实输入尾段和预测段。L0、L1 各有 `Add` 和 `Retain` 两张纹理，可表达上色和擦除。普通帧把脏区内的 L2 复制到最终 backbuffer，再合成活动层。白板底纹、激光、光标和调试标记按各自条件参与合成。抬笔后，定稿墨迹写入 L2，符合条件时复用 L1 前缀，只补画尾段。`Draw3.StrokeGeometry.cpp:2683–2724`、`Draw3.DrawingController.cpp:15606–15618`、`:23735–23750`、`:24034–24093`、`Assets/inkPixelShader.hlsl:531–559`。
- **普通笔的矩形怎么长。** 对这一批墨迹点，以各点的 `x±(r+3 px)`、`y±(r+3 px)` 取轴对齐外接矩形。左上向下取整，右下向上取整，再裁到画布。短而平直、宽度几乎不变的一段，其矩形短边约为笔径加 **6 px**，长边还要覆盖中心线移动。斜线的框仍与屏幕轴对齐。单点墨迹还有一个轻微右伸的短胶囊。`Draw3.StrokeGeometry.cpp:2092–2152`。
- **一帧交给呈现器的是一个外接矩形。** 新增 L1、上一帧 L0、本帧 L0 都并入 `frameDirty`，因此旧预测偏出去的像素也会被覆盖。多个触点、光标或激光会继续扩大这个框。空脏区通常跳过合成，强制整帧时使用整个画布。L0/L1 内部清除另有最多 **8 个**写域矩形，外扩 **2 px**，总面积超过画布 **1/16**、写域未知或缺少 `ClearView` 时改用整层清除。历史恢复另有 tile 回放。`Draw3.DrawingController.cpp:23431–23436`、`:23887–24000`、`:24092–24093`、`Draw3.Renderer.cppm:32–37`、`Draw3.Renderer.cpp:400–448`、`Draw3.InkHistoryGpu.cpp:1524`。
- **怎样呈现。** DirectComposition 把双缓冲 `FLIP_SEQUENTIAL` 交换链接到 visual。Win7Dwm/Aero 路径使用单缓冲 `SEQUENTIAL` HWND 交换链。两条 GPU 路径都调用 `Present1(0, 0, …)`，局部提交传 **1 个** dirty rect，全帧提交省略该矩形。ULW 主画布使用独立最终纹理，经 staging 局部读回、复制到 DIB，再传 `prcDirty` 给 `UpdateLayeredWindowIndirect`。主 ULW 的异步路径可合并跨帧脏区，辅助选择态 ULW 仍同步读回。`Draw3.TransparentPresentation.cpp:909–926`、`:1015–1023`、`:1363–1379`、`:1974–1977`、`:2151–2179`、`:2544–2567`、`.trellis/spec/native-desktop/draw3-integration.md:553–563`。

**动画画法。** 每个模拟渲染帧，先短暂标出“新增长的稳定段”“旧尾段”“新尾段”，再显示包住三者的最终矩形。下一帧替换这个框，墨迹继续保留。两个触点拉开时，可以让最终大框跨过两者之间的空白。GPU 图元自身的旋转包围四边形适合另做放大特写。

以下 `Draw3.*` 和 `Assets/` 路径均相对于 `Inkeys/Inkeys/Drawing/Draw3/`。本次只核对仓库源码和已有记录，未构建、运行或新增测量。

## B. 从输入到呈现的低延迟路径

- **RTS、Pointer、鼠标各有入口。** RTS 注册同步插件，启用 `SetAllTabletsMode(TRUE)`，一个 `Packets` 批次取末包并发布最新 Move。WM_POINTER 后端从当前消息读取笔或触摸，包含可用的压力、姿态和触摸面积。该后端下，真实鼠标仍走 Win32 鼠标入口。自动模式在大屏触控配置选 RTS，桌面交互在 Win8.1/Win10 选 Pointer，其余选 RTS。启动失败可以回退到 RTS 扩展、基础 XY、Pointer 或鼠标兼容路径，跳过尝试过或系统不支持的项。`Draw3.RealtimeStylus.cpp:1461–1513`、`:2801`、`:2927`、`Draw3.WindowControl.cpp:1380–1471`、`.trellis/spec/native-desktop/input-and-ink.md:161–170`。
- **“原子数据链”具体是按触点发布一致快照。** Down 走准入队列，Move 覆盖该触点的最新快照，Up/Cancel 有独立终态发布语义。写入期间序号为奇数，读端校验前后序号，绘制线程根据序号跳过已消费的快照。这样每帧可以尽快取到较新的输入，代价是中间 Move 可以被合并。绘制线程尝试提升到 `THREAD_PRIORITY_ABOVE_NORMAL`，普通连续 Move 按帧尾截止节拍合并，Down/Up 等边沿可打断等待。`Draw3.ContactInput.cpp:307–353`、`:813–905`、`:1391`、`Draw3.DrawingController.cpp:16640–16642`、`:18315–18324`、`:24275–24296`、`.trellis/spec/native-desktop/draw3-cursors.md:205–231`。
- **DComp 先等交换链空位，再取输入。** Waitable 交换链设置 `SetMaximumFrameLatency(1)`。GPU 吃紧时，在采样前等待可用令牌，减少拿着旧输入继续排队的机会。超时仍可合成并提交，随后记账并偿还令牌。持续异常可熔断并重建普通交换链。这个门控管理排队，画布帧率由独立的帧尾节拍控制。`Draw3.TransparentPresentation.cpp:1910–1959`、`:2164–2181`、`Draw3.DrawingController.cpp:22257–22277`、`Draw3.FrameLatencyGate.h:90–155`。
- **合成时钟和计时器。** DComp 读 `GetFrameStatistics`，Win7Dwm 读 DWM 合成时序，两者微调已有的帧尾等待。有效时序下，代码以预计合成截止为目标，提前量 **2 ms**，相位修正最多为帧间隔的 **10%**。ULW 有自己的读回、背压与合成节流。绘制模式或活动画布漫游请求 **1 ms** 的 `timeBeginPeriod`，回到普通选择态或退出后释放。`Draw3.TransparentPresentation.cpp:2817–2862`、`Draw3.CompositionClock.h:12–27`、`:150–169`、`Draw3.DrawingController.cpp:195–202`、`:3899–3904`、`:22713`、`Draw3.TimerPeriod.h:19–54`。
- **可调选项。** 画布默认 **120 FPS**，有 **30/60/120/240** 四档，重启后切换整套建模和节拍参数。Waitable 等待、合成对齐、ULW 异步读回、GPU 调度和电源节流分别可配。绘制中鼠标移动解除帧率限制的选项默认关闭。“低延迟”适合描述这些设计目标，具体上屏耗时见 F。`.trellis/spec/native-desktop/settings-performance-and-drawing.md:19–41`、`:54–59`。

## C. 墨迹预测

- **默认 Kalman，可切换到关闭或 StrokeEnd。** Kalman 对 X/Y 分别估计位置、速度、加速度和 jerk，按近期采样间隔换算时间尺度。它先从当前建模笔尖用三次曲线接到估计状态，再做三次运动外推。样本量、估计误差、速度与偏离直线的程度共同决定外推点数。StrokeEnd 则让弹簧模型向最近的输入位置收敛。设置在落笔时锁存，橡皮禁用预测。`Draw3.InkPrediction.cpp:203–263`、`Draw3.DrawingController.cpp:110–116`、`Inkeys/additional/ink_stroke_modeler/internal/prediction/kalman_predictor.cc:33–125`、`:147–168`、`:230–282`、`Inkeys/additional/ink_stroke_modeler/internal/prediction/stroke_end_predictor.cc:28–47`。
- **默认 120 档的时间尺度。** 配置外推区间为 **1/60 s，约 16.7 ms**，最低建模输出采样率为 **360 Hz**，所以满置信外推的标称量约为 **6 个点**。三次连接段按距离与速度另算，实际可见预测尾巴没有固定的 6 点或 16.7 ms 总长度。该档目标置信样本数为 **10**，最多保留 **20** 个近期时间样本。进程噪声 **0.05**、测量噪声 **0.01**，稳定迭代门槛 **4**，加速度和 jerk 权重分别为 **0.5** 和 **0.1**。`Draw3.StrokeGeometry.cpp:466–477`、`Draw3.InkPrediction.cppm:207–218`、`Draw3.InkPrediction.cpp:210–226`、`Inkeys/additional/ink_stroke_modeler/internal/prediction/kalman_predictor.cc:109–168`、`:230–282`。
- **预测如何被替换。** 预测点继承最后一个真实建模点的半径，再与可变尾段一起生成 L0 轮廓。下一帧重算 L0，旧尾和新尾的矩形共同参与更新。L1 只接收保护窗之前的真实建模点，保护窗含实时笔锋时长和本次实际预测尾长。进入停笔收敛后抑制预测，抬笔清掉旧预测，最终墨迹只使用真实输入所生成的几何。慢镜头可给预测段加解释色，并在急转弯时展示整条临时尾段被替换。产品正常颜色下，预测和真实段连成同一条墨迹。`Draw3.StrokeGeometry.cpp:650–661`、`:2656–2724`、`Draw3.DrawingController.cpp:22968–23017`、`:23357–23436`、`Draw3.InkPrediction.cppm:76–79`。

## D. 防抖、笔宽与软笔笔锋

- **位置平滑。** Ink Stroke Modeler 在 Move 上先做按时间加权的滑动平均，再按速度混回原始位置，低速更偏平均，高速更贴近输入。弹簧阻尼模型沿校正后的锚点之间分步推进，形式为 `a=(锚点−笔尖位置)/m−72v`，`m=11/32400`。默认 120 档的防抖窗口为 `2.5/120 s`，混合速度阈值为参考速度的 **1.5%–8%**，参考速度为 `500 × dpiScale` 像素每秒。`Draw3.InkPrediction.cpp:208–244`、`Draw3.StrokeGeometry.cpp:474–475`、`Inkeys/additional/ink_stroke_modeler/internal/wobble_smoother.cc:37–76`、`Inkeys/additional/ink_stroke_modeler/internal/position_modeler.cc:18–21`、`:64–69`、`Inkeys/additional/ink_stroke_modeler/stroke_modeler.cc:282–317`。
- **笔身宽度。** 设 `D` 为基准笔径，`S(x)=u²(3−2u)`，`u=clamp(x,0,1)`。软笔模拟压感的目标直径是 `D × [1.4−0.6S(原始输入速度/参考速度)]`。起笔按 `D`，随后用 `clamp(1−exp(−Δt/0.060), 0.02, 0.35)` 追随目标。硬件压感目标为 `D × [0.2+1.2clamp(p,0,1)]`，压力取建模插值。两者还受时间和距离限幅，最大直径变化速率为 `3D/s`，相邻点半径差最多为距离的 `0.35` 倍。鼠标和触摸默认模拟压感，实体笔默认硬件压感，Down 缺少有效压力时回退模拟压感。`Draw3.InkPrediction.cppm:38–47`、`Draw3.InkPrediction.cpp:266–318`、`Draw3.StrokeGeometry.cpp:250–257`、`:342–350`、`:511–570`。
- **实时笔锋可照这个曲线画。** 默认从可见末端时间回看 **55 ms**，量其中的中心线弧长 `L₀` 和最大未收锋半径 `R`。用 `L=L₀×[1−S(age/55 ms)]` 得到有效收尖长度。`age` 取显示时间相对最近真实移动的年龄，有预测时可用较晚的预测端时间作参考。末端倍率为 `M=1−0.7S(L/(4R))`，在最后 `L` 的弧长内再用 `S` 从 **100%** 平滑过渡到 `M`。充分展开时，普通模式末端可到原半径的 **30%**。硬件压感只叠加一半收尖强度，充分展开保留 **65%**。最终还做胶囊公切线约束，相邻半径差至多为段长的 `0.95` 倍。`Draw3.StrokeGeometry.cpp:250–275`、`:353–376`、`:394–459`、`:466–489`、`:2704–2709`。
- **起笔、停笔和抬笔应画成三个动作。** Down 直接从输入位置生成首点，起点按基础宽度或当下压力，源码没有独立的起笔收尖曲线。短笔的实时尾窗可以覆盖大部分笔画。笔尖停住时，有效收尖区逐渐缩短，旧细尾平滑回宽。模型时间可压缩已收敛的静止段，显示时间仍用于笔锋老化，物理 Up 会锁定定稿时刻和真实终点。抬笔时另有可开关的异常尾段拟合，可改定稿副本的位置，再用同一笔锋规则重算半径。这个动作发生在定稿提交时，适合用前后两帧示意。`Inkeys/additional/ink_stroke_modeler/stroke_modeler.cc:190–225`、`Draw3.StrokeGeometry.cpp:415–456`、`:650–679`、`:919–945`、`:2567–2576`、`Draw3.DrawingController.cpp:18567–18569`、`.trellis/spec/native/terminal-tail-reconstruction.md:60–93`。
- **工具边界。** `Pen` 是软笔，才启用按鼠标、触摸、笔分别配置的实时笔锋。`HardPen` 是固定笔宽，仍走位置建模和普通笔的可选抬笔尾段修正。荧光笔使用固定宽度的矩形笔尖扫掠，也可以有预测预览。`Brush` 在这套设置里是硬笔、软笔和部分形状共用的宽色组。`Draw3.DrawingController.cpp:1783–1793`、`:17525–17536`、`:17983–17988`、`:23345–23374`、`Draw3.StrokeGeometry.cpp:2694–2702`、`.trellis/spec/native-desktop/pen-width.md:19–25`。

## E. HLSL 实际做什么

| 着色器 | 实现与证据 |
|---|---|
| `inkVertexShader.hlsl` | 普通墨迹从结构化缓冲取相邻点，用 `SV_VertexID` 将每段展开为 6 顶点的旋转包围四边形。CPU 批量 `Draw`，普通笔段无需逐段 draw call。粒子另走 `SV_InstanceID`。`Assets/inkVertexShader.hlsl:47–60`、`:308–327`、`Draw3.RendererPrimitives.cpp:70–105`、`Draw3.RendererLaser.cpp:388–425`。 |
| `inkPixelShader.hlsl` | 普通笔用两端半径可不同的凸胶囊距离公式，端帽为圆，边沿用 `fwidth(d)×1.5` 与 `smoothstep` 做解析抗锯齿。亚像素细线有双边覆盖处理。其他分支做荧光笔矩形扫掠、矩形擦除、光标、激光核心与光晕、历史及操作层合成。`Assets/inkPixelShader.hlsl:9–52`、`:253–275`、`:326–432`、`:439–573`、`:617–684`。 |
| `shapeVertexShader.hlsl` | 每图元从 `ShapeData` 取 4 个 `float4`，用 6 顶点展开包围矩形，包括旋转椭圆、圆角矩形和三角形。`Assets/shapeVertexShader.hlsl:3–39`、`Draw3.RendererShapes.cpp:294–334`。 |
| `shapePixelShader.hlsl` | 计算圆端线段、虚线、三角形、椭圆近似距离与圆角矩形距离。虚线在像素着色器按累计路径长度求间隙，填充三角形的内部接缝用硬分区。边沿覆盖为 `saturate(0.5−distance)`，输出 `Add/Retain`。`Assets/shapePixelShader.hlsl:3–94`。 |
| `laserParticleEmitCS.hlsl` / `laserParticleUpdateCS.hlsl` | 两者均为每组 **64** 线程，粒子池容量 **2048**。Emit 在轨迹切线法向两侧随机发射，设置大小、初速度、寿命、亮度与呼吸参数。Update 按寿命平滑减速和淡出、按行程缩小，正弦呼吸只影响亮度。**当前产品强制关闭粒子**，归档及现行任务里规划的飘散、光波等效果仍待实现。`Assets/laserParticleCommon.hlsli:5`、`Assets/laserParticleEmitCS.hlsl:16–87`、`Assets/laserParticleUpdateCS.hlsl:20–77`、`Draw3.DrawingController.cpp:15333`、`:15508–15517`、`.trellis/tasks/11-22-draw3-phase-b2-laser/prd.md:17–30`、`:76–110`。 |

## F. 性能证据与兼容路径

| 仓库记录 | 能支持的结论 |
|---|---|
| **默认 120 FPS 预设。** 一次 Adreno 硬件 + DComp 的旧版实机采样，绘制循环间隔中位 **8.337 ms**、P95 **8.346 ms**，当时屏幕为 **60 Hz**。同次非激光 Down 到成功 Present 返回为中位 **1.064 ms**、P95 **9.043 ms**。 | 支持该次运行的帧循环节拍和软件提交耗时。`.trellis/spec/native-desktop/settings-performance-and-drawing.md:21–22`、`.trellis/tasks/archive/2026-10/09-27-inkeys3-first-release-hardening/automation-20261003.md:82–83`。 |
| **120 Hz 屏的实机记录。** DComp 在画布预设 **240 FPS** 时，帧循环和 Present1 约 **240/s**，按新 DWM 合成周期计约 **119.x FPS**。另一次 ULW 异步读回加对齐、画布预设 **120 FPS** 的记录为计算 **120.4 FPS**、按合成周期计渲染 **106 FPS**。 | 支持特定配置下的实测口径。提交次数、合成周期计数和屏幕逐帧光学测量是不同的量。`.trellis/spec/native-desktop/draw3-integration.md:697–706`、`:728`。 |
| **旧设备有压力实验。** HD 4600 / Win10 在前台 GPU 压力下，默认方案的截图估计为 **81/98/103 ms**（p50/p90/max）。实验以 `SendInput` 画圆、`BitBlt` 抓取合成后的屏幕并用角度差估算，记录也明确指出截图阻塞会污染部分长尾。 | 支持特定负载下的诊断结论。旧机持续 120 FPS、实体笔到发光的延迟分布，均缺少对应实测。`.trellis/tasks/archive/2026-11/11-20-draw3-gpu-stress-latency/research/gpu-stress-latency-experiments.md:10`、`:202–225`。 |

- **性能看板和账本。** 实际记录计算帧率、按新 DWM 合成周期计的渲染帧率，以及扣除人为节拍等待后的无限制渲染帧率。评估负载时保留真实 GPU 等待，并按配置、后端、设备和操作维度归档。仓库还有几何、历史和 ULW 行复制微基准，各自只测对应子路径。`Draw3.DevicePerformanceModel.h:17–24`、`:427–462`、`.trellis/spec/native-desktop/draw3-integration.md:697–714`、`Draw3.PerformanceProbe.cpp:223–232`、`.trellis/tasks/archive/2026-10/09-27-draw3-performance/research/history-benchmark-design.md:5`、`.trellis/tasks/archive/2026-10/09-27-draw3-performance/research/ulw-copy-benchmark.md:5–7`。
- **旧系统降级。** D3D11 自动档硬件优先，允许失败后转 WARP。设备先尝试 feature level 11_1/11_0，旧运行库不识别 11_1 时以 11_0 重试。Win7 可在满足条件时走 Win7Dwm/Aero，否则使用 ULW，并有 Win7 WARP 兼容墨迹 shader。压力报告里的两台 Win7 是虚拟机，其中 x86 实例因硬件设备创建失败降到 WARP + ULW。`Draw3.GraphicsInitialization.cpp:31–42`、`:90–117`、`Draw3.TransparentPresentation.cpp:122–139`、`Draw3.Renderer.cpp:994`、`.trellis/spec/native-desktop/input-and-ink.md:697–716`、`.trellis/tasks/archive/2026-11/11-20-draw3-gpu-stress-latency/research/gpu-stress-latency-experiments.md:202–225`。

## G. 可导出的数据与现有诊断

| 动画需要的数据 | 现有入口与粒度 |
|---|---|
| **输入点、时间与压力** | 在生产端可取 `ContactSnapshot`，在绘制端可取实际消费的 `lastInputSnapshot`，两者应带序号和 QPC。要展示 RTS 原始包批次，需在选末包前采集。绘制端已经合并过 Move。`Draw3.RealtimeStylus.cpp:1461–1513`、`Draw3.ContactInput.cpp:326–353`、`Draw3.DrawingController.cpp:18315–18324`。 |
| **建模点、预测点、真实轮廓与定稿** | `modeledResults`、`realPoints`、`predictedResults`、`predictedPoints`、`l0DrawPoints` 和 `committedIndex` 足以解释各阶段。实际实时半径应取 `l0DrawPoints.r`，其中包含收锋和公切线修正。持久化点存最终 `x/y/diameter`。现有尾段日志能取得有界的 raw、model、completed、stored 尾窗。`Draw3.InkPrediction.cppm:480–517`、`Draw3.StrokeGeometry.cpp:913–945`、`:2683–2709`、`.trellis/spec/native/terminal-tail-reconstruction.md:89–97`。 |
| **脏区及其寿命** | 每帧记录 `stableDirty`、`lastL0Rect`、`currentL0Rect`、`frameDirty`、`forceFullPresent`，就能复现合框过程。`presented` 观察回调已有 dirty/full 和呈现观测，Host 快照已有最近的 `lastDirtyRect`。如果要还原 ULW，另记实际提交完成事件，因为多个渲染帧可能被合并。`Draw3.DrawingController.cpp:23431–23436`、`:23932–23935`、`:15652–15698`、`Draw3.Host.cpp:1098–1104`、`:3037–3040`。 |

- **CanvasDebug / RendererDebugOverlay** 已画最新接触位置、压力点环、触摸面积框、标签和性能面板。面积框表示接触范围。RendererDebugOverlay 负责把板子和这些标记绘制到画布。普通产品调试板没有逐帧画出预测轨迹或最终脏矩形。源码有 L0 着色和完成尾段反色的调试选项，当前默认正常墨色。`Draw3.CanvasDebug.cpp:1001–1041`、`Draw3.RendererDebugOverlay.cpp:232–260`、`Draw3.DrawingController.cpp:16849–16862`、`:23982–23985`、`Draw3.InkPrediction.cppm:76–79`、`Draw3.StrokeGeometry.cpp:35`。
- **RuntimeMetrics / Diagnostics** 已有 QPC、帧耗时、等待状态、Down 到成功 Present 返回的 JSON 证据，以及按开关输出的设备、输入、呈现和 ULW 像素诊断。隐藏集成测试的 `PenRuntimeDiagnostics` 还提供端点误差、笔尖半径、显示时间和最多 **8** 个末端建模/采纳点。要驱动完整慢镜头，仍需把上表数据按同一帧序号关联起来。`Draw3.RuntimeMetrics.cpp:599–611`、`:861`、`:1102–1122`、`Draw3.Diagnostics.cpp:954`、`Draw3.PenDiagnostics.h:9–32`、`Draw3.Host.cpp:2427`、`.trellis/spec/native-desktop/input-and-ink.md:19–23`。

## 可安全对外宣称的事实

- Draw3 使用 C++、Direct3D 11 和 HLSL 绘制墨迹，硬件可用时使用 GPU 加速。
- 书写时，Draw3 分段生成墨迹，按帧更新变化区域，并保留已稳定的笔迹。
- 软笔支持随书写速度或笔压变化的笔宽，并可在书写过程中实时收出笔锋。
- Draw3 对输入轨迹做实时平滑，并可以短程预测笔尖移动。预测随新输入更新，最终墨迹使用真实输入生成的笔迹。
- 画布默认采用 120 FPS 预设，并提供多个帧率档位。

## 不能宣称或需谨慎的说法

- **“老电脑稳定 120 FPS”“4K 普遍 120 FPS”**。现有记录仅支持各自的设备、负载、呈现后端与统计口径。
- **“零延迟”“笔尖和墨迹永远重合”“1 ms 上屏”**。1 ms 是计时器请求值。软件 Present 回执和截图估计各有测量边界。浏览器慢镜头适合展示机制，无法充当实体笔到屏幕发光的测量。
- **“每个线段独立提交一个脏矩形”“书写按 tile 上屏”**。当前普通帧把变化合为一个呈现矩形，历史恢复才使用 tile。
- **“每次预测恰好 16.7 ms”“所有笔都自动收尖”“激光粒子已启用”**。预测有动态连接和置信度裁剪，实时笔锋限软笔，粒子在当前产品路径被关掉。

## 适合动画可视化的机制排行

1. **软笔实时收锋与停笔回宽。** 放大同一笔的快扫、停顿和抬笔，按弧长曲线画半径变化。一个镜头就能展示笔身、实时笔锋和定稿。
2. **转弯时预测尾段被替换。** 给最新输入、建模笔尖和临时预测段不同标记。让旧预测在下一帧被新尾段取代，最后收在真实 Up 点。
3. **稳定前缀、可变尾段和帧脏矩形。** 最适合横向构图。稳定墨迹留在画面左边，右边放大随笔尖移动的矩形，展示它如何同时覆盖上一帧和这一帧的尾段。
4. **变半径胶囊与亚像素边缘。** 短暂揭示相邻圆端及公切线，然后叠回一条连续墨迹。这个特写能直接解释细笔尖为何仍有平滑边缘。
5. **取最新输入与合成节拍。** 用短时间轴展示多次输入怎样合成一次取样，以及提交怎样靠近合成截止。图上标实际阶段名称，避免把时间轴读成延迟成绩。
