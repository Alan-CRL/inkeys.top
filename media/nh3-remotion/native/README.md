# S1 卡片主栏状态离屏适配

从 media/inkeys3-theme-promo/native/ 独立复制并修改；原目录不参与安装，也不被改写。本目录只渲染主按钮与桌面主栏，不渲染 PPT / 白板分页、墨迹或冻结桌面。

## 状态与产物

每个状态在 light / dark 各启动一个独立离屏进程，共六次：

| 状态 | 生产笔型 | 笔色 | Freeze |
| --- | --- | --- | --- |
| soft | SoftPen，主栏 Soft Pen | FF1000 | 关闭 |
| highlight | Highlighter，主栏 Highlight | FFC510 | 关闭 |
| soft-freeze | SoftPen，主栏 Soft Pen | FF1000 | 激活 |

共同设置：en-US、SetSelectAndClickThroughMode(0)、桌面工作区、Undo 可用 / Redo 不可用、BackgroundOpacity=0 / ContentOpacity=100。0 是跟随主题默认材质，并非把主栏底色变成全透明。输出 PNG 的画布背景透明，保留生产主栏材质、阴影和边缘光。沿用基底的 3 倍离屏采样（每个主栏逻辑单位 3 原始像素），最终布局以元数据为准。

- native/build/native-ui-bin/：私有 Inkeys.exe 及 compiled-adapter.json；不与其他任务共用。
- native/build/native-build.log：现有 solution 的构建日志。
- native/build/adapters/<repository-id>/：字节备份与安装记录。
- native/build/capture-<theme>-<state>-<run-id>/：每次捕获的原始整幅 PNG、两份元数据、输入、日志及哈希清单；runtime-config/ 也隔离于此。
- native/build/source-restoration.json：构建安装前后源码哈希对照。重放单独写 capture-only-source-snapshot-<run-id>.json，不覆盖首次还原证据。
- native/out/{light,dark}/{soft,highlight,soft-freeze}/：各保存 toolbar.png、toolbar-body.json、toolbar-state.json、capture-manifest.json、native-scene.txt、export.log。
- public/toolbar/{light,dark}/{soft,highlight,soft-freeze}.png 与 public/toolbar/layout.json：仅运行 crop.py 后产生。

以上 native/ 和 public/ 均相对于 media/nh3-remotion/。

## Claude 执行命令

本次 Codex 仅编写与静态核对，没有执行以下命令。使用现有 Windows ARM64 开发环境及已有 Python 3.10+（需已安装 Pillow），不升级依赖；只裁切时不需要 Visual Studio。

在同一个 PowerShell 会话中按顺序执行；每一步失败就停止：

~~~powershell
Set-Location D:/Project/Inkeys/website
$nativeExportPath = $env:Path
Remove-Item Env:PATH -ErrorAction SilentlyContinue
$env:Path = $nativeExportPath
$env:MSBUILDDISABLENODEREUSE = '1'
$env:PYTHONUTF8 = '1'

python media/nh3-remotion/native/export.py --repository D:/Project/Inkeys/Repo/Inkeys --build-only
if ($LASTEXITCODE -ne 0) { throw 'S1 native build failed' }

python media/nh3-remotion/native/export.py --repository D:/Project/Inkeys/Repo/Inkeys --skip-build
if ($LASTEXITCODE -ne 0) { throw 'S1 native capture failed' }

python media/nh3-remotion/native/crop.py
if ($LASTEXITCODE -ne 0) { throw 'S1 toolbar crop failed' }
~~~

export.py 默认执行“构建 + 六次捕获”，也可以将前两条 Python 命令合为一条不带模式参数的 export.py 命令。--build-only 与 --skip-build 互斥。构建沿用 InkeysRepo.sln 的 Debug|ARM64，vswhere 定位当前 Visual Studio 的 ARM64 原生 MSBuild.exe，超时 1800 秒；每个捕获进程超时 900 秒。脚本对子进程环境再次合并 Path/PATH 并禁用节点复用。

--skip-build 不调用安装器，不改生产源码，不要求 vswhere；它核对私有 EXE、编译适配、安装器和构建日志 SHA256，以及首次构建还原证据。当前工作区 HEAD 可以与编译时不同，两者分别记录，图像仍绑定实际私有二进制与编译时版本。适配或安装器改变后必须重新构建。

若 native/out/ 已有任意目标捕获，export.py 会拒绝覆盖；重新捕获前请先将旧 out 目录移至自行选择的归档位置。失败捕获保留在 build/，不会发布到 out/。crop.py 验证六次成功后才更新公开文件。

## 裁切与 layout 契约

crop.py 只依赖标准库及 Pillow，不依赖 numpy，也不重绘或重采样 UI。逐份验证输入、日志、PNG、两份 JSON 与 capture-manifest.json 的 SHA256 绑定，以及编译身份、当前适配、实际主题、笔色、按钮文案、选中态、透明度和历史状态。分隔线单独识别，不计入九个按钮。

裁切框为 [floor(left)-60, floor(top)-60, ceil(right)+60, ceil(bottom)+60]，其中 left/top/right/bottom 来自每次捕获的 body_rect。实体可能位于半像素位置，向外取整会多保留不足一像素的边缘；不会通过平移或缩放来抹平差异。源画布若不足以容纳完整余量就报错。六张的实体宽高、裁切后图片尺寸、实体位置、缩放及九按钮布局必须相同，否则写公开图之前即失败。

layout.json 的公共字段：

- image_size：[宽, 高]，裁切图原始像素。
- body_rect：[left, top, right, bottom]，实体在裁切图中的像素矩形，含左侧主按钮与主栏的几何并集，不含阴影与发光。
- pixels_per_logical_unit：每个主栏逻辑单位对应的原始像素数。
- buttons：Select、pen、Shapes、Erase、Undo、Clear、More、Board、Freeze 九键，各值为主体左上角起算的逻辑 [x, y, width, height]，来自生产按钮最终继承坐标；不包含左侧主按钮。
- captures：六次来源、原始裁切框、输入清单哈希、原图/最终图哈希、二进制哈希与编译版本。

逻辑按钮映射到裁切图：像素 x = body_rect[0] + logical_x × pixels_per_logical_unit，y 同理。

## 安装与还原

install.py 先核对全部锚点各出现一次、三份 Hero include 无碰撞，再备份原始字节并临时插入离屏分支。源码的 BOM、编码、CRLF/LF 原样保留。只在 Bar.EraserAttribute.Test.cpp 挂入口，并在 Bar.Button.cpp 增加仅由导出环境变量启用的 Recall 刷新保护；后者沿用基底，让没有 Draw3 产品运行时的离屏进程保留生产历史通知设置的 Undo/Redo 可用性。

export.py 在 finally 中调用 --restore；还原前先检查全部备份哈希、所有源码必须等于原件或预期补丁、临时 include 若存在必须匹配安装时哈希，再恢复原字节并删除 include。任何外部修改都拒绝覆盖。原件/尚未创建 include 的情形用于恢复中断安装；源码哈希变化则不发布最终捕获。

若进程被强制终止，在确认没有并发编辑后按以下命令恢复；如报告外部改动，应人工核对差异，不能强行覆盖：

~~~powershell
python media/nh3-remotion/native/install.py D:/Project/Inkeys/Repo/Inkeys --restore
~~~

不要并发在同一软件仓库安装其他 Hero 适配或编辑两个待补丁源文件。此会话没有运行安装器，软件仓库保持只读；以上临时安装仅供 Claude 后续构建时执行。脚本不会提交、推送或修改项目构建配置。

## 生产路径与源码依据

静态读取的软件仓库为 D:/Project/Inkeys/Repo/Inkeys，.git/HEAD 指向 dev，当时分支引用为 c06697b1ab2ba01800edf677b4fb46d4d0e2de61。下列路径均相对此软件仓库，行号对应本次读取的源码，不代表编译或运行已通过。

| 状态/逻辑 | 生产 API 与依据 |
| --- | --- |
| soft | ChangeStateModeToPen()、ChangeStateModeToPenTool(PenToolSelectionEnum::SoftPen)、SetPenColor(RGBA(255,16,0,255), false)。声明 Inkeys/IdtState.h:227、260–263；实现 Inkeys/IdtState.cpp:2063、2434、2452；SoftPen 映射 :626，颜色写入 Brush1 槽 :2041。 |
| highlight | 同上，工具为 Highlighter、颜色 RGBA(255,197,16,255)。映射 Inkeys/IdtState.cpp:628，颜色写入 Highlighter1 槽 :2043。主栏生产标签分支 Inkeys/Inkeys/UI/Bar/Bar.Button.cpp:1217–1241；en-US 文案 Inkeys/src/i18n/en-US.jsonc:79 为 Highlight，:81 为 Soft Pen。 |
| soft-freeze | 先设置 soft，再调用 Freeze::SetPresentationActive(false)、SetWhiteboardActive(false)，若 IsActive() 与目标不同则 Freeze::Toggle()。声明 Inkeys/Inkeys/UI/Freeze/Freeze.cppm:19–27，Toggle 实现 :128，工作区标志入口 :145、150。 |
| Freeze 的显示与副作用 | Freeze.cppm:41–42 默认原子状态 0、observer=nullptr；:59–62 仅向已注册 observer 发布，Toggle 改标志和 revision。主栏 Bar.Button.cpp:1002–1003 读取真实状态，:1045–1048 投影为 Selected。放大镜 observer 在 Inkeys/IdtMagnification.cpp:333 注册，线程在 Inkeys/IdtMain.cpp:4217 启动；离屏入口 :2070–2071 已提前返回。因此本适配没有捕屏/放大镜窗口，副作用仅为当前离屏进程内状态与版本变更，不声称冻结了真实桌面。 |
| 未选用的较大 Freeze 路径 | ToggleFreezeFromButton() 在 Inkeys/IdtState.cpp:2253–2277 还可能恢复穿透前工具、首次激活请求 topmost 刷新；本任务不需要这两个副作用。 |
| 状态证据 | GetCommittedStateModeSnapshot()（Inkeys/IdtState.h:172）、GetPenColor(const StateModeClass&) noexcept（:232）、Freeze::Snapshot()（Freeze.cppm:22），并读取最终按钮 name/visible/state。重复选择同一笔型可能返回 false，故不将返回值当失败，而验证实际快照。 |
| 桌面 | GetWorkspaceSceneSnapshot().committed==WorkspaceScene::Desktop（Inkeys/IdtState.h:173–183）；初始 Desktop 为 Inkeys/IdtState.cpp:231–232；同时核对主栏 PptPresentationActive/WhiteboardActive 为 false。 |
| 九按钮几何 | MainLayoutSnapshot() 的 identity/size/visible 在 Bar.Button.cppm:251–256；实现 Bar.Button.cpp:981–989。button.inhX/inhY 为实际左上角（Bar.UI.cppm:181–187），w.val/h.val 为最终尺寸；生产命中也在 Bar.Button.cpp:2833–2834 使用同组几何。 |

## 静态核对与运行限制

本次仅核对源码、脚本文字、锚点次数、编码/换行及写入范围；没有运行 Python（包括 py_compile）、安装、构建、导出、裁切或 GUI。没有创建最终图片与 layout.json。主栏离屏回调及所有复用的状态/主题/字体/读回接口按当前 dev 声明核对；安装器的 4 个替换锚点分别只有 1 处：

| 源码锚点 | 当前行号 | 匹配数 |
| --- | --- | --- |
| #include <wincodec.h> | Bar.EraserAttribute.Test.cpp:17 | 1 |
| RunEraserAttributeOffscreenTest() | Bar.EraserAttribute.Test.cpp:191 | 1 |
| create_directories(L"Build/eraser-b") | Bar.EraserAttribute.Test.cpp:204 | 1 |
| RecallHistoryAvailability availability{} + ProductRunning() 双行 | Bar.Button.cpp:1751 | 1 |

复用接口逐项核对（均位于 Inkeys/Inkeys/UI/Bar/，I18n 除外）：

| 调用 | 当前声明位置 |
| --- | --- |
| InitializeStartupPlacement(StartupPlacement) noexcept、InitializeUI(BarUISetClass&) | Bar.Main.cppm:903、1666 |
| PresetInitialization()、RegisterBuiltInComponents()、Load()、StateUpdate() | Bar.Button.cppm:290、292、300、293 |
| barMedia.LoadFormat()、UpdateRendering(bool) | Bar.Main.cppm:80、954 |
| ConfigureLocalizedTypography() | Bar.Rendering.cppm:111 |
| SetCurrentPageHasContent(bool) noexcept | Bar.Main.cppm:1622 |
| SetThemeMode(int) noexcept、SetResidentOpacity(int,int) noexcept | Bar.Main.cppm:1599、1601 |
| SetThemeStyleSource(BarStyleClass*) | Bar.Theme.cppm:127 |
| NoteRecallHistoryAvailability(bool,bool)、RecallChromeView() | Bar.Main.cppm:969、967 |
| CreateBarOffscreenRenderCallback(BarUISetClass&, std::function<BOOL(const UPDATELAYEREDWINDOWINFO&)>) | Bar.Main.cppm:1566–1568 |
| GetDeviceContext() const noexcept、GetTargetBitmap() const noexcept、DiscardDeviceResources() | Bar.Rendering.cppm:186、194、206 |
| I18n::load(int,wstring,wstring) | Inkeys/IdtI18n.h:48 |

原 harness 的 Inkeys.UI.Freeze import 位于 Bar.EraserAttribute.Test.cpp:40；未额外伪造产品符号。71 份已读取主栏/Freeze 源码的前后哈希一致；原主题适配 5 份文件前后哈希一致。新建文件均为 UTF-8 无 BOM、LF，未发现行尾空白。

Claude 必须继续验证：

1. 当前工具链下 C++ module/include 可见性与 Debug|ARM64 构建退出码、日志。
2. 六次日志末尾 failures=0，实际 Highlight 文案、软笔/荧光笔颜色、Freeze 与 pen 同时选中、Undo/Redo 以及主题材质像素正确。
3. 当前 dev 的离屏 capacity 和生产布局在六次中一致，且每边至少留出 60 原始像素；crop.py 会对不足余量或几何差异报错。
4. 最终 PNG 的 straight alpha、文字、图标、阴影/边缘光和统一锚点；哈希及状态元数据不能替代最终像素检查。
5. source-restoration.json 的 unchanged=true、before==after，软件仓库两个源文件已按字节还原且 Hero*.inc 被移除。

本会话命令执行器出现 CreateProcessAsUserW / Access is denied，因此没有完成 git diff --check；以文件读取、原目录哈希对比和文本静态核对代替，不将此环境限制归类为源码构建错误。
