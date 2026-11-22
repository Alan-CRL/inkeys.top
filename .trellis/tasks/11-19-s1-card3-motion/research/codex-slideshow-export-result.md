已在 [native-slideshow](/D:/Project/Inkeys/website/media/nh3-remotion/native-slideshow) 写好放映左下分页栏的离屏适配。浅色、深色各捕获 `pager-1of2` 和 `pager-2of2`，共四次。此次只做了静态核对，未运行 Python、构建、导出或裁切。

**发布路径已有冲突。** 核对时，`public/slide-show/{light,dark}/{pager-1of2,pager-2of2}.png` 四个路径已各有一张 `724 × 244` 的图。本次约定的裁切尺寸为 `840 × 360`。`crop.py` 会在发布前检查全部目标，发现同名图即退出并保留现有文件。构建和原始捕获可以照常进行。

### 新建文件

- `HeroExport.inc`、`HeroScene.inc`、`HeroCommon.inc` 负责页态输入、生产绘制、验收及透明 PNG 读回。
- `install.py`、`export.py`、`crop.py` 负责临时安装与按字节还原、私有 ARM64 构建、四次捕获和裁切。
- [README.md](/D:/Project/Inkeys/website/media/nh3-remotion/native-slideshow/README.md) 记录完整命令、六个锚点的用途、输出和运行限制。

### 生产路径与静态核对

- `1/2` 和 `2/2` 都按 `BuildPageContent` 的稳定放映分支配置 `BarPageSurface`。两个状态均启用 `Previous` 和 `Next`。`IsPptEndPage` 仅在当前页为负数且总页数大于零时成立，因此 `2/2` 的右键仍为 `Next`。 [页态映射](/D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/UI/PageControl/PageControl.cpp:1134) · [结束屏谓词](/D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/UI/PageControl/PageControl.cppm:226)
- 使用 `ConfigurePagination`、`SetOpacity`、`SetIdleFade` 和宿主持有的 `FrameTarget` 绘制。验收读取生产绘制使用的文字槽及布局，逐项检查两行页码、按钮文案与顺序、启用态、`nextIsEndShow` 和 `240 × 80` 主体。任一项失败即返回非零。 [分页配置](/D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/UI/Bar/Bar.Scene.cpp:619) · [帧目标绑定](/D:/Project/Inkeys/Repo/Inkeys-draw/Inkeys/Inkeys/UI/PageControl/PageControl.cpp:339)
- 直接读取 Git 引用确认分支为 `refactoring/drawpad-ui`，HEAD 为 `866762e0dfd8e18efd97becf7061a1ad6769889a`。六个安装锚点均恰好命中一次，逐项核对了生产接口签名和字段。三个 Python 文件均为 UTF-8、LF。命令运行器拒绝启动 Git 子进程，本次以只读 Git 索引和源文件哈希交叉核对，安装时仍会执行工作树清洁检查。

### Claude 执行顺序

```powershell
Set-Location D:/Project/Inkeys/website/media/nh3-remotion

python native-slideshow/export.py --repository D:/Project/Inkeys/Repo/Inkeys-draw --build-only
if ($LASTEXITCODE -ne 0) { throw 'Slideshow native build failed' }

python native-slideshow/export.py --repository D:/Project/Inkeys/Repo/Inkeys-draw --skip-build
if ($LASTEXITCODE -ne 0) { throw 'Slideshow native capture failed' }

python native-slideshow/crop.py
if ($LASTEXITCODE -ne 0) { throw 'Slideshow crop failed' }
```

第三步当前会因同名图退出，目标路径可用后再执行即可。实机仍需确认 MSVC 模块编译、vcpkg 私有路径及源码还原，并检查四次捕获的字体、图标、透明边缘和裁切位置。构建参数将产物、中间文件和 vcpkg 安装树指向 `native-slideshow/build/`。若 manifest 安装实际重跑，需从日志确认 vcpkg 对软件仓库内 `Vcpkg/.vcpkg-root` 安装锁的使用情况。