# Inkeys3 UI3 / Draw3 调研（主页素材依据）

来源仓库：`D:\Project\Inkeys\Repo\Inkeys`（2026-09-28 读取）。

## UI3 浮动栏

代码：`Inkeys/Inkeys/UI/Bar/`（`Bar.Metrics.cppm`、`Bar.Theme.cppm`、`Bar.Button.cpp(m)`、`Bar.Animation.cppm`），默认布局在 `Other.Config.cppm`。

结构：MainButton（Logo）+ 间距 10 + MainBar（A1 | 分隔 | 扩展区 | 分隔 | A2）。

默认布局：

- A1（均 2x2）：Select 选择、Draw 画笔（软笔/硬笔/激光笔/荧光笔形态切换）、Geometry 形状、Eraser 橡皮、Recall 撤回、Clean 清空
- 扩展区（2x2）：MoreBoundary 更多、Setting 设置
- A2：Whiteboard 白板（2x1）、Freeze 定格（2x1）、EndShow 结束放映（2x2，仅 PPT 场景）

尺寸（DIP）：

| 项 | 值 |
|---|---|
| 1x1 按钮 | 32.5 |
| 2x2 按钮 | 70（= 32.5 * 2 + 5） |
| 按钮间距 | 5，列步进 75 |
| 按钮圆角 | 4 |
| MainBar 高 / 圆角 | 80 / 8 |
| MainButton | 80x80，超椭圆 n = 3.0 |
| 2x2 图标 / 标签 | 28（Y 偏移 -10）/ 13（Y 偏移 +20，高 25） |
| 2x1 图标 / 标签 | 18（X 偏移 -21）/ 12（X 偏移 +11.5） |

颜色：

| Token | 浅色 | 深色 |
|---|---|---|
| Surface | `#F7F8FA` | `#181818` |
| Frame | `#000000` | `#FFFFFF` |
| Text | `#1B1B1B` | `#FFFFFF` |
| Accent | `#008C69` | `#58FFEC` |

MainBar 填充不透明度 0.8，边框不透明度 0.18。

交互与动效：

- 按下缩放 0.95（EaseOutCubic），释放 EaseOutBack（back = 1.1）
- 悬停不透明度 0.18，过渡 0.24 s；按下填充 0.10；禁用内容 0.30
- 默认操作时长 0.4 s
- 光影：D2D GaussianBlur 边缘光 + 指针/笔点光源（cursor light 强度 0.30）
- 渲染：D2D 1.1 + D3D11 WARP，分层窗口，≤60 FPS

图标：`Inkeys/src/UI/*.svg`，占位填充色 `rgba(10,0,7,0)` 在运行时替换。网页复用时把占位色替换为 `currentColor`。Logo：`logo1.svg`（深色）/ `logo2.svg`（浅色）。字体：HarmonyOS Sans。

## Draw3 画笔引擎

代码：`Inkeys/Inkeys/Drawing/Draw3/`，实验镜像 `inkStrokeModelerTest/draw3/`。

- 渲染：独立 D3D11.1 设备（硬件优先，WARP 回退），自定义 HLSL；呈现路径 DComp → DWM → ULW
- 输入：RealTimeStylus，绘制线程 ABOVE_NORMAL
- 平滑：Google ink-stroke-modeler，配置 `Fps120`（目标 120 FPS，live tip 55 ms）
- 墨迹预测：Kalman，prediction_interval = 1/60 s（约 16.7 ms）
- 实时笔锋：L0 实时尾段 + 预测 + taper，稳定前缀烘焙到 L1 → L2
- 压感：笔默认硬件压感；鼠标/触摸默认模拟压感
- 笔：软笔、硬笔、荧光笔（竖向笔头 6.25x50，无笔锋）、激光笔（核心 + 光晕约 15 px，停留 1.0 s + 淡出 0.8 s，可选 GPU 粒子 2048）
- 刷子：UI 预留，未接入 Draw3（主页标记“即将推出”）
- 橡皮：固定约 50 px 或速度橡皮（约 20–200 px）
- 分层：L0 实时 / L1 已提交 / L2 烘焙，脏矩形呈现
