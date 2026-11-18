已在 `media/nh3-remotion/native-whiteboard/` 完成白板主栏和左下分页栏的离屏适配，覆盖浅色、深色各三种状态。适配会在主栏文案、顺序、选中态或显隐不符合要求时返回非零。裁切脚本会在跨主题或两种分页状态的尺寸、主体位置不一致时退出。

### 新建文件

- 渲染与夹具：[HeroExport.inc](/D:/Project/Inkeys/website/media/nh3-remotion/native-whiteboard/HeroExport.inc)、[HeroScene.inc](/D:/Project/Inkeys/website/media/nh3-remotion/native-whiteboard/HeroScene.inc)、[HeroCommon.inc](/D:/Project/Inkeys/website/media/nh3-remotion/native-whiteboard/HeroCommon.inc)
- 安装、构建与裁切：[install.py](/D:/Project/Inkeys/website/media/nh3-remotion/native-whiteboard/install.py)、[export.py](/D:/Project/Inkeys/website/media/nh3-remotion/native-whiteboard/export.py)、[crop.py](/D:/Project/Inkeys/website/media/nh3-remotion/native-whiteboard/crop.py)
- 操作及还原说明：[README.md](/D:/Project/Inkeys/website/media/nh3-remotion/native-whiteboard/README.md)

### 生产路径

以下行号对应只读副本提交 `bcc11421f45b9aca24054f807ccbec9540465859`。`Bar/`、`Whiteboard/` 和 `PageControl/` 均位于副本的 `Inkeys/Inkeys/UI/` 下。

| 状态 | 生产接口与源码依据 |
| --- | --- |
| `toolbar` | `WorkspaceSceneScope` 提交白板场景。`ChangeStateModeToPen()`、`ChangeStateModeToPenTool(SoftPen)` 和 `SetPenColor()` 设置白色软笔，`NoteRecallHistoryAvailability(true, false)` 发布历史可用性。用 `CreateBarOffscreenRenderCallback()` 绘制，再读取 `MainLayoutSnapshot()` 和最终按钮坐标，校验八键文案、从左到右的顺序、`Soft Pen` 与 `Close` 同时选中，以及 `Freeze` 和 `Click-through` 隐藏。依据 `Inkeys/IdtState.cpp:3106、3129、2435、2453、2064`，`Bar/Bar.Button.cpp:981、991、1244、1826`，`Bar/Bar.RenderLoop.cpp:13295`。 |
| `pager-1of1` | `ResolvePageState(1, 1, false)` 生成首末页状态，`Previous` 禁用。按生产页态映射传入 `BarPageSurface::ConfigurePagination()`，由 `Render()` 绘制左下栏及 `Add page`。依据 `Whiteboard/Whiteboard.cppm:116`，`PageControl/PageControl.cpp:1065`，`Bar/Bar.Scene.cpp:545、870、1080`。 |
| `pager-2of2` | `ResolvePageState(2, 2, false)` 生成第二页末页状态，`Previous` 可用，右侧仍为 `Add page`。沿用同一生产绘制路径，四格坐标来自 `BarPageSurface::Layout()`。依据 `Whiteboard/Whiteboard.cppm:116`，`PageControl/PageControl.cpp:1065`，`Bar/Bar.Scene.cpp:545、956、1080`。 |

主栏采用固定的 3840×2160、96 DPI 离屏显示快照，因为生产协调器的默认待提交显示区只有 1×1。三个新增安装锚点分别用于导入白板和显示模块、把左分页画布的余量从 30 提到至少 60 个原始像素，以及为主栏的紧凑画布预留裁切空间。

### 静态核对

已逐项核对适配使用的生产符号、声明签名和模块入口。安装器的 **7 个锚点在副本中各匹配一次**。七个新增文件均为 UTF-8 无 BOM、LF，Git 差异检查无空白问题。副本复查时 `git status --porcelain` 为空，本次写入仅涉及上述七个文件。

按任务约束，验证范围限于静态核对。Claude 需要确认 MSVC 模块编译和增量构建成功、六次导出均为 `failures=0`、PNG 的材质和直通 alpha 正确、光影未截断，并核对跨图几何及源码还原记录。分页验证覆盖两个稳定渲染状态，实际文档翻页不在这次离屏适配范围内。

### Claude 执行命令

等基线构建退出后，在同一个 PowerShell 会话中依次执行。

```powershell
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
```

原始 PNG、元数据和哈希清单位于 `media/nh3-remotion/native-whiteboard/out/`。裁切后的六张 PNG 和 `layout.json` 位于 `media/nh3-remotion/public/whiteboard/`。