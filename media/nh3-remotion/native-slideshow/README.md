# PPT 放映左下分页栏离屏适配

> 2026-11-22 实际构建后的修正：C++ 的中间目录**没有**挪到 `build/native-ui-obj/`。工程把 `$(IntDir)` 当作包含目录，源码里有相对它写的 `../../../Launch/…` 包含，换位置后编译失败（C1083）。现在只把 OutDir、PptCOM 的中间目录和 vcpkg 路径放在 `build/` 下，C++ 中间文件留在软件仓库已忽略的 `Inkeys/Cache/` 里。下文提到 `native-ui-obj` 的地方以此为准。本机用 `python3` 运行脚本。

使用 Inkeys 生产分页场景渲染浅色和深色各两张。四张图均为 en-US、大尺寸、BackgroundOpacity=0、ContentOpacity=100、整体不透明度 1.0，以每逻辑单位 3 个像素输出透明画布。背景设置 0 采用主题默认的栏体材质。

| 状态 | 从左到右 |
| --- | --- |
| `pager-1of2` | 拖动柄、可用的 Previous、上行 1 / 下行 /2、可用的 Next |
| `pager-2of2` | 拖动柄、可用的 Previous、上行 2 / 下行 /2、可用的 Next |

## 构建、捕获和裁切

在 Windows ARM64 开发环境准备 Python 3.10+、Pillow 和可正常构建的开发仓库。待其他软件构建和临时适配退出后，按顺序执行。

~~~powershell
Set-Location D:/Project/Inkeys/website/media/nh3-remotion

python native-slideshow/export.py --repository D:/Project/Inkeys/Repo/Inkeys-draw --build-only
if ($LASTEXITCODE -ne 0) { throw 'Slideshow native build failed' }

python native-slideshow/export.py --repository D:/Project/Inkeys/Repo/Inkeys-draw --skip-build
if ($LASTEXITCODE -ne 0) { throw 'Slideshow native capture failed' }

python native-slideshow/crop.py
if ($LASTEXITCODE -ne 0) { throw 'Slideshow crop failed' }
~~~

直接运行 `export.py --repository D:/Project/Inkeys/Repo/Inkeys-draw` 也可一次完成构建、四次捕获和还原。构建使用 vswhere 定位的 ARM64 原生 MSBuild，调用 `InkeysRepo.sln` 的 `Debug|ARM64`、`/t:Inkeys`、`/m:4`。脚本为子进程合并 Path/PATH 并关闭 MSBuild 节点复用，构建上限 1800 秒，每次捕获上限 900 秒。

OutDir、C++ IntDir、托管 BaseIntermediateOutputPath / IntermediateOutputPath 均指向本目录的 `build/`。首次构建将开发仓库的 `VcpkgInstalled/Arm64/` 复制为私有安装树，保留 manifest 安装，由私有路径承接下载、buildtrees、packages 和工具临时文件。现有工程仍从开发仓库读取 vcpkg 工具、manifest、资源及 `Inkeys/PptCOM.dll` 等输入。如果 vcpkg 实际重跑，仍可能访问仓库 `Vcpkg/.vcpkg-root` 的安装锁及本机 vcpkg 缓存。构建日志中应核对实际目标目录和 vcpkg 行为。

安装前要求 `git status --porcelain` 为空。构建清单记录当时的真实分支与 HEAD。分离头指针的分支记为 JSON null。`--skip-build` 核对上次构建的还原证据、适配、安装器、实际 EXE 及构建日志的哈希，再通过导出标记进入离屏分支。捕获清单分别记录编译时和捕获时工作树的分支与提交。已有原始捕获时，将对应 `out/` 子目录移到归档位置后再捕获。

## 输出

路径相对 `media/nh3-remotion/`。

| 路径 | 内容 |
| --- | --- |
| `native-slideshow/build/native-ui-bin/` | 私有 Inkeys.exe 和 compiled-adapter.json |
| `native-slideshow/build/native-ui-obj/`、`native-slideshow/build/pptcom-obj/` | C++ 和托管项目的私有中间目录 |
| `native-slideshow/build/native-build.log`、`native-slideshow/build/source-restoration.json` | 构建日志、源码还原前后哈希及 Git 清洁状态 |
| `native-slideshow/build/capture-*/` | 各次捕获的输入、日志和临时运行状态，失败时可在这里排查 |
| `native-slideshow/out/{light,dark}/{pager-1of2,pager-2of2}/` | 整幅 pager.png、pager-body.json、pager-state.json、native-scene.txt、export.log、capture-manifest.json |
| `public/slide-show/{light,dark}/{pager-1of2,pager-2of2}.png`、`public/slide-show/layout.json` | 裁切图和布局 |

原生绘制读回沿用白板适配的 WIC 预乘 BGRA 转直通 alpha。四次捕获成功、日志以 `failures=0` 结尾并通过源码还原或只读快照核对后才发布原始输出。每份捕获清单用 SHA256 绑定输入、实际 EXE、编译证据、适配、PNG、元数据和日志。

`crop.py` 用标准库和 Pillow 校验四份捕获，按主体矩形每侧向外扩 60 个原始像素，亚像素边界向外取整，保留原采样。四张图的尺寸、主体位置与各格几何必须相同。按 240 × 80 逻辑主体与整数像素锚点推得裁切图为 840 × 360。脚本保留根目录的旧 `pager-*.png`，新路径如已有同名 PNG 则报错。四张目标图均由裁切器预检，发现同名文件就保留现有文件并退出。写入新图使用同卷硬链接独占发布。

`layout.json` 的 `states` 以状态名索引。每项包含裁切后 `image_size`（像素宽、高）、`body_rect`（裁切图中的像素 LTRB）、`pixels_per_logical_unit` 和 `buttons`。按钮矩形为相对主体左上角的逻辑 XYWH，键为 Previous、Page、Next。Page 包含上下两行。根级 `captures` 记录各次裁切和来源证据。

## 安装与还原

安装器在写入前核对全部锚点各命中一次、临时 include 无冲突、Git 工作树干净，并按原始字节备份。构建脚本在 finally 中调用还原。还原器先核对整组原件、已安装源码、临时 include 的哈希，再恢复源码并删除临时 include。任何外部修改或备份损坏均会拒绝覆盖。只捕获时保存独立的 `capture-only-source-snapshot-*.json`。

如构建进程被强制终止，待构建进程全部退出后可手动还原。若还原器报告哈希不同，先检查源码差异及 `native-slideshow/build/adapters/` 下的安装记录。

~~~powershell
python native-slideshow/install.py D:/Project/Inkeys/Repo/Inkeys-draw --restore
~~~

以下锚点已对 `866762e0dfd8e18efd97becf7061a1ad6769889a` 静态核对。文件相对软件仓库的 `Inkeys/Inkeys/UI/Bar/`。

| 锚点 | 文件与行号 | 用途 |
| --- | --- | --- |
| `#include <wincodec.h>` | Bar.EraserAttribute.Test.cpp:16 | 在模块全局片段加入元数据输出所需的 `<iomanip>` |
| `int RunEraserAttributeOffscreenTest()` | Bar.EraserAttribute.Test.cpp:454 | 在现有 Bar 模块作用域引入适配 |
| `create_directories(L"Build/eraser-b")` | Bar.EraserAttribute.Test.cpp:467 | 在 COM、D2D、字体初始化之后分流到放映捕获 |
| `LONG Outset() const noexcept` | Bar.Scene.cpp:420 | 仅捕获放映左栏时为原生 backing 保留至少 60 像素 |
| `BarPageSurfaceGeometry Geometry() const noexcept` | Bar.Scene.cppm:147 | 声明导出专用只读探针 |
| `BarPageSurfaceGeometry BarPageSurface::Geometry() const noexcept` | Bar.Scene.cpp:1089 | 实现探针，读取生产绘制槽及已应用状态 |

## 生产路径与已知限制

页态依据 `PageControl/PageControl.cpp:1134–1169` 的常态放映映射，向 `BarPageSurface::ConfigurePagination` 传入左栏、标准尺寸及独立的当前页和总页数。`PageControl/PageControl.cppm:226–230` 的生产谓词只在总页数为正且当前页为负时给出结束屏。两个页态均保留 Next。Previous 和 Next 使用 `Inkeys/src/i18n/en-US.jsonc:91–92` 的本地化资源。探针读取 `Bar/Bar.Scene.cpp:619–646` 设置、由同文件 916–919 行交给绘制路径的上下两行，以及按钮文字。生产布局和像素读回前会确认三个格的顺序、启用、主体尺寸及稳定状态。

场景以生产 `SetOpacity` 和 `SetIdleFade` 固定稳定态，仿照 `PageControl/PageControl.cpp:339–370` 绑定私有 `FrameTarget`，通过 `Advance`、`Render`、`CommitPresented` 推进并绘制完整帧。主题由生产 UI3 的 `SetThemeStyleSource` 给场景提供已应用的主题与透明度，此入口与产品主栏共用（`Bar/Bar.Initialization.cpp:329`）。离屏捕获模拟宿主已经报告的稳定数字页，适配范围到分页渲染为止，无需 PowerPoint、WPS 或产品窗口。

本次仅完成静态核对。实机构建需确认 MSVC 模块、vcpkg 私有路径和源码还原。捕获后需检查四次原生验收、字体和图标、浅深材质、透明边缘及裁切位置。
