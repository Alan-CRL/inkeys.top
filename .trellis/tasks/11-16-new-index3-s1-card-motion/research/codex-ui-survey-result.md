调查基准：`dev`，HEAD 为 `c06697b1ab2ba01800edf677b4fb46d4d0e2de61`。本次仅阅读文件，未修改文件、未构建、未启动 Inkeys 或 GUI。依据：`.git/HEAD`、`.git/refs/heads/dev`。

以下尺寸均先给源码中的 DIP／逻辑单位。路径缩写：

- `Bar/`＝`Inkeys/Inkeys/UI/Bar/`
- `Draw3/`＝`Inkeys/Inkeys/Drawing/Draw3/`
- 官网路径以 `D:/Project/Inkeys/website/` 为根。

## 1. 主栏（合并式，en-US）

**结论：截图中的九个按钮顺序仍成立，但有状态条件。**在桌面工作区、合并式、软笔选中、Undo 可用且 Redo 不可用、未启用额外组件的情况下，从左到右为：

`Select → Soft Pen → Shapes → Erase → Undo → Clear → More → Board → Freeze`

A1 与 More 之间、More 与 A2 之间各有一条分隔线。合并式不额外显示 `Click-through`。〔1a〕

这不是所有状态下固定不变的栏：未选笔时第二项文案为 `Draw`；擦除选中后为 `Area Erase`；图形选中后显示具体图形名称；Undo／Redo 会按历史状态换位或上下叠放。空页选择态还会隐藏部分工具。〔1a、1b〕

**几何与排版**

| 项目 | 当前取值 |
|---|---|
| 左侧主按钮 | `80×80 DIP`；超椭圆，展开时指数 `n=10`，折叠时 `n=3`，不能用固定圆角半径准确替代 |
| 主按钮内部图标 | `logo1.svg`，显示盒高 `80 DIP`，原始 SVG 为 `256×256` |
| 主按钮与主栏间距 | `10 DIP` |
| 上述九按钮状态的主栏主体 | **由布局公式计算为 `680×80 DIP`**；连同左侧主按钮总宽 `770 DIP`，不含描边和光影外扩 |
| 普通大按钮 | `70×70 DIP`，圆角 `4 DIP` |
| 按钮间距／主栏内边距 | 均为 `5 DIP` |
| 九个按钮左边界 | 相对主栏主体为 `5、80、155、230、305、380、455、530、605 DIP` |
| 普通大按钮图标 | `28×28 DIP`，中心相对按钮中心向上 `10 DIP` |
| `More` 图标 | 大按钮状态使用 `34 DIP`；选中的具体图形图标也可用 `34 DIP` |
| 大按钮文字 | 标称 `13 DIP`；文字槽 `70×25 DIP`，中心相对按钮中心向下 `20 DIP` |
| 上下叠放的小按钮 | `70×32.5 DIP`；图标 `18 DIP`，文字 `12 DIP` |
| 分隔线 | `1×50 DIP`，圆角 `0.5 DIP`，填充不透明度 `0.30`，不额外增加列宽 |
| 主栏外框 | 圆角 `8 DIP`，描边 `1 DIP` |
| en-US 字体 | `HarmonyOS Sans SC`，内置 `HarmonyOS_Sans_SC_Regular.ttf` |

以上依据见〔1c、1d〕。`680` 和 `770` 是针对上述状态按实际按钮布局求得，不能套用 `Bar.Metrics.cppm` 中旧的 `380／470` 默认布局常量。

缩放规则是 `zoom = uiBaseZoom × configZoom`，配置缩放限制为 `0.50～2.00`，按百分之一取整。`uiBaseZoom` 可选：

- `Dpi`：`effectiveDpi / 96`；
- `TaskbarBasic`：`48 / 80 × dpiScale`；
- `TaskbarActual`：任务栏实际像素厚度 `/80`，缺少数据时回退。

几何、图标和字号随该比例缩放；文字最终还受“是否允许小数字号”的设备像素修正影响，默认修正策略会将静止目标字号向下取整到物理像素。〔1e〕

**主题取值：以下为展开、正常显示、背景跟随主题、内容透明度 `100%` 的情况。**

| 项目 | 浅色 | 深色 |
|---|---|---|
| 主栏／展开主按钮底色 | `#FBFBFB` | `#181818` |
| 底色不透明度 | **`0.92`**＝`0.80×1.15` | `0.80` |
| 普通文字 | `#1A1A1A` | `#FFFFFF` |
| 普通图标 | `#2B2B2B` | `#FFFFFF` |
| 选中文字、图标、强调色 | **`#006A63`** | **`#58FFEC`** |
| 选中底色 | `#006A63`，不透明度 `0.10` | `#58FFEC`，不透明度 `0.20` |
| 选中且按下的底色 | 同选中色，不透明度 `0.05` | 同选中色，不透明度 `0.10` |
| 非选中按下底色 | `#BCBCBC`，不透明度 `0.10` | `#7F7F7F`，不透明度 `0.10` |
| 悬停底色 | `#BCBCBC`，目标不透明度 `0.18` | `#7F7F7F`，目标不透明度 `0.18` |
| 禁用内容不透明度 | `0.45` | `0.30` |
| 外框 | `#8B8B8B`，不透明度 `0.18` | `#FFFFFF`，不透明度 `0.18` |
| 分隔线 | `#A7A7A7`，不透明度 `0.30` | `#FFFFFF`，不透明度 `0.30` |
| 中性边缘光基色 | `#3A3A3A` | 外框色 `#FFFFFF` |

依据：〔1f〕。源码部分注释仍写浅色默认 `0.88`，但当前执行公式得到的是 **`0.92`**。

常驻背景可由 `BackgroundOpacity` 覆盖；`0` 表示跟随主题。文字、图标再乘 `ContentOpacity`。闲置淡化策略的背景／内容上限分别为 `0.30／0.60`，因此不能将上表作为所有时刻的实际 alpha。〔1f〕

**光影和红色边缘指示**

- 浅色有黑色 ambient 阴影：材质不透明度 `0.08`、半径 `6 DIP`、向下 `2 DIP`，用八层轮廓带近似。实际阴影 alpha 再乘对象 `pct`；展开主体 `pct=0.8` 时，该系数为 `0.064`。深色该静态阴影为 `0`，两主题 key shadow 和顶部高光均为 `0`。〔1g〕
- 边缘光分主光与鼠标光：深色基础半径 `480／240 DIP`，浅色缩为 `360／200 DIP`；基础强度 `1.0`，浅色鼠标光强度再乘 `0.85`。基础边框柔光不透明度深／浅为 `0.30／0.08`，笔色柔光为 `0.20／0.06`。〔1g〕
- **红色来自当前笔色，不是 Freeze 警示色。**Pen／Shape 状态使用笔色光；Shape 使用普通笔颜色。主光锚点跟随 Select、Draw、Eraser、Geometry、Pierce 工具切换。浅色遇到低对比笔色时，仅修正边缘光显示色至对表面至少 `2:1`，不改真实墨迹 RGB。光照可由配置关闭。〔1h〕

**图标来源与动画**

主栏图标是 SVG 文件，经资源加载、`lunasvg` 解析后栅格化缓存。可以直接取得 SVG 的路径数据重画；需要处理源码的颜色占位符：

- `rgba(10,0,7,0)` → 第一主题色；
- `rgba(9,0,2,0)` → 第二主题色。

主要资源为 `Inkeys/src/UI/barSelect.svg`、`barBrush1.svg`、`barBrush2.svg`、`barHighlighter1.svg`、`barGeometry.svg`、`barEraser.svg`、`barRecall.svg`、`barClean.svg`、`barMore.svg`、`barWhiteboard.svg`、`barFreeze.svg`、`logo1.svg`。〔1i〕

| 动作 | 默认动画 |
|---|---|
| 普通按钮按下 | 缩至 `0.95`，`0.4s`，`EaseOutCubic` |
| 松开／拖出 | 回到 `1.0`，`0.4s`，`EaseOutBack` |
| 悬停进入／离开 | `0.24s`，`EaseOutSine` |
| 图标、文字换内容 | 默认 `0.4s`；前半缩至 `0.8` 并淡出，中点换内容，后半回弹并淡入 |
| 换内容前半曲线 | 缩放 `EaseInCubic`，透明度 `EaseInSine` |
| 换内容后半曲线 | 缩放 `EaseOutBack`，透明度 `EaseOutSine` |
| 左侧主按钮有效点击 | 松手后脉冲至 `1.05`，再回原尺寸；默认 `0.4s`，`EaseOutBack／EaseInBack`；底部停靠时固定尺寸 |
| 主光锚点移动 | 默认 `0.4s`，`EaseInOutCubic` |

**选中底色没有一块跨按钮滑动的共享底板。**每个按钮自己的背景独立改变颜色和透明度；跨工具移动的是主光锚点。换笔色光通常按 `0.4s / EaseInOutCubic` 过渡。切换是否使用笔色光时，光先淡出、中点透明、再淡入，颜色变化压在时间轴 `35%～65%`。全局动画开关、速度倍率会影响上述过程。〔1j〕

**依据**

- 〔1a〕[Other.Config.cppm:242](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/Other/Other.Config.cppm:242)：默认 A1／A2 顺序；[Bar.Button.cpp:995](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/UI/Bar/Bar.Button.cpp:995)：运行时投影；[Bar.A2.h:46](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/UI/Bar/Bar.A2.h:46)：合并式显隐及 Board／Freeze 大小；[en-US.jsonc:71](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/src/i18n/en-US.jsonc:71)：全部主栏文案。
- 〔1b〕`Bar/Bar.Button.cpp`：`UpdateDrawButtonStyle`、`UpdateEraserButtonStyle`、`UpdateGeometryButtonStyle`；[Bar.RecallChrome.cppm:139](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/UI/Bar/Bar.RecallChrome.cppm:139)：Undo／Redo 显隐、尺寸。
- 〔1c〕[Bar.Metrics.cppm:6](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/UI/Bar/Bar.Metrics.cppm:6)、`:200`：尺寸及内容几何；[Bar.Button.cpp:2745](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/UI/Bar/Bar.Button.cpp:2745)：实际布局公式；[Bar.RenderLoop.cpp:2743](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/UI/Bar/Bar.RenderLoop.cpp:2743)：`34 DIP` 图标例外。
- 〔1d〕[Bar.Initialization.cpp:347](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/UI/Bar/Bar.Initialization.cpp:347)、[Bar.RenderLoop.cpp:1711](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/UI/Bar/Bar.RenderLoop.cpp:1711)：主按钮／主栏；[IdtI18nLocales.h:25](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/IdtI18nLocales.h:25)、[Inkeys.rc:128](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys.rc:128)：字体绑定。
- 〔1e〕[Bar.Zoom.cppm:17](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/UI/Bar/Bar.Zoom.cppm:17)、`:72`；[Display.cpp:1372](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/Display/Display.cpp:1372)；[Bar.FontSize.h:7](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/UI/Bar/Bar.FontSize.h:7)。
- 〔1f〕[Bar.ThemeMaterial.h:41](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/UI/Bar/Bar.ThemeMaterial.h:41)、`:77`；[Bar.Theme.cppm:96](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/UI/Bar/Bar.Theme.cppm:96)；[Bar.Button.cpp:2077](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/UI/Bar/Bar.Button.cpp:2077)；[Bar.Rendering.cpp:2863](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/UI/Bar/Bar.Rendering.cpp:2863)。
- 〔1g〕[Bar.ThemeMaterial.h:144](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/UI/Bar/Bar.ThemeMaterial.h:144)、`:189`；[Bar.Rendering.cppm:29](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/UI/Bar/Bar.Rendering.cppm:29)；[Bar.Rendering.cpp:2724](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/UI/Bar/Bar.Rendering.cpp:2724)。
- 〔1h〕[Bar.Rendering.cpp:789](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/UI/Bar/Bar.Rendering.cpp:789)；[Bar.ThemeMaterial.h:264](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/UI/Bar/Bar.ThemeMaterial.h:264)。
- 〔1i〕[Inkeys.rc:265](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys.rc:265)；[Bar.UI.cpp:490](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/UI/Bar/Bar.UI.cpp:490)。
- 〔1j〕[Bar.Animation.cppm:446](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/UI/Bar/Bar.Animation.cppm:446)；[Bar.Button.cpp:1948](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/UI/Bar/Bar.Button.cpp:1948)、`:2077`；[Bar.UI.cpp:251](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/UI/Bar/Bar.UI.cpp:251)、`:317`；[Bar.RenderLoop.cpp:1681](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/UI/Bar/Bar.RenderLoop.cpp:1681)；`Bar/Bar.Rendering.cpp:868、971、1040`。

## 2. 笔型在主栏上的显示

**结论：当前可选择的实际笔工具有软笔、硬笔、荧光笔和激光笔；Brush 是显示出来的禁用项。**

| 工具 | 属性面板 en-US | 该工具选中时的主栏文案 | 主栏资源 |
|---|---|---|---|
| 软笔 | `Soft Pen` | `Soft Pen` | `barBrush2` |
| 硬笔 | `Hard Pen` | `Hard Pen` | `barBrush1` |
| 荧光笔 | `Highlighter` | **`Highlight`** | `barHighlighter1` |
| 激光笔 | `Laser Pen` | `Laser` | `barLaser` |
| 刷子 | `Brush` | 未找到可进入的选中态 | `barPaintBrush`，面板禁用 |

不处于 Pen 选中态时，主栏文字统一变为 `Draw`，图标仍按记忆的笔型选择。历史枚举别名容易误读：`IdtPenBrush1` 是软笔，`IdtPenBrush2` 是硬笔；它们与 SVG 文件编号不是同一语义。〔2a〕

**左侧主按钮不随笔型更换轮廓图标**，始终使用 `logo1.svg`。它随当前工具读取不同颜色槽：

- 普通软／硬笔：`Brush`；
- 荧光笔：`Highlighter`；
- 激光笔：`Laser`；
- 图形：强制使用 `Brush`。

浅色绘制态将真实笔色填入整支笔；深色保留白色笔身，以笔尖、笔身渐变指示当前颜色。浅色屏幕衬底为黑色 `0.09`，深色为白色 `0.22`；浅色低对比笔色可添加最高 `0.55` 的外轮廓。〔2b〕

**切换荧光笔的路径：**

1. 点主栏笔按钮；若当前尚未选笔，第一击先切到 Pen。
2. 在 Pen 已选中时再次点击，展开绘制属性面板。
3. 点击面板右侧列表的 `Highlighter`，松手命中后选择该工具。

面板展开尺寸为 `370×185 DIP`，与主栏相隔 `10 DIP`，按可用空间显示在上方或下方。左部是调色板及粗细控制，右部是纵向笔型列表：`Brush`、`Laser Pen`、`Highlighter`、`Hard Pen`、`Soft Pen`；列表按钮约 `115×30 DIP`，纵向步进 `35 DIP`。〔2c〕

**依据**

- 〔2a〕[Bar.Button.cpp:1217](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/UI/Bar/Bar.Button.cpp:1217)；[en-US.jsonc:125](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/src/i18n/en-US.jsonc:125)；[Bar.RenderLoop.cpp:3559](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/UI/Bar/Bar.RenderLoop.cpp:3559)：Brush 的 `enabled=false`；[IdtState.h:30](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/IdtState.h:30)：枚举别名。
- 〔2b〕[Bar.RenderLoop.cpp:1649](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/UI/Bar/Bar.RenderLoop.cpp:1649)；[Bar.LogoAppearance.h:19](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/UI/Bar/Bar.LogoAppearance.h:19)、`:32`、`:61`。
- 〔2c〕[Bar.Button.cpp:322](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/UI/Bar/Bar.Button.cpp:322)；[Bar.Interaction.cpp:8325](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/UI/Bar/Bar.Interaction.cpp:8325)；`Bar/Bar.Layout.cppm:35`、`Bar/Bar.Main.cpp:67–85`、`Bar/Bar.RenderLoop.cpp:3079、3559、3594`。

## 3. 定格（Freeze）

**结论：文案为 `Freeze`，图标为雪花形 SVG `barFreeze.svg`。激活后套用普通按钮 Selected 外观：**

- 浅色：`#006A63` 图标／文字，`#006A63`、`0.10` 的选中底；
- 深色：`#58FFEC` 图标／文字，`#58FFEC`、`0.20` 的选中底。

未找到激活后替换图标或改写文字的逻辑。〔3a〕

Freeze 是独立状态，可以与软笔或荧光笔选中态同时存在，因此可能同时看到两个选中按钮。进入 PPT 或白板会解除 Freeze 并使其不可用；这些工作区不显示桌面的 Freeze 按钮。〔3b〕

**普通 Freeze 生效后的额外边框、角标、提示条：未找到。**

已找到的是保持原颜色的定格画面：Magnifier 使用 `1×` 变换及恒等颜色矩阵，没有加色效果。另有 `FreezeRecall > 0` 时显示的“超级恢复”提示条，但属于恢复流程，不能当成普通 Freeze 的提示。〔3c〕

**依据**

- 〔3a〕[Bar.Button.cpp:653](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/UI/Bar/Bar.Button.cpp:653)、`:1045`；[barFreeze.svg:1](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/src/UI/barFreeze.svg:1)；激活色由 `RetargetBarFixedButtonVisual` 统一生成。
- 〔3b〕[Freeze.cppm:19](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/UI/Freeze/Freeze.cppm:19)、`:65`、`:128`；[Bar.A2.h:46](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/UI/Bar/Bar.A2.h:46)；[IdtState.cpp:2253](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/IdtState.cpp:2253)：按钮切换流程。
- 〔3c〕[IdtMagnification.cpp:287](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/IdtMagnification.cpp:287)；[IdtFreezeFrame.cpp:198](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/IdtFreezeFrame.cpp:198)：额外提示绘制受 `FreezeRecall` 控制。

## 4. 墨迹外观

**结论：桌面软笔默认红色确为 `#FF1000`；荧光笔默认不是黄色，而是 `#FF1ECF`，最终合成不透明度固定为 `0.35`。**

### 软笔

| 项目 | 当前规则 |
|---|---|
| 桌面默认颜色 | `RGBA(255,16,0,255)`，即 `#FF1000` |
| 普通笔最终不透明度 | `1.0` |
| 普通设备默认基准宽度 | 中档 `3 DIP`；细／中／粗为 `1／3／6 DIP` |
| 大屏模式默认宽度 | 中档为 `4×contentScale/systemScale DIP`；三档基数 `2／4／6` |
| `contentScale` | `min(max(pixelWidth,pixelHeight)/1920, min(pixelWidth,pixelHeight)/1080)` |
| 实际画布宽度 | DIP 宽度乘 `effectiveDpi/96` |
| 默认宽度来源 | 鼠标、触摸为模拟压感；笔设备优先硬件压感，Down 压力无效时回退模拟压感 |

这些是初始默认值，后续状态和用户记忆可覆盖；深色白板还另有白色普通笔默认槽。〔4a〕

模拟压感规则：

- 基准直径记为 `B`，慢速目标为 `1.4B`，高速目标为 `0.8B`。
- `expectedSpeed = 500×dpiScale` 像素／秒。
- `u=clamp(speed/expectedSpeed,0,1)`，`s=u²(3−2u)`，目标直径为 `lerp(1.4B,0.8B,s)`。
- 宽度以 `60ms` 时间常数低通，alpha 限制在 `0.02～0.35`。
- 半径变化同时受时间、距离限制：每秒最多 `1.5B`，每像素最多 `0.35`。
- 起笔先保持基准宽度，再追随速度；**未找到独立“从零变粗”的起笔 taper 或起笔时长**。〔4b〕

硬件压感直径为：

`B × (0.2 + 1.2×clamp(pressure,0,1))`

即 `0.2B～1.4B`，同样经过半径变化限制；硬件压感普通笔不额外叠加实时 taper。〔4c〕

收笔／实时尾锋规则：

- 当前 Normal 尾锋窗口为 **`0.055s`，即 `55ms`**。
- 尾锋只作用于最近时间窗口的派生几何；停止运动后，有效长度按 `1−smoothstep(age/0.055)` 缩短。
- 尖端比例为 `1−0.7×smoothstep(effectiveLength/(4×referenceRadius))`，最低到参考半径的 `30%`，不是缩成数学零点。
- 沿尾段弧长平滑过渡；再按半径／距离斜率 `0.95` 做公切线安全投影。
- 完成笔划也调用这套 taper；预测点不进入持久笔划。`55ms` 是几何时间窗口，不代表 Up 后固定再播放一段 `55ms` 动画。〔4d〕

### 荧光笔

| 项目 | 当前取值 |
|---|---|
| 默认颜色 | `RGBA(255,30,207,255)`，即 `#FF1ECF` |
| 最终合成不透明度 | **`0.35`** |
| 默认基准高度 | 中档 `24 DIP`；细／中／粗为 `16／24／36 DIP` |
| 宽度变化 | 固定宽度，不使用软笔 taper |
| 笔尖／端点 | 固定方向的竖直矩形笔尖 sweep，**方头**；矩形高宽比 `8:1` |
| 单笔自交／段间重叠 | 覆盖率 `MAX`／保留率 `MIN`，不会逐段反复加深 |
| 多次抬笔后重画重叠 | 按笔划依次合成，会加深；两次完整 `0.35` 覆盖的合成 alpha 按公式为 `0.5775` |

依据：〔4e〕。矩形笔尖意味着垂直运动时的可见横向宽度与横向书写的带高不同，不能用任意方向等宽的圆头线代替。

### 默认调色板

按 `ColorSelect1～ColorSelect11` 顺序：

`#FFFFFF`、`#000000`、`#FF8B00`、`#321EB5`、`#FFC510`、`#FF1000`、`#4EA1B7`、`#326ED9`、`#66D552`、`#306C00`、`#FF1ECF`。

默认 alpha 为 `255`。第十二格是自定义颜色入口，未找到第十二个固定预设色。〔4f〕

### 书写光标 PenIcon

**PenIcon 是 HLSL 直接绘制的五边形，不是 SVG、字体或位图。**

- 显示盒 `24×24 DIP`，笔尖位于左上角热点，笔身向右下延伸。
- 归一化顶点为 `(0,0)`、`(1/3,1/12)`、`(1,3/4)`、`(3/4,1)`、`(1/12,1/3)`。
- 除笔尖外，圆角在 `24 DIP` 时为 `3 DIP`。
- 填充随所选笔色。普通 Pen 样式默认整体不透明度 `50%`，描边 `0.5 DIP`、颜色 `#B8B8B8`。
- HighlightPen 默认填充不透明度 `50%`，主体／描边不透明度为 `1`，描边 `1.25 DIP`，另有 `1` 物理像素外边；高亮边颜色分量为 `0.96`。
- PenIcon 并非默认鼠标样式：当前设备默认分别为鼠标 `Arrow`、触摸 `None`、屏幕笔 `Dot`、数位板 `HighlightDot`。
- 荧光笔保留矩形光标，不套软／硬笔的 PenIcon 样式。〔4g〕

**依据**

- 〔4a〕[IdtState.h:70](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/IdtState.h:70)；[PenWidthPolicy.hpp:13](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/Business/PenWidthPolicy.hpp:13)、`:54`；[IdtState.cpp:53](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/IdtState.cpp:53)、`:2122`；`Draw3/Draw3.InkPrediction.cppm:43`。
- 〔4b〕[Draw3.StrokeGeometry.cpp:247](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/Drawing/Draw3/Draw3.StrokeGeometry.cpp:247)、`:333`、`:498`；[Draw3.InkPrediction.cpp:210](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/Drawing/Draw3/Draw3.InkPrediction.cpp:210)。
- 〔4c〕[Draw3.InkPrediction.cpp:266](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/Drawing/Draw3/Draw3.InkPrediction.cpp:266)、`:322`；`Draw3/Draw3.StrokeGeometry.cpp:535`。
- 〔4d〕[Draw3.StrokeGeometry.cpp:385](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/Drawing/Draw3/Draw3.StrokeGeometry.cpp:385)、`:453`、`:874`、`:890`；`Draw3/Draw3.InkPrediction.cppm:77`。
- 〔4e〕[Draw3.Bridge.h:25](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/Drawing/Draw3/Draw3.Bridge.h:25)；[Draw3.StrokeGeometry.cpp:586](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/Drawing/Draw3/Draw3.StrokeGeometry.cpp:586)；[inkPixelShader.hlsl:76](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/Drawing/Draw3/Assets/inkPixelShader.hlsl:76)；`Draw3/Draw3.Renderer.cpp:670–696`、`Draw3/Draw3.RendererPrimitives.cpp:115–148`、`Draw3/Draw3.InkHistoryGpu.cpp:757–781`。
- 〔4f〕[Bar.Theme.cppm:210](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/UI/Bar/Bar.Theme.cppm:210)；`Bar/Bar.Initialization.cpp:582–618`：自定义格。
- 〔4g〕[inkPixelShader.hlsl:143](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/Drawing/Draw3/Assets/inkPixelShader.hlsl:143)；[Draw3.CursorSettings.h:30](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/Drawing/Draw3/Draw3.CursorSettings.h:30)；[Draw3.PenCursor.cpp:30](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/Drawing/Draw3/Draw3.PenCursor.cpp:30)、`:392`；`Draw3/Draw3.RendererPrimitives.cpp:415–428`、`Draw3/Draw3.DrawingController.cpp:425–450`。

## 5. 离屏导出的可行性

**结论：六张静态主栏透明 PNG 可以沿用主题宣传图适配，主要改状态 fixture 和输出编排；真实按时间书写的软笔／荧光笔序列目前没有一条可直接使用的完整适配。**

### 现有管线能导出什么

| 适配 | 已有能力与边界 |
|---|---|
| `inkeys3-theme-promo/native/` | 浅／深主题主栏、PPT 分页、白板分页；输出透明 PNG，并记录实际主题、透明度、按钮文字及主体矩形。只重渲 UI，其他墨迹沿用历史图层 |
| `inkeys3-hero/native/` | 主栏、分页、白板底图、墨迹终帧；自由笔采样经真实 stroke modeler、估宽、`FinalizeStoredStroke`，再按生产重放绘制；另有激光和形状层 |
| `inkeys3-features/native/` 旧路径 | 主栏状态及交互帧、分页动画、白板背景、36 个墨迹进度帧；默认素材为中文、深色、特定演示状态 |
| `FeatureMediaRedesign.inc` | 60fps 主栏／分页交互序列、普通笔迹逐步显现、形状预览到提交、激光生命周期、独立光标 PNG |

依据：〔5a〕。

共同入口为：

`--bar-eraser-offscreen-test → RunEraserAttributeOffscreenTest() → 环境变量分支 → HeroExport::Export / FeatureMedia::Export`

安装器临时插入 include 和入口分支；编排脚本构建已有 solution，再启动专用离屏入口。UI 经 `CreateBarOffscreenRenderCallback` 推进生产主栏渲染；分页使用 `BarPageSurface`；Draw3 使用离屏目标及 GPU staging 读回。预乘 BGRA 转成 PNG straight alpha。安装与还原过程会写文件，因此本次没有执行。〔5b〕

### 六张主栏 PNG 需要改多少

以 `inkeys3-theme-promo/native/` 为基底，所需工作集中在以下范围：

1. **`HeroExport.inc` 的状态 fixture**：目前硬编码 Soft Pen；增加 SoftPen／Highlighter／SoftPen+Freeze 三种状态，分别稳定推进后保存。Freeze 独立于笔状态，第三张可同时保留软笔选中。
2. **`export.py` 的捕获循环和命名**：已有 `light,dark` 循环，再增加三种状态维度。
3. **元数据同步**：当前 `toolbar-body.json` 有硬编码 `"pen":"soft"`、`"mode":"drawing"`、`"pen_rgb":"FF1000"`，必须随 fixture 更新。
4. **统一裁切**：现有输出含透明目标画布；用于 Remotion 时应按统一主体矩形并保留光影余量裁切，保持六张图锚点一致。

生产主栏渲染器、图标资源、主题系统已有所需能力；**静态检查未发现为这六张图修改生产绘制逻辑的必要**。但准确 diff 行数、构建后是否还需适配，未找到可验证结果。〔5c〕

### 60fps 透明墨迹序列的真实支持程度

**已有 60fps PNG 序列输出机制，但现有普通笔迹序列不是按采样时间重放真实输入。**

`FeatureMediaRedesign.inc::exportFree`：

- 固定画布 `1440×720`；
- 每组 `96` 帧，六位帧号；
- 前 `73` 帧按**点数比例**扩大可见前缀，其后保持；
- 每帧调用生产 `DrawStrokeOrDot` 和操作层合成；
- 不经过实时 stroke modeler、预测及软笔实时尾锋；
- 该路径未调用荧光笔专用 `DrawHighlighterPrimitives`。

因此，它支持“生产像素渲染的逐步显现序列”，不足以声称是当前真实软笔／荧光笔按时间书写的录制。〔5d〕

`HeroInk.inc` 已能读取带 `t` 的采样、送入真实 modeler，并处理 Up 和终帧笔锋，但只在整层完成后保存 PNG。若要求真实时间的 60fps 序列，需要在其建模流程中增加显示时间推进、逐帧实时几何／预测处理和保存，同时保留已完成笔划的合成顺序。**当前可直接调用的完整序列入口：未找到。**〔5e〕

### 当前 dev 与历史适配的符号兼容性

历史版本证据：

| 素材 | 记录版本 |
|---|---|
| 主题宣传图 | `5f1fd1b18b38d7bf7e60ab8f8560ecc0af5e2fc6`，`dev` |
| Hero en-US | `718b0ebda84c37361b6bef808592e45c0169fc01` |
| Features redesign | `d060e39bca3673a9cb25da44b7e5a4534e32d038`，`feature/shape` |

依据：〔5f〕。

当前静态核对结果：

- `RunEraserAttributeOffscreenTest`、`CreateBarOffscreenRenderCallback`、`BarPageSurface`、`InitializeUI`、`SetThemeMode`、`SetResidentOpacity`、`MainLayoutSnapshot`、`NoteRecallHistoryAvailability`、`ChangeStateModeToPenTool`、Freeze API **仍在**。
- 主题适配使用的 harness 函数锚点、`Build/eraser-b` 分支锚点、Recall 刷新锚点，目前均各匹配一处。
- Hero 墨迹使用的 `ActiveStroke`、`CreateStrokeModelConfiguration`、`AppendNewModeledPoints`、`ResolvePenModelInputTime`、`AppendEndpointBoundedModeledPoints`、`FinalizeStoredStroke`、`DrawStoredStroke` **仍在**。
- **明确变化：旧 Features 光标适配使用的 `CursorSettings.mouseStyle`、`penStyle`、`MouseCursorStyle::Drawing`、`PenCursorStyle::PenIcon` 在当前源码中未找到。**当前结构使用 `mouse／touch／screenPen／tablet` 和 `CursorStyle`。整套旧 Features 适配不能据此宣称无需修改即可重编译。

以上仅为符号和锚点检查，没有编译兼容性结论。〔5g〕

**依据**

- 〔5a〕[主题宣传图 README:7](/D:/Project/Inkeys/website/media/inkeys3-theme-promo/README.md:7)；[Hero README:14](/D:/Project/Inkeys/website/media/inkeys3-hero/README.md:14)；[Features native README:17](/D:/Project/Inkeys/website/media/inkeys3-features/native/README.md:17)、`:46`。
- 〔5b〕[IdtMain.cpp:2070](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/IdtMain.cpp:2070)；[主题 install.py:62](/D:/Project/Inkeys/website/media/inkeys3-theme-promo/native/install.py:62)；[主题 HeroExport.inc:58](/D:/Project/Inkeys/website/media/inkeys3-theme-promo/native/HeroExport.inc:58)、`:121`；`主题 native/HeroCommon.inc::HeroIo::SavePixels`；[Features README:13](/D:/Project/Inkeys/website/media/inkeys3-features/native/README.md:13)。
- 〔5c〕[主题 HeroExport.inc:28](/D:/Project/Inkeys/website/media/inkeys3-theme-promo/native/HeroExport.inc:28)、`:69`、`:101`、`:118`；[主题 export.py:66](/D:/Project/Inkeys/website/media/inkeys3-theme-promo/native/export.py:66)。
- 〔5d〕[FeatureMediaRedesign.inc:393](/D:/Project/Inkeys/website/media/inkeys3-features/native/FeatureMediaRedesign.inc:393)；[Features README:46](/D:/Project/Inkeys/website/media/inkeys3-features/native/README.md:46)。
- 〔5e〕[HeroInk.inc:10](/D:/Project/Inkeys/website/media/inkeys3-hero/native/HeroInk.inc:10)、`:62`、`:101`。
- 〔5f〕[主题 README:15](/D:/Project/Inkeys/website/media/inkeys3-theme-promo/README.md:15)；[provenance-dev.txt:2](/D:/Project/Inkeys/website/media/inkeys3-hero/sources/en-US/provenance-dev.txt:2)；`media/inkeys3-features/sources-redesign/manifest.json → provenance.revision / sequenceFps`。
- 〔5g〕当前：`Bar/Bar.EraserAttribute.Test.cpp:191–204`、`Bar/Bar.Button.cpp:1748`、`Bar/Bar.Main.cppm:1567`、`Bar/Bar.Scene.cppm:120`、`Draw3/Draw3.InkPrediction.cppm:345、583、685、696、703`。旧光标调用见 [FeatureMediaRedesign.inc:635](/D:/Project/Inkeys/website/media/inkeys3-features/native/FeatureMediaRedesign.inc:635)，当前结构见 [Draw3.CursorSettings.h:30](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/Drawing/Draw3/Draw3.CursorSettings.h:30)。

## 不确定或未找到的事项

- **独立起笔 taper 的时长：未找到。**已找到起笔保持基准宽度、随后追随速度的实现；不能把尾锋 `55ms` 套到起笔。依据：`Draw3/Draw3.StrokeGeometry.cpp::StrokeWidthEstimator::Append`。
- **普通 Freeze 的额外屏幕边框、角标或提示条：未找到。**“超级恢复”条有独立条件。依据：`Inkeys/IdtFreezeFrame.cpp:198–240`。
- **Brush 的可用绘制模式：未找到。**属性列表明确禁用。依据：`Bar/Bar.RenderLoop.cpp:3561–3564`。
- **可直接生成真实时间软笔／荧光笔 60fps 序列的现成入口：未找到。**现有真实 modeler 适配保存终帧，现有序列适配按点数显现。依据：`HeroInk.inc::ExportInkLayers`、`FeatureMediaRedesign.inc::exportFree`。
- **全部旧适配在当前 HEAD 的编译／运行结果：未验证。**遵照本次禁止构建和运行的要求；已确认旧光标 API 存在源码不兼容。
- **源码注释存在滞后：**`Bar.Theme.cppm`／`Bar.ThemeMaterial.h` 部分注释写浅色 `0.88`，实际公式为 `0.92`；`Bar.Metrics.cppm` 的默认三列及 `380／470` 常量不能代表当前九按钮运行时布局。本报告采用执行路径和布局公式。