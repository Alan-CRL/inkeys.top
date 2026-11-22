已完成独立适配，仅在 `media/nh3-remotion/native/` 新建 7 个文件：

- [HeroExport.inc](/D:/Project/Inkeys/website/media/nh3-remotion/native/HeroExport.inc)：三种状态的生产渲染与实际状态、按钮几何记录。
- [HeroCommon.inc](/D:/Project/Inkeys/website/media/nh3-remotion/native/HeroCommon.inc)、[HeroScene.inc](/D:/Project/Inkeys/website/media/nh3-remotion/native/HeroScene.inc)：PNG 读回与状态输入。
- [install.py](/D:/Project/Inkeys/website/media/nh3-remotion/native/install.py)：锚点预检、临时挂载、按字节还原。
- [export.py](/D:/Project/Inkeys/website/media/nh3-remotion/native/export.py)：私有构建、六次捕获、哈希绑定。
- [crop.py](/D:/Project/Inkeys/website/media/nh3-remotion/native/crop.py)：逐张按实体外扩 60 像素裁切，严格检查尺寸、主体位置和按钮布局一致。
- [README.md](/D:/Project/Inkeys/website/media/nh3-remotion/native/README.md)：完整操作、还原机制、源码依据和限制。

原主题适配未改动；软件仓库只读；未创建图片或 `layout.json`，未提交。

三种状态均通过生产 API 设置：

| 状态 | 调用与依据 |
|---|---|
| `soft` | `ChangeStateModeToPen()` → `ChangeStateModeToPenTool(SoftPen)` → `SetPenColor(FF1000, false)`。声明见 [IdtState.h:227](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/IdtState.h:227)、[IdtState.h:260](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/IdtState.h:260)；软笔映射见 [IdtState.cpp:626](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/IdtState.cpp:626)。 |
| `highlight` | 同一路径选择 `Highlighter`，设置 `FFC510`。映射见 [IdtState.cpp:628](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/IdtState.cpp:628)；生产标签分支见 [Bar.Button.cpp:1217](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/UI/Bar/Bar.Button.cpp:1217)，英文文案为 `Highlight`。 |
| `soft-freeze` | 设置软笔后，通过 `Freeze` 工作区接口确认可用，再按需调用 [Freeze::Toggle():128](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/UI/Freeze/Freeze.cppm:128)。主栏从真实状态生成 Selected，见 [Bar.Button.cpp:1045](/D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/UI/Bar/Bar.Button.cpp:1045)。 |

Freeze 路径只更新当前进程内的状态和版本号。离屏入口在放大镜线程启动前返回，没有注册捕屏观察者，因此不会创建捕屏或放大镜窗口，也不代表实际冻结了桌面。

静态核对通过：当前 `dev` 引用为 `c06697b1ab2ba01800edf677b4fb46d4d0e2de61`；调用符号、签名及字段匹配；安装器四个锚点均各匹配一处。原适配 5 个文件及已读取的软件源码快照前后哈希一致，新文件均为 UTF-8 无 BOM、LF。

Claude 接下来在同一个 PowerShell 会话按顺序执行：

```powershell
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
```

仍需运行验证：C++ 编译兼容性、六次 `failures=0`、实际文案/颜色/双选中外观、六图几何一致及最终透明像素效果、源码还原证据。遵照要求，本次未运行 Python、构建、导出、裁切或 GUI。

命令执行器报 `Access is denied`，因此未完成 `git diff --check`；已改用文件哈希和文本格式静态核对。这是执行环境限制，尚无构建结果。