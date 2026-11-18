# 自由白板主栏与分页栏离屏适配

本目录从同工程的 [native](../native/) 派生，使用 Inkeys 的生产 UI 渲染主按钮、主栏和白板左下角分页栏。浅色、深色各有三次独立捕获。

| 状态 | 捕获内容 |
| --- | --- |
| toolbar | 主按钮及展开主栏，依次为 Move、Soft Pen、Shapes、Erase、Undo、Clear、More、Close。Soft Pen 与 Close 同时选中，笔色 FFFFFF，Undo 可用，Redo 不可用。 |
| pager-1of1 | 左下栏，页码上行 1、下行 /1。Previous 禁用，其余是页码、Add page、More。 |
| pager-2of2 | 左下栏，页码上行 2、下行 /2。Previous 可用，其余与 1/1 相同。 |

共同条件为 en-US、合并式、BackgroundOpacity=0、ContentOpacity=100、3 像素/逻辑单位。背景透明度 0 采用主题默认的栏体材质。PNG 画布透明，保留生产光影，WIC 读回由预乘 BGRA 转为直通 alpha。分页固定为菜单收起、无未保存提示、无加载的稳定状态。

## 构建、导出和裁切

使用 Windows ARM64 开发环境和已安装的 Python 3.10+、Pillow。等待未打补丁的基线构建退出，再在同一个 PowerShell 会话中按顺序执行。

~~~powershell
Set-Location D:/Project/Inkeys/website
$whiteboardExportPath = $env:Path
Remove-Item Env:PATH -ErrorAction SilentlyContinue
$env:Path = $whiteboardExportPath
$env:MSBUILDDISABLENODEREUSE = '1'
$env:PYTHONUTF8 = '1'

python media/nh3-remotion/native-whiteboard/export.py --repository D:/Project/Inkeys/website/media/nh3-remotion/.cache/src --build-only
if ($LASTEXITCODE -ne 0) { throw 'Whiteboard native build failed' }

python media/nh3-remotion/native-whiteboard/export.py --repository D:/Project/Inkeys/website/media/nh3-remotion/.cache/src --skip-build
if ($LASTEXITCODE -ne 0) { throw 'Whiteboard native capture failed' }

python media/nh3-remotion/native-whiteboard/crop.py
if ($LASTEXITCODE -ne 0) { throw 'Whiteboard crop failed' }
~~~

也可执行不带模式参数的 export.py，一次完成构建和六次捕获。构建复用 InkeysRepo.sln 的 Debug|ARM64、vswhere 定位的 ARM64 MSBuild 和基线的私有 OutDir，参数包含 /t:Inkeys、/p:VcpkgManifestInstall=false、/m:4。构建上限 1800 秒，每个捕获上限 900 秒。安装时要求 git status --porcelain 为空，允许分离头指针。编译清单记录实际 HEAD，分离头指针的 branch 为 null。

--skip-build 读取私有 Inkeys.exe，核对导出标记、EXE、适配、安装器和构建日志哈希，以及初次构建的源码还原证据。捕获清单同时记录编译时提交和当前工作区提交。改动适配或安装器后需重新构建。如果目标 out/ 捕获已存在，先将旧捕获移到归档位置。

## 输出

下列路径相对 media/nh3-remotion/。

| 路径 | 内容 |
| --- | --- |
| native-whiteboard/build/native-ui-bin/ | 增量构建使用的私有 Inkeys.exe 和 compiled-adapter.json |
| native-whiteboard/build/native-build.log | MSBuild 日志 |
| native-whiteboard/build/adapters/、native-whiteboard/build/source-restoration.json | 安装记录、原件字节备份和还原哈希对照 |
| native-whiteboard/build/capture-*/ | 各捕获的输入、日志、运行时配置和原始输出，失败时也保留供排查 |
| native-whiteboard/out/{light,dark}/{toolbar,pager-1of1,pager-2of2}/ | 整幅 toolbar.png 或 pager.png、同前缀的 -body.json 和 -state.json、native-scene.txt、export.log、capture-manifest.json |
| public/whiteboard/{light,dark}/{toolbar,pager-1of1,pager-2of2}.png、public/whiteboard/layout.json | crop.py 生成的图层和布局 |

只有六次捕获均成功、日志以 failures=0 结尾且源码还原或只读快照校验通过后，export.py 才发布原始捕获。每份 capture-manifest.json 用 SHA256 绑定输入、实际 EXE、编译证据、适配、PNG、两份元数据和日志。

crop.py 使用标准库和 Pillow。它核对六份捕获的哈希、状态与几何，按 [floor(left)−60, floor(top)−60, ceil(right)+60, ceil(bottom)+60] 裁切。半像素实体边缘向外取整，保留原采样。原图画布余量不足、同状态的浅深主题几何不一致、两种分页状态的几何不一致，均会在更新公开图层前报错。

layout.json 的 states 按状态名索引，每项包含以下字段。

- image_size 为裁切图像素尺寸 [width, height]。
- body_rect 为主体在裁切图中的像素矩形 [left, top, right, bottom]。主栏主体取主按钮和栏体的实体并集，分页主体取其生产栏体矩形。
- pixels_per_logical_unit 为逻辑单位到原始像素的比例。
- buttons 为相对主体左上角的逻辑 [x, y, width, height]。主栏提供 MainButton 和八个已验证的文案键。分页提供 Previous、Page、Add page、More；Page 覆盖上下两行页码。
- 根级 captures 记录各主题和状态的原图、裁切框、编译提交、二进制和输出哈希。

## 临时安装与还原

install.py 先预检锚点及临时 include，要求每个锚点恰好命中一次。保留原编码和换行，在写入前备份原字节并再次比对。export.py 通过 finally 触发还原。还原器先核对全部原件、当前源码和 include 的哈希，再恢复原字节并删除临时 include。发现外部改动或备份受损会拒绝覆盖。--skip-build 只读源码副本并留下独立的 capture-only-source-snapshot-*.json。

如进程被强制终止，确认基线构建和其他适配都已退出后可运行以下命令。若还原器报告源码被改动，先核对差异和安装记录。

~~~powershell
python media/nh3-remotion/native-whiteboard/install.py D:/Project/Inkeys/website/media/nh3-remotion/.cache/src --restore
~~~

以下锚点对应分离头提交 bcc11421f45b9aca24054f807ccbec9540465859。文件相对副本的 Inkeys/Inkeys/UI/Bar/。

| 锚点 | 行号 | 用途 |
| --- | --- | --- |
| #include &lt;wincodec.h&gt; | Bar.EraserAttribute.Test.cpp:17 | 加入适配使用的标准库头 |
| import Inkeys.UI.PageControl; | Bar.EraserAttribute.Test.cpp:39 | 新增白板与显示模块导入，使用 ResolvePageState 和固定离屏显示快照 |
| int RunEraserAttributeOffscreenTest() | Bar.EraserAttribute.Test.cpp:191 | 在已有模块和命名空间中引入适配 |
| create_directories(L"Build/eraser-b") | Bar.EraserAttribute.Test.cpp:204 | 在 COM、D2D 和字体初始化后进入白板导出分支 |
| RecallHistoryAvailability 和 ProductRunning 双行 | Bar.Button.cpp:1751 | 离屏无 Draw3 Host 时，保留生产 Undo/Redo 通知，避免刷新清空 |
| LONG Outset() const noexcept | Bar.Scene.cpp:320 | 新增，仅在捕获左白板分页时将 backing 外扩从 30 原始像素提高到至少 60 |
| RECT capacityContentBounds = currentContentBounds; | Bar.RenderLoop.cpp:8782 | 新增，为主栏紧凑 backing 增加裁切预留，沿用生产 viewport 和绘制坐标 |

## 生产路径与运行限制

以下源码位置相对同一只读副本。

| 路径 | 静态核对依据 |
| --- | --- |
| 白板场景 | Inkeys/IdtState.h:334 和 Inkeys/IdtState.cpp:3106、3129 的 WorkspaceSceneScope。Inkeys/Inkeys/UI/Bar/Bar.EraserAttribute.Test.cpp:877–893 已用该入口验证白板按钮显隐。 |
| 主栏状态 | Inkeys/IdtState.h:172、183、227、232、240–241、260–263 的快照、笔型、笔色和合并式接口。Inkeys/Inkeys/UI/Bar/Bar.Button.cpp:981、991、1217、1244、1813、1826 分别提供布局、状态投影、样式和历史可用性。 |
| 主栏绘制 | Bar.Initialization.cpp:68、304 初始化浮动主栏。Bar.Main.cppm:80、903、954、967–969、977、1566、1599、1601、1622、1651、1653、1666 声明媒体、状态和渲染接口。Bar.Button.cppm:290–300 声明预设和布局接口。Bar.RenderLoop.cpp:13295 进入生产协调器。固定显示快照复用 Bar.MultiTarget.Test.cpp:1595–1610、1645 的做法，类型见 Inkeys/Inkeys/Display/Display.cppm:140–176。 |
| 白板分页 | Inkeys/Inkeys/UI/Whiteboard/Whiteboard.cppm:38、116 解析末页和 Previous 可用性。Inkeys/Inkeys/UI/PageControl/PageControl.cpp:1065–1101 提供状态映射依据。Bar.Scene.cppm:39–85、120–181 声明输入、布局和绘制接口。Bar.Metrics.cppm:26–29 定义左栏边界。Bar.Scene.cpp:474、790、956、1080 提供格子布局、坐标平移、快照与生产绘制。 |
| 共享渲染 | Bar.Rendering.cppm:111、186、194、206、208–210 声明字体、设备、读回和绘制事务。Inkeys/Inkeys/UI/RenderPipeline/RenderPipeline.cppm:61、334–341 声明帧与设备入口。Inkeys/IdtI18n.h:22、48 和 Inkeys/src/i18n/en-US.jsonc:71–110 提供语言包与生产标签。 |

离屏入口以工作区测试作用域提交白板状态，以历史可用性通知准备主栏。分页传给生产 BarPageSurface 的是两个独立的稳定页态；适配未创建白板窗口、墨迹文档或实际执行翻页。主栏沿用浮动布局，并通过生产接口发布 3840×2160、96 DPI 的离屏显示快照。默认待提交显示区只有 1×1，固定快照能让主栏按稳定的左右方向展开，并给工作区边缘留出原生光影和裁切余量。

编写时只做静态检查。实际构建需确认 MSVC 模块依赖和增量输出，运行需确认六次捕获成功、素材颜色和透明度正确、光影未被裁断、几何验收通过，以及源码按字节还原。
