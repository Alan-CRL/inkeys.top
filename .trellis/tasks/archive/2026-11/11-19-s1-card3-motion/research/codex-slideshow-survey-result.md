# Inkeys 放映外观与行为调查

**分支 `refactoring/drawpad-ui`，HEAD `89617eeeb487a52cc912e8001bbe0dc5b88fd582`。** 软件结论以当前提交为准，离屏适配以官网目录中的现有文件为准。本次仅静态查阅，未修改文件、构建、运行应用或执行 Git 写操作。

下文 `Bar/`、`PageControl/`、`UI3/` 均位于 `Inkeys/Inkeys/UI/`，`Draw3/` 位于 `Inkeys/Inkeys/Drawing/`。尺寸为源码布局 DIP，屏幕边距另行注明。

## 1. 放映时的主栏

**结论**

- 默认大尺寸、展开、合并式、软笔选中、Undo 可用、Redo 不可用时，主体从左到右为 **`Select → Soft Pen → Shapes → Erase → Undo → Clear → More → Board → End show`**。桌面末尾的 `Freeze` 隐藏，原位置显示 `End show`，图标为 `barEndShow.svg`。`Board` 仍在。分离式可在有内容时额外显示 `Click-through`。
- 主体为 **`680 × 80 DIP`**。九列各 `70 × 70 DIP`，内边距和列间距均为 `5 DIP`。计入 `80 × 80 DIP` 主按钮及 `10 DIP` 间距后为 **`770 × 80 DIP`**，描边、光影和状态指示器另计。
- **首次进入放映工作区默认选 `Select`，画布输入穿透。** 此时笔钮显示 `Draw`，记忆笔型为软笔。再次进入可恢复放映工作区上次的工具。`AutoTakeOver` 默认关闭。开启后，检测到宿主原生笔、荧光笔或激光笔，并成功退出宿主工具，才切到对应的 Inkeys 工具。
- 默认 `AutoDockMask = 1`。进入前若已经展开并停靠底部，主栏移到**放映窗口所在屏幕的底部居中**，底边距 `5` 屏幕 DIP，`Direction = 0` 沿用展开方向。浮动或折叠主栏默认保留原布局。退出放映时恢复桌面的停靠、位置、方向和折叠状态。
- 主栏沿用桌面材质。默认展开时，浅色底 **`#FBFBFB / 0.92`**，深色底 **`#181818 / 0.80`**。主栏的放映闲置淡化默认关闭。PowerPoint 和 WPS 共用按钮布局，区别在默认开启的 `Slideshow` 状态指示器。两者的强调色输入分别为 `0xFFC43E1C` 和 `0xFFE8352B`。大尺寸入场胶囊高 `30 DIP`、圆角 `6 DIP`、图标 `18 DIP`、文字 `13 DIP` 粗体，保持 `3.0 s` 后收成 `18 × 18 DIP` 的停靠方块。

**依据**

- 按钮顺序、显隐、历史投影和宽度。`Inkeys/Inkeys/Other/Other.Config.cppm::MakeDefaultFixedButtonsA1`、`MakeDefaultFixedButtonsA2`，`Bar/Bar.A2.cppm::ResolveBarA2Projection`，`Bar/Bar.Button.cpp::ApplyMainPresentationLocked`、`ResolveBarButtonListLayout`，`Bar/Bar.RecallChrome.cppm`，`Bar/Bar.Metrics.cppm`，`Inkeys/src/i18n/en-US.jsonc:73–110`。
- 工具记忆、穿透及自动接管。`Inkeys/IdtState.cpp::RestoreWorkspaceStateModeLocked`、`SyncDrawpadClickThrough`、`ChangeStateModeToPptAnnotation`，`Inkeys/IdtPlug-in.cpp::PptInfo`，`Inkeys/Inkeys/Other/Other.Config.cppm:657–664`。
- 停靠和材质。`Bar/Bar.RenderLoop.cpp:13561–13653`，`Bar/Bar.BottomDock.cppm::ShouldTakeOverBarWorkspaceEntry`、`ResolveBarWorkspaceBottomInsetDip`，`Bar/Bar.Initialization.cpp:394–398`，`UI3/UI3.Material.cppm::ResidentFillOpacityScale`，`UI3/UI3.Theme.cpp::GetThemeResidentSurfaceOpacity`。
- 状态指示器。`Inkeys/IdtPlug-in.cpp::PptInfo`，`Bar/Bar.StatusIndicator.cpp::PublishPptStatusIndicator`，`Bar/Bar.StatusIndicatorModel.cppm::StatusIndicatorStyle`、`StatusIndicatorSources`，`Inkeys/src/i18n/en-US.jsonc:51`。

## 2. 放映时的底部分页栏

**结论**

| 项目 | 默认大尺寸放映态 |
|---|---|
| 左下栏 | 从左到右为 **拖动柄 → `Previous` → 页码 → `Next`** |
| 右下栏 | 从左到右为 **`Previous` → 页码 → `Next` → 拖动柄** |
| 主体与按钮 | 两栏各 **`240 × 80 DIP`**。三个按钮格各 `70 × 70 DIP`，圆角 `4 DIP`。内边距和格间距 `5 DIP`，拖动柄占 `10 DIP` 宽，柄本身为 `2 × 20 DIP`、圆角 `1 DIP`，用主题边框色、alpha `0.72`。栏体圆角 `8 DIP`，描边 `1 DIP`。 |
| 图标与字 | `Previous` 和 `Next` 用 `barMore.svg`，分别旋转 `−90°`、`90°`。图标 `28 × 28 DIP`，中心上移 `10 DIP`。按钮文字 `13 DIP`，中心下移 `20 DIP`。en-US 字体为 `HarmonyOS Sans SC`。 |
| 页码 | **上下两行**，例如上 `1`、下 `/2`。当前页 `28 DIP` 粗体、中心上移 `10 DIP`，总页数 `13 DIP` 常规、中心下移 `20 DIP`。点页码会请求宿主打开幻灯片导航。 |
| 常驻材质 | 浅色底 `#FBFBFB / 0.92`、描边 `#8B8B8 / 0.18`、图标 `#2B2B2B`、文字 `#1A1A1A`。深色底 `#181818 / 0.80`、描边 `#FFFFFF / 0.18`、图标和文字 `#FFFFFF`。常驻透明度可由用户设置覆盖。 |

- **`1/2` 的 `Previous` 仍为可用态，`2/2` 的右键仍是可用的 `Next`。** Inkeys 会把翻页请求交给宿主。宿主已进入独立结束屏、页态满足 `currentPage < 0 && totalPage > 0` 时，右键才改为 `End show` 和 `barEndShow.svg`。例如结束屏稳定页码为上 `-`、下 `/2`。主栏的 `End show` 会请求确认，底栏结束屏按钮走直接退出回调。
- 两栏默认同时显示，锚在**主显示器**左右下角。默认偏移 `0`、局部倍率 `1.0`，水平边距为 `5 DIP × 分页 UI 倍率`，可见描边外缘距屏幕底部 `5` 屏幕 DIP。位置可成对拖动并记忆。主栏若满足自动停靠条件，三者同屏时主栏在底部中央、分页栏在两端。主栏可跟随放映窗口所在屏幕，分页栏仍使用主屏布局。
- **按下即发出翻页请求。** 按钮缩至 `0.95`，`0.40 s / EaseOutCubic`，松开恢复至 `1.0`，`0.40 s / EaseOutBack`。按压底色浅 `#BCBCBC`、深 `#7F7F7F`，目标 alpha `0.10`，底色过渡 `0.24 s`。悬停用同色、目标 alpha `0.18`，进入 `0.24 s / EaseOutSine`。水波效果**未找到**。长按连翻默认关闭。
- **默认闲置 `10 s` 后淡化。** 底色 alpha 上限 `0.30`，图标和文字的常驻内容倍率上限 `0.60`，用户设置更低时取更低值。淡出 `0.50 s`，恢复 `0.15 s`。悬停或按下期间保持正常显示，交互结束后重新计时。同一场次检测到外部页码变化时，可跳过 `10 s` 等待。分页控件发起翻页后的 `3.0 s` 内有归因保护。配置 `0` 关闭淡化，超时上限 `3600 s`。
- 切到小尺寸档后，两栏各 **`160 × 42.5 DIP`**，图标 `20 DIP`，箭头格 `32.5 × 32.5 DIP`，按钮文案隐藏。页码格 `70 × 32.5 DIP`，单行并排显示 `1/2`，字号分别为 `15` 和 `13 DIP`。拖动柄槽宽 `5 DIP`。

**依据**

- 页面元素、首尾态和文案。`PageControl/PageControl.cpp::BuildPageContent`、`InvokeDirection`、`InvokePptPreview`，`PageControl/PageControl.cppm::IsPptEndPage`、`ResolvePptDirectionAction`，`Bar/Bar.Scene.cppm::BarPageSurfaceContent`，`Bar/Bar.Scene.cpp::Configure`、`DragHandleRect`，`Inkeys/src/i18n/en-US.jsonc:91–108`。宿主命令和确认分支见 `Inkeys/IdtPlug-in.cpp:1599–1626`、`:1706–1746`，`PptCOM/PptCOM.cs::ExecuteOwnerCommandCore`。
- 尺寸、位置和材质。`Bar/Bar.Metrics.cppm::ResolveBarPptStandardPaginationGeometry`，`UI3/UI3.Metrics.cppm::ResolveButtonVisualMetrics`，`PageControl/PageControl.cpp:956–969`，`PageControl/PageControl.cppm::ResolveSurfaceLayout`、`ResolvePageControlBottomInsetPixels`，`UI3/UI3.Theme.cpp`、`UI3/UI3.Material.cppm`，`Inkeys/IdtI18nLocales.h:25`。
- 反馈和淡化。`Bar/Bar.Scene.cpp::UpdateFeedback`、`BarPageSurface::SetIdleFade`，`UI3/UI3.Button.cpp::RetargetFixedButtonVisual`、`StartButtonHoverVisual`，`UI3/UI3.Metrics.cppm` 的按钮反馈常量，`PageControl/PageControl.cppm::ResolvePptDirectionPressPolicy`、`ResolvePptIdleFade`、`IsPptExternalPageTurn`，`PageControl/PageControl.cpp::MarkIdleActivity`、`:6545–6553`，`Inkeys/Inkeys/Other/Other.Config.cppm:661–680`。

## 3. 屏幕两侧的翻页按钮

**结论**

两侧各有一套竖栏，`ShowMiddleBoth` 默认 `false`。开启后，默认锚在**主显示器**左右边缘的垂直中点，水平边距同样为 `5 DIP × 分页 UI 倍率`，位置和倍率可调。

大尺寸竖栏为 **`80 × 240 DIP`**，从上到下为 **拖动柄、`Previous`、双行页码、`Next`**。拖动柄为 `20 × 2 DIP`，上一页箭头朝上 `0°`，下一页朝下 `180°`。圆角、材质、字号和按钮反馈沿用底栏。小尺寸竖栏为 **`42.5 × 160 DIP`**，图标 `20 DIP`，页码仍分两行，字号 `15 / 13 DIP`，按钮文案隐藏。侧栏开启后默认也按 `10 s` 闲置、`0.50 s` 淡出、`0.15 s` 恢复，底色和内容上限为 `0.30 / 0.60`。

**依据**

- `Inkeys/Inkeys/Other/Other.Config.cppm:661–678`，`PageControl/PageControl.cppm::ResolveWorkspaceMode`、`ResolveSurfaceLayout`、`ResolveDirectionIconAngle`、`ResolvePptIdleFade`。
- `Bar/Bar.Metrics.cppm::ResolveBarPptStandardPaginationGeometry`，`Bar/Bar.Scene.cpp::DragHandleRect`，`UI3/UI3.Metrics.cppm::ResolveButtonVisualMetrics`。

## 4. 翻页与墨迹

**结论**

- **各页有独立墨迹，返回第 1 页会恢复原来的圈。** 同文稿翻页时，Draw3 切换当前页索引并重绘目标页。优先按稳定 `SlideID` 绑定，另有页序号回退路径。正常页态的画布和页码直接切换，墨迹渐变或滑动过渡**未找到**。更新仍要等宿主页变化被观测、目标画布就绪并提交，必要时包含异步读取。等待超过 `500 ms` 可显示 `Wait` 和加载环，环淡入 `180 ms`、淡出 `140 ms`、周期 `1.4 s`。
- **宿主实际换页后，墨迹跟随新的页身份。** 分页栏走 COM `View.Next` / `View.Previous`，键盘、滚轮、宿主内部点击造成的换页也进入同一观测链。画笔工具下直接点击批注画布会送入 Draw3 的落笔路径，点击穿透到幻灯片并翻页的路径**未找到**。`Select` 下画布会切成穿透，宿主能接收点击。
- 结束放映后，放映墨迹退出当前画布。符合保存条件的变更会自动落到 Inkeys 自有的 `Inkeys/AutoSave/presentation` `.uink` 存储。写回 PPT 文件或询问是否保留 Inkeys 墨迹的路径**未找到**。主栏的 `End the current slide show?` 询问的是是否结束放映。

**依据**

- 页身份与重绘。`Draw3/Draw3.Presentation.cpp::ResolvePresentationTarget`，`Draw3/Draw3.DrawingController.cpp::SwitchPresentationCpuSlot`、`:20750–20823`，`Inkeys/IdtPlug-in.cpp:1483–1552`，`Bar/Bar.Scene.cpp::RefreshDisplayedText`，`UI3/UI3.LoadingIndicator.cppm::PageLoadingStyle`。
- 输入与观测。`PptCOM/PptCOM.cs::SlideShowChange`、`BindEvents`、`ObserveBoundShow`、`ExecuteOwnerCommandCore`，`PageControl/PageControl.cpp:6545–6553`，`Draw3/Draw3.DrawingController.cpp::RouteSelectionDown`，`Inkeys/IdtState.cpp:1112`。
- 退出与持久化。`Draw3/Draw3.DrawingController.cpp:20841–20897`，`Draw3/Draw3.PresentationAutoSave.cpp::SavePresentation`，`Inkeys/IdtMain.cpp:3972–3973`，`Inkeys/IdtPlug-in.cpp:1706–1746`，`Inkeys/src/i18n/en-US.jsonc:280`。

## 5. 放映时的笔

**结论**

放映和桌面批注共用普通笔的颜色槽与笔宽偏好。选择软笔后，初始颜色为 **`#FF1000`，alpha `255`**，普通设备默认中档基准宽度 **`3 DIP`**。浅色、深色软件主题取同一墨迹色。用户改过的颜色和粗细会在两种工作区共享。大屏设备仍按 `4 × contentScale / systemScale DIP` 计算默认中档宽度。

**依据**

- `Inkeys/IdtState.cpp::BrushColorScope`、`ProjectSharedStyles`、`GetPenWidthMetrics`，`Inkeys/Inkeys/Business/PenWidthPolicy.hpp::PresetDip`。

## 6. 离屏导出的可行性

**结论**

**最接近的是 `D:/Project/Inkeys/website/media/nh3-remotion/native-whiteboard/`。** 它已有主栏和分页的同批捕获、`3×` 采样、布局元数据和透明 PNG 裁切。旧 `inkeys3-theme-promo/native/HeroExport.inc` 可参考 PPT 分页的场景输入。它用 `pager.current > 1` 禁用首页上一页，当前生产页态应按第 2 节配置。

| 文件 | 所需改动 |
|---|---|
| `HeroExport.inc` | 主栏使用 `WorkspaceSceneScope(WorkspaceScene::Presentation)`，发布放映与 Freeze 状态，设置合并、展开、大尺寸、软笔 `#FF1000` 和 Undo/Redo `true/false`，校验 `Select`、`Board`、`End show` 和九列。分页使用 `whiteboard=false`、`pptActive=true`、`compact=false`、`surface=0` 或 `1`，输入 `1/2`、`2/2`。两页均为 `Previous`、`Next` 可用、`nextIsEndShow=false`。稳定帧关闭等待与闲置淡化，整体 opacity `1.0`。迁移两类画面的帧目标调用。 |
| `HeroScene.inc`、`export.py` | 把当前页与总页数独立表达，编排 `en-US`、浅深主题、主栏和两种页态。只取一侧分页时共 **6 张**，左右都取时共 **10 张**。要保留真实左右布局需分别捕获，拖动柄位置不同。 |
| `crop.py`、`install.py` | 把裁切校验换成放映按钮、分页状态和布局。现有裁切要求每边 `60 px`，安装器的分页外扩补丁只覆盖 `whiteboard && surface == 0`，需按放映导出目标调整。若把 `Slideshow` 指示器也画进主栏图层，需加入对应的状态发布和裁切边界。 |

按源码估计，改动集中在上述五个适配文件。核心是替换状态布置、更新几何与状态校验，以及迁移帧目标。`HeroCommon.inc::SaveTarget` / `SavePixels` 可直接复用，其读回会把预乘 BGRA 转成 PNG 所需的直通 alpha。

**当前 HEAD 的符号核对**

| 旧适配调用 | 当前状态 |
|---|---|
| `BarPageSurface::EnsureDeviceResources` | 已从 `BarPageSurface` 移除。宿主绑定 `FrameTarget`，调用 `PrepareDeviceGeneration` 后用 `FrameTarget::Ensure`。 |
| `BarPageSurface::DeviceContext`、`BarPageSurface::Renderer` | 已从 `BarPageSurface` 移除。对应入口为 `FrameTarget::DeviceContext`、`FrameTarget::BoundRenderer`。`PageControl.cpp::HostedScene` 中的同名方法是测试包装。 |
| `UIRendering::GetTargetBitmap`、`UIRendering::DiscardDeviceResources` | 已从 `UIRendering` 移除。主栏可用 `owner.specTarget.TargetBitmap()`、`owner.specTarget.Discard()`，分页用其持有的 `FrameTarget`。`UIRendering::GetDeviceContext` 仍存在。 |
| `UIRendering::BeginFrameDraw`、`FinishFrameDrawCommands`、`EndFrameDraw` | 已移到 `FrameTarget`，当前名称为 `BeginFrame`、`FinishDrawCommands`、`EndFrame`。 |
| 其余主要入口 | 已找到 `RunEraserAttributeOffscreenTest`、`CreateBarOffscreenRenderCallback`、`WorkspaceSceneScope`、`Whiteboard::ResolvePageState`、`BarPageSurface::ConfigurePagination`、`SetBounds`、`Advance`、`Render`、`CommitPresented`、`Layout`、`Geometry`、`PresentationBounds`，以及适配使用的主栏初始化、显示快照、主题、选笔、历史通知和布局快照入口。 |

**依据**

- 官网 `media/nh3-remotion/native-whiteboard/HeroExport.inc::ExportToolbar`、`ExportPager`、`Export`，`HeroScene.inc::Scene`，`export.py`，`crop.py::verify_capture`，`install.py:76–121`，`HeroCommon.inc::SaveTarget`。旧先例见 `media/inkeys3-theme-promo/native/HeroExport.inc:121–150`。
- 当前接口见 `Bar/Bar.Scene.cppm::BarPageSurface`，`PageControl/PageControl.cpp::EnsureSurfaceTarget`、`HostedScene`，`UI3/UI3.Host.cppm::FrameTarget`，`UI3/UI3.Renderer.cppm::UIRendering`，`Bar/Bar.Main.cppm::BarUISetClass`，`Inkeys/IdtState.cpp::Inkeys::Testing::WorkspaceSceneScope::Set`。

## 不确定或未找到的事项

- **PowerPoint 和 WPS 在第 1 页收到 `Previous` 后的具体宿主反应，以及带动画步骤的末页需要几次 `Next` 才到结束屏，未找到统一行为。** Inkeys 的界面状态和 COM 调用已确认。依据 `PptCOM/PptCOM.cs::ExecuteOwnerCommandCore`。
- **不同 Office/WPS 版本中，滚轮、键盘或点击在特定焦点条件下是否实际换页，未找到统一保证。** 已确认 Inkeys 会跟随宿主报告的页变化。依据 `PptCOM/PptCOM.cs::ObserveBoundShow`、`PageControl/PageControl.cpp:6545–6553`。
- **当前 HEAD 的离屏构建、PNG 像素和 `384 × 576` 卡片内的裁切效果未验证。** 本次按要求只读核对源码、适配和符号。