# Codex 任务：为“PPT 演示”卡片准备放映分页栏的离屏导出适配

工作目录是官网仓库的 `D:/Project/Inkeys/website/media/nh3-remotion`。
软件源码在 `D:/Project/Inkeys/Repo/Inkeys-draw`（分支 `refactoring/drawpad-ui`，HEAD `866762e0`，工作区干净）。**软件仓库只读：不要修改其中任何文件，不要执行任何 git 写操作。**
本机的沙箱不能运行 Python、不能构建，所以**不要构建、不要运行导出**；你负责写好适配并做静态核对，构建和导出由 Claude 执行。
报告用简体中文。

**这项工作属于已有的 Trellis 任务 `11-19-s1-card3-motion`：不要新建 Trellis 任务，不要修改 `.trellis/` 下的任何文件，也不要停下来提问。**
这是一次非交互运行，没有人能回答问题：直接实施；遇到不确定的地方，自己做保守的选择，并把选择和理由写进最终报告。

## 背景

- 已有一套能工作的白板主栏与分页栏离屏导出：`native-whiteboard/`（`HeroExport.inc`、`HeroCommon.inc`、`HeroScene.inc`、`install.py`、`export.py`、`crop.py`、`README.md`）。它是针对较早的提交 `bcc11421` 写的。约定见 `D:/Project/Inkeys/website/.trellis/spec/frontend/native-media-guidelines.md`。
- 放映模式的调查报告：`D:/Project/Inkeys/website/.trellis/tasks/11-19-s1-card3-motion/research/codex-slideshow-survey-result.md`。第 2 节是放映分页栏的事实，第 6 节列出了需要的改动，以及**当前 HEAD 下已经改名或搬走的符号**（`BarPageSurface::EnsureDeviceResources` / `DeviceContext` / `Renderer` 搬到了 `FrameTarget`；`UIRendering::GetTargetBitmap`、`DiscardDeviceResources`、`BeginFrameDraw`、`FinishFrameDrawCommands`、`EndFrameDraw` 的新位置和新名字）。以当前源码为准重新核对，不要只照报告抄。

## 要做的事

在**新目录 `native-slideshow/`** 里建立一套独立的适配（从 `native-whiteboard/` 复制后修改；不要改动 `native/`、`native-whiteboard/` 和 `D:/Project/Inkeys/website/media/inkeys3-theme-promo/` 里的任何文件），**只导出放映时左下角的分页栏**，不导出主栏。两种状态，浅色、深色主题各一张，共四次捕获：

| 状态名 | 内容 |
| --- | --- |
| `pager-1of2` | 放映左下栏（`whiteboard = false`、`pptActive = true`、`compact = false`、左栏）：拖动柄、`Previous`、页码上行 `1` 下行 `/2`、`Next`。`Previous` 与 `Next` 都是可用态。 |
| `pager-2of2` | 同上，页码上行 `2` 下行 `/2`。右键仍是可用的 `Next`（`nextIsEndShow = false`），**不是** `End show`。 |

共同条件：en-US、大尺寸档、`BackgroundOpacity=0`、`ContentOpacity=100`、透明底 PNG、沿用现有适配的 3 倍离屏采样。取稳定态：没有悬停或按下、没有等待/加载指示、闲置淡化关闭（整体不透明度 1.0）。

要求：

1. 状态通过生产接口设置（`BarPageSurface` 的生产配置与渲染路径），不在导出的图上涂改。某个状态在离屏环境下确实进不去时写明原因，不要伪造。
2. 验收写在适配里，不满足就返回非零：按钮文案依次是 `Previous`、`Next`；页码两行分别是 `1`、`/2`（或 `2`、`/2`）；`nextIsEndShow` 为假；主体尺寸为 `240 × 80` 逻辑单位。
3. `install.py`：沿用现有写法（锚点预检、按字节备份与还原、拒绝覆盖他人改动）。每个锚点在当前源码里恰好匹配一处。不再需要主栏相关的锚点时删掉；分页栏 backing 外扩的补丁要对放映左栏生效（现有补丁只覆盖 `whiteboard && surface == 0`）。说明每个锚点的用途。
4. `export.py`：
   - `--repository <软件源码目录>`、`--build-only`、`--skip-build`，风格同现有脚本；要求 `git status --porcelain` 为空才安装；把实际的分支和提交号记进清单。
   - 构建用 `InkeysRepo.sln`、`Debug|ARM64`、vswhere 定位的 ARM64 原生 MSBuild，`/t:Inkeys`、`/m:4`。**这次构建的是开发者自己的仓库，依赖齐全，不要加 `/p:VcpkgManifestInstall=false`**，除非现有脚本之外有明确理由（写进报告）。
   - 私有 OutDir 用 `native-slideshow/build/native-ui-bin/`，中间文件目录也放到 `native-slideshow/build/` 下，**不要把构建产物写进软件仓库**（如果做不到完全隔离，在报告里列出会写进软件仓库的路径）。
   - 四次捕获的原始输出放 `native-slideshow/out/{light,dark}/{pager-1of2,pager-2of2}/`，各自保存原始整幅 PNG、主体与状态的元数据 JSON、`capture-manifest.json`（沿用现有的哈希绑定方式）。
5. `crop.py`（只用标准库和 Pillow）：按记录的主体矩形外扩 60 原始像素裁切，输出
   `public/slide-show/{light,dark}/pager-1of2.png`、`pager-2of2.png` 和 `public/slide-show/layout.json`（裁切后的尺寸、主体矩形在裁切图中的位置、每个逻辑单位的像素数、`Previous`、`Page`、`Next` 三格在主体内的逻辑坐标矩形）。
   四张图必须尺寸相同、主体位置相同；不一致时报错退出。不要删除或改动 `public/slide-show/` 下已有的 `pager-*.png`。
6. `README.md`：怎么构建、怎么导出、怎么裁切、输出在哪里、还原机制、已知限制。命令里的仓库路径写 `D:/Project/Inkeys/Repo/Inkeys-draw`。
7. 静态核对：逐一确认适配里用到的软件符号在当前源码中存在且签名匹配；`install.py` 的每个锚点在当前源码中恰好匹配一处。发现不匹配就修正适配。

## 约束

- 只在 `native-slideshow/` 下写文件。`public/slide-show/` 只由 `crop.py` 在运行时写，你不需要创建图片。
- Python 脚本保持 UTF-8、LF；不升级依赖、不改构建配置。

## 最终报告

列出：新建的文件；两种状态使用的生产接口与依据（文件与行号）；静态核对的结果；Claude 接下来要执行的确切命令（按顺序）；你不确定、需要在构建或运行时验证的事项。
