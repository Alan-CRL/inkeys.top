**分支 `refactoring/drawpad-ui`，HEAD `866762e0dfd8e18efd97becf7061a1ad6769889a`。** 本报告基于当前工作树的源码，只读核对了渲染、输入、工具切换和放映换页路径。

**官网分镜需要调整一处**。切到软笔会立即清空还可见的激光笔迹，软笔落笔时已经看不到它。要保留真实的渐隐效果，应在仍选中激光笔时播放渐隐，再切到软笔。[`Draw3.DrawingController.cpp`，`synchronizeLaserResources`](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/Drawing/Draw3/Draw3.DrawingController.cpp:18257)

## 1. 激光笔的外观

### 结论

默认实体壳色为 **`#FF1000`**，普通设备的默认**基准实体直径为 5 DIP**，比软笔默认的 3 DIP 粗 2 DIP，约为其 1.67 倍。激光笔提供 **3、5、7 DIP** 三档，默认中档。它与软笔共用属性面板的调色板及自定义取色器，用户可以改色。改色作用于实体壳、散射和光晕，芯仍为白色。浅色和深色软件主题使用同一套笔迹材质。

下表按从底到顶的合成顺序列出材质。`D` 是该处实际实体直径，`d` 是到实体外边缘的有符号距离，向外为正。`C` 是用户选色。表中的 alpha 是材质系数，实际像素还乘对应覆盖率。默认派生色的十六进制值为四舍五入后的近似值。

| 层 | 颜色 | Alpha | 几何及渐变 |
|---|---|---:|---|
| 外层漫反射 | `C`，默认 `#FF1000`，靠内侧有高光提亮 | `g = clamp(1 − d / 5 DIP, 0, 1)²` | 从实体边缘向外延伸 **5 DIP／侧**，默认基准总直径 **15 DIP**。径向平方衰减 |
| 实体壳 | `C`，默认 `#FF1000` | `0.98` | 宽 `D`，默认 **5 DIP**，边缘抗锯齿 |
| 内散射环 | `mix(C, #FFFFFF, 0.94)`，默认约 `#FFF1F0` | `0.94` | 以芯边界为中心，环半宽为芯半径的 `0.4` 倍。内外半径为 `0.1D`、`7D/30`，默认约 **0.500、1.167 DIP** |
| 白芯 | `#FFFFFF` | `1.0` | 宽 `D/3`，默认约 **1.667 DIP**，边缘抗锯齿 |

漫反射高光的目标色 `E = mix(C, #FFFFFF, 0.43)`，默认约 `#FF776E`。光晕像素的 RGB 为 `mix(C, E, 0.72 × smoothstep(0.20, 0.29, g) × (1 − 实体壳覆盖率))`，alpha 仍为 `g`。同一道笔迹的重叠线段对各覆盖通道取 `MAX`，材质层之间及与画布合成使用预乘 alpha 的 `source-over`。

- **鼠标和触摸**按速度模拟压感。慢时粗、快时细，目标直径从 `1.4 × 基准直径` 平滑降到 `0.8 × 基准直径`。默认目标范围是 **4–7 DIP**，起笔使用基准直径，随后平滑追随。96 DPI 下的参考速度为 **500 px/s**。
- **压感笔**的目标直径为 `基准直径 × (0.65 + 0.75 × clamp(p, 0, 1))`，`p` 为归一化压力。默认目标范围是 **3.25–7 DIP**。有效压力缺失时，首点回退到基准直径，后续保留当前直径。两种输入均有半径变化限速。白芯和散射随实体宽度变化，外层漫反射始终向外扩展 5 DIP。
- **笔锋、线帽和转角**。激光笔没有额外的收尖笔锋。相邻采样点以变半径圆胶囊连接，端头和转角呈圆形。恒宽 SVG 可用 `stroke-linecap="round"` 和 `stroke-linejoin="round"`。
- **笔尖光点**。鼠标和压感笔在悬停时显示同材质的圆形光点，实体直径使用当前档位，默认 5 DIP，光点整体 opacity 为 1。落笔接触期间隐藏这枚独立光点。触摸则在活动触点处另外绘制同材质的光点，实体直径固定 **5 DIP**，整体 opacity 为 1，随触点移动。当前产品强制关闭激光粒子。

### 依据

- 默认色和粗细：[ `IdtState.h` 第 73–85 行](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/IdtState.h:73)、[ `PenWidthPolicy.hpp`，`PresetDip`](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/Business/PenWidthPolicy.hpp:54)。
- 材质和主题输入：[ `Draw3.RendererLaser.cpp`，`ConfigureLaserStyle`](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/Drawing/Draw3/Draw3.RendererLaser.cpp:37)、[ `Draw3.Renderer.cppm` 第 30–50 行](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/Drawing/Draw3/Draw3.Renderer.cppm:30)、[ `Draw3.DrawingController.cpp`，`ConfigureLaserRendererStyle`](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/Drawing/Draw3/Draw3.DrawingController.cpp:387)。材质配置读取目标 DPI 和用户笔色，未读取软件主题。
- 宽度和笔锋：[ `Draw3.DrawingController.cpp` 第 17117–17131 行](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/Drawing/Draw3/Draw3.DrawingController.cpp:17117)、[第 22485–22501 行](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/Drawing/Draw3/Draw3.DrawingController.cpp:22485)、[ `Draw3.StrokeGeometry.cpp`，`StrokeWidthEstimator::Append` 和 `AppendLaserPressure`](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/Drawing/Draw3/Draw3.StrokeGeometry.cpp:506)、[ `Draw3.InkPrediction.cpp`，`CreateStrokeModelConfiguration` 和 `LaserPressureDiameter`](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/Drawing/Draw3/Draw3.InkPrediction.cpp:203)、[ `inkPixelShader.hlsl`，`GetInkDist_Convex`](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/Drawing/Draw3/Assets/inkPixelShader.hlsl:34)。
- 光点和粒子：[ `Draw3.PenCursor.cpp`，`ResolveLaserDrawingCursorVisual`](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/Drawing/Draw3/Draw3.PenCursor.cpp:440)、[ `Draw3.DrawingController.cpp` 第 452–463 行](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/Drawing/Draw3/Draw3.DrawingController.cpp:452)、[第 18749–18765 行](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/Drawing/Draw3/Draw3.DrawingController.cpp:18749)、[`SetLaserParticlesEnabled`](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/Drawing/Draw3/Draw3.DrawingController.cpp:15195)。混合和调色板见第 3、4 节依据。

## 2. 生命周期

### 结论

| 事件 | 真实行为 |
|---|---|
| 最后一支激光笔抬起 | 从最后一个激光接触结束时开始计时。先满亮 **1.0 秒**，再淡出 **0.8 秒**，默认在抬笔后 **1.8 秒**到期。 |
| 下一道激光笔落笔 | 如果旧笔迹还在 Hold 或 Fade，保留旧笔迹，整批立即恢复满亮。新一轮计时从所有激光接触再次结束时开始。已到期清除的笔迹不会恢复。 |
| 切到别的工具 | 绘制线程应用工具切换时清空激光临时层并请求全帧重绘。**额外延时 0 秒**。 |
| 切到软笔后在别处落笔 | 清除发生在**切换工具时**。软笔落笔无需触发清除，也不会与剩余激光淡出重叠。 |
| 翻页 | 放映页切换时清空激光临时层和计时状态。**额外延时 0 秒**。翻回原页也不会恢复。 |

连续画多道时，仍在屏幕上的笔迹**共用一个计时器**。同时有多个激光接触时，必须等最后一个结束。自然淡出时，已经合成的整批笔迹一起降低不透明度，**路径长度、宽度和光晕范围都保持固定**。白芯、实体壳和光晕同步变淡。

设 `s` 为最后一次抬笔后的秒数，`t = clamp((s − 1.0) / 0.8, 0, 1)`，整组透明度为 **`1 − t²(3 − 2t)`**。淡出期间应给已经合成的整组统一设置 `opacity`。激光笔迹是临时画布层，**不进入撤销历史、不保存到放映页墨迹**。

### 依据

- 计时和缓动：[ `Draw3.InkPrediction.cpp`，`BeginLaserContact`、`EndLaserContact`、`EvaluateLaserTrailOpacity`](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/Drawing/Draw3/Draw3.InkPrediction.cpp:22)、[ `Draw3.InkPrediction.cppm` 第 110 行](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/Drawing/Draw3/Draw3.InkPrediction.cppm:110)及[第 239 行](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/Drawing/Draw3/Draw3.InkPrediction.cppm:239)。
- 连写和整组淡出：[ `Draw3.DrawingController.cpp` 第 17655–17711 行](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/Drawing/Draw3/Draw3.DrawingController.cpp:17655)、[第 22351–22365 行](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/Drawing/Draw3/Draw3.DrawingController.cpp:22351)、[第 22766–22775 行](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/Drawing/Draw3/Draw3.DrawingController.cpp:22766)、[ `inkPixelShader.hlsl` 第 453–460 行](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/Drawing/Draw3/Assets/inkPixelShader.hlsl:453)。着色器直接对已合成的预乘 RGBA 乘统一透明度。
- 工具切换：[ `Bar.Interaction.cpp` 第 8300 行](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/UI/Bar/Bar.Interaction.cpp:8300)、[ `IdtState.cpp`，`ChangeStateModeToPenTool`](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/IdtState.cpp:2450)、[ `Draw3.WindowControl.cpp`，`SetActiveTool`](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/Drawing/Draw3/Draw3.WindowControl.cpp:1160)、[ `Draw3.DrawingController.cpp`，`synchronizeLaserResources`](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/Drawing/Draw3/Draw3.DrawingController.cpp:18257)。
- 放映翻页和历史：[ `Draw3.DrawingController.cpp` 第 20793–20797 行](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/Drawing/Draw3/Draw3.DrawingController.cpp:20793) 的放映页安装调用进入 [`restoreAfterDocumentSlotSwitch`](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/Drawing/Draw3/Draw3.DrawingController.cpp:19304)，再由 [`resetGpuForPageSwitch`](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/Drawing/Draw3/Draw3.DrawingController.cpp:19232) 清空临时层。正常收笔时，激光分支在[第 22830–22855 行](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/Drawing/Draw3/Draw3.DrawingController.cpp:22830)跳过文档和撤销历史的提交。

## 3. 选择激光笔的界面

### 结论

放映时使用 Inkeys 主栏的 **`Draw`** 按钮。若当前还没进入绘制模式，第一次点击进入绘制模式，再点击同一个笔按钮打开绘制属性面板。直接点面板里的 **`Laser Pen`**。它在笔型列第二行，位于 `Brush` 下、`Highlighter` 上。选中后，主栏同一个按钮的图标为 **`barLaser`**，en-US 文案为 **`Laser`**。面板项目的文案仍是 **`Laser Pen`**。

放映工作区内，激光笔和软笔**各自记忆颜色**。激光笔读取 `Pen.Laser.color`，软笔读取 `Pen.Brush1.color`。从共用调色板或自定义取色器改色时，只更新当前笔型对应的颜色槽。两者初始都为 `#FF1000`。

### 依据

- 按钮和文案：[ `Bar.Button.cpp` 第 326–362 行](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/UI/Bar/Bar.Button.cpp:326)、[ `Bar.Initialization.cpp` 第 693–706 行](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/UI/Bar/Bar.Initialization.cpp:693)、[ `Bar.Interaction.cpp` 第 8208–8231 行](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/UI/Bar/Bar.Interaction.cpp:8208)、[ `Bar.MainContent.cpp`，`ResolveDrawStyle`](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/UI/Bar/Bar.MainContent.cpp:109)、[ `en-US.jsonc` 主栏文案](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/src/i18n/en-US.jsonc:77)及[面板文案](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/src/i18n/en-US.jsonc:128)、[ `barLaser.svg`](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/src/UI/barLaser.svg:1)。
- 共用取色入口和独立记忆：[ `Bar.Interaction.cpp` 第 5103–5104 行](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/UI/Bar/Bar.Interaction.cpp:5103)及[第 7909–7915 行](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/UI/Bar/Bar.Interaction.cpp:7909)、[ `IdtState.cpp`，`ProjectSharedStyles`](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/IdtState.cpp:61)、[`SetPenColorImpl`](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/IdtState.cpp:2027)及[`GetPenColor`](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/IdtState.cpp:2096)。

## 4. 重画所需的公式

### 结论

原实现用像素着色器计算到变半径圆胶囊的距离。光晕使用第 1 节的平方衰减。下面是一组供 Remotion 使用的 SVG **近似参数**，按 `1 DIP = 1 CSS px` 给出。`D` 取实际实体直径，默认基准为 5。表中的 `stdDeviation` 是 SVG 近似值。

| 层 | SVG 描边宽度 | Alpha | `feGaussianBlur` 的 `stdDeviation` |
|---|---|---|---:|
| 漫反射 | 10 条同心描边。`k = 1…10`，宽 `D + k DIP`，默认相当于 `1.2D…3D` | 用这些描边构造 alpha mask。令 `aₖ = (1 − (k − 0.5)/10)²`、`a₁₁ = 0`，从宽到窄绘制，每条 opacity 为 `(aₖ − aₖ₊₁)/(1 − aₖ₊₁)`。用该 mask 裁切壳色 `C` 与提亮色的合成结果 | `0.15 DIP`，对整张 alpha mask 模糊一次 |
| 漫反射高光 | `D + 5.05 DIP`，默认约 `2.01D`。只保留实体壳外侧 | 用此遮罩以最高 `0.72` 的权重将漫反射 RGB 从 `C` 混向 `E`。沿用漫反射 alpha | `0.16 DIP` |
| 实体壳 | `1.0D`，默认 5 DIP | `0.98` | `0` |
| 内散射 | 外宽 `7D/15`，默认约 2.333 DIP。用宽 `D/5` 的描边挖去中心 | `0.94` | `0` |
| 白芯 | `D/3`，默认约 1.667 DIP | `1.0` | `0` |

恒宽时所有描边使用同一路径和圆形线帽、转角。需要表现压感变化时，沿路径用每处的 `D` 构造轮廓，漫反射仍固定向外延伸。圆圈自交处先合并同一笔的几何覆盖，再合成材质。自然淡出时给外层 `<g>` 应用第 2 节的透明度公式，切到软笔或翻页时移除整组。

### 依据

- 尺寸、色值和阈值来自 [ `Draw3.RendererLaser.cpp`，`InkRenderer::ConfigureLaserStyle`](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/Drawing/Draw3/Draw3.RendererLaser.cpp:37)。原始覆盖率和材质公式位于 [ `inkPixelShader.hlsl`，`LaserAaCoverage`、`LaserDiffuseCoverage`、`GetLaserStrokeCoverage`、`ResolveLaserMaterial`](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/Drawing/Draw3/Assets/inkPixelShader.hlsl:253)。SVG 的十档遮罩由平方曲线等距采样推导。
- 同笔覆盖取最大值和预乘合成见 [ `Draw3.Renderer.cpp` 第 689–710 行](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/Drawing/Draw3/Draw3.Renderer.cpp:689)及[ `inkPixelShader.hlsl` 第 439–459 行](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/Drawing/Draw3/Assets/inkPixelShader.hlsl:439)。

## 不确定或未找到的事项

- **原生高斯模糊半径未找到**。源码给的是 5 DIP 的固定漫反射范围、平方衰减和基于 `fwidth` 的边缘抗锯齿。SVG 表中的两个 `stdDeviation` 是为近似该材质选取的值，未做截图比对。[ `inkPixelShader.hlsl`，`LaserAaCoverage` 和 `LaserDiffuseCoverage`](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/Drawing/Draw3/Assets/inkPixelShader.hlsl:253)
- **工具切换或翻页到屏幕刷新的固定毫秒数未找到**。代码在处理边界时清除并触发重绘，表中的 0 秒指没有额外定时等待。[ `Draw3.DrawingController.cpp`，`synchronizeLaserResources`](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/Drawing/Draw3/Draw3.DrawingController.cpp:18257)及[`resetGpuForPageSwitch`](D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/Drawing/Draw3/Draw3.DrawingController.cpp:19232)

本次仅作静态调查，未修改文件、构建、运行 Inkeys、执行 GUI 验证或进行 Git 写操作。