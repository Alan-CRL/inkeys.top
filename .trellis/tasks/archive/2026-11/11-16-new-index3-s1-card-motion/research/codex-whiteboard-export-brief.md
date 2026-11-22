# Codex 任务：为“自由白板”卡片准备白板主栏和分页栏的离屏导出适配

工作目录是官网仓库 `D:/Project/Inkeys/website`。
软件源码用这份**干净的副本**：`media/nh3-remotion/.cache/src`（从 `D:/Project/Inkeys/Repo/Inkeys` 克隆，检出在 `bcc11421f45b9aca24054f807ccbec9540465859`，分离头指针）。
**副本只读：不要修改其中任何文件。** 也不要读写 `D:/Project/Inkeys/Repo/Inkeys`（那边正在开发）。
本机的沙箱不能运行 Python、不能构建，所以**不要构建、不要运行导出**；你负责写好适配并做静态核对，构建和导出由 Claude 执行。
Claude 此刻正在后台对这份副本做一次未打补丁的基线构建（输出在 `media/nh3-remotion/native-whiteboard/build/`），**不要动 `native-whiteboard/build/` 目录**。
报告用简体中文。

**这项工作属于已有的 Trellis 任务 `11-16-new-index3-s1-card-motion`：不要新建 Trellis 任务，不要修改 `.trellis/` 下的任何文件，也不要停下来提问。**
这是一次非交互运行，没有人能回答问题：直接实施；遇到不确定的地方，自己做保守的选择，并把选择和理由写进最终报告。

## 背景

- 已有一套能工作的主栏离屏导出：`media/nh3-remotion/native/`（`HeroExport.inc`、`HeroCommon.inc`、`HeroScene.inc`、`install.py`、`export.py`、`crop.py`、`README.md`），导出的是桌面主栏的三种状态。约定见 `.trellis/spec/frontend/native-media-guidelines.md`。
- 白板模式的调查报告：`.trellis/tasks/11-16-new-index3-s1-card-motion/research/codex-whiteboard-survey-result.md`，其中第 2 节（白板主栏、分页栏）和第 6 节（导出的可行性、要改的地方、分页栏导出的先例 `media/inkeys3-theme-promo/native/HeroExport.inc` 的 `BarPageSurface`）是这次的依据。

## 要做的事

在**新目录 `media/nh3-remotion/native-whiteboard/`** 里建立一套独立的适配（从 `media/nh3-remotion/native/` 复制后修改；不要改动 `native/` 和 `media/inkeys3-theme-promo/` 里的任何文件），用于导出下面三种图，浅色、深色主题各一张，共六次捕获：

| 状态名 | 内容 |
| --- | --- |
| `toolbar` | 白板场景下的主按钮＋主栏：`Move`、`Soft Pen`（选中）、`Shapes`、`Erase`、`Undo`（可用）、`Clear`、`More`、`Close`（选中）；笔色 `FFFFFF`；Redo 不可用 |
| `pager-1of1` | 白板左下角的分页栏（`surface = 0`，`whiteboard = true`）：当前第 1 页、共 1 页（`Previous` 禁用，右侧是 `Add page`，最右是 `More`） |
| `pager-2of2` | 同上，当前第 2 页、共 2 页（`Previous` 可用，右侧是 `Add page`） |

共同条件：en-US、`SetSelectAndClickThroughMode(0)` 合并式、`BackgroundOpacity=0`、`ContentOpacity=100`、透明底 PNG、沿用现有适配的 3 倍离屏采样。分页栏取稳定态：菜单收起、没有未保存提示、没有加载状态。

要求：

1. 所有状态都通过生产接口设置（场景用 `Inkeys::Testing::WorkspaceSceneScope` 之类已有的测试入口切到 `WorkspaceScene::Whiteboard`，再选笔型、设笔色、设 Undo/Redo；分页栏通过 `BarPageSurface` 的生产渲染路径），不在导出的图上涂改。某个状态如果在离屏环境下确实进不去，写明原因，不要伪造。
2. 主栏的验收（写在适配里，不满足就返回非零）：八个按钮的文案依次是 `Move`、`Soft Pen`、`Shapes`、`Erase`、`Undo`、`Clear`、`More`、`Close`；`Soft Pen` 和 `Close` 同时为选中；`Freeze` 和 `Click-through` 不出现。
3. `install.py`：沿用现有写法（锚点预检、按字节备份与还原、拒绝覆盖他人改动）。锚点要在副本的源码里各匹配一处；如果白板导出需要新增锚点，说明每一个的用途。
4. `export.py`：
   - `--repository <软件源码目录>`、`--build-only`、`--skip-build`，风格同现有脚本。
   - 不再要求分支是 `dev`：允许分离头指针，把实际的提交号记进清单；但要求 `git status --porcelain` 为空才安装（副本是干净的）。
   - 构建命令在现有参数上加 `/t:Inkeys`（只构建 Inkeys 及其依赖）、`/p:VcpkgManifestInstall=false`（副本里的依赖是复制过来的，不让 vcpkg 重新安装）、把 `/m` 改成 `/m:4`。
   - 私有 OutDir 用 `media/nh3-remotion/native-whiteboard/build/native-ui-bin/`（基线构建已经输出到这里，适配构建会是增量的）；最终图层输出到 `media/nh3-remotion/native-whiteboard/out/{light,dark}/{toolbar,pager-1of1,pager-2of2}/`。
   - 六次捕获，各自保存原始整幅 PNG、主体与状态的元数据 JSON、`capture-manifest.json`（沿用现有的哈希绑定方式）。
5. `crop.py`（只用标准库和 Pillow）：读取六次捕获，各自按记录的主体矩形外扩 60 原始像素裁切，输出
   `media/nh3-remotion/public/whiteboard/{light,dark}/{toolbar,pager-1of1,pager-2of2}.png` 和 `media/nh3-remotion/public/whiteboard/layout.json`。
   `layout.json` 要包含：每种图裁切后的尺寸、主体矩形在裁切图中的位置、每个逻辑单位对应的像素数；主栏的八个按钮和主按钮在主体内的逻辑坐标矩形；分页栏四格（`Previous`、页码、`Add page`、`More`）在主体内的逻辑坐标矩形。
   同一种图的浅色、深色两张必须尺寸相同、主体位置相同；`pager-1of1` 和 `pager-2of2` 也必须尺寸相同、主体位置相同；不一致时报错退出。
6. `README.md`：怎么构建、怎么导出、怎么裁切、输出在哪里、还原机制、已知限制。
7. 静态核对：逐一确认适配里用到的软件符号在副本的源码中存在且签名匹配；`install.py` 的每个锚点在副本的源码中恰好匹配一处。发现不匹配就修正适配。

## 约束

- 只在 `media/nh3-remotion/native-whiteboard/` 下写文件，且不碰其中的 `build/`。`public/whiteboard/` 只由 `crop.py` 在运行时写，你不需要创建图片。
- Python 脚本保持 UTF-8、LF；不升级依赖、不改构建配置。

## 最终报告

列出：新建的文件；三种状态各自使用的生产接口与依据（副本里的文件与行号）；静态核对的结果；Claude 接下来要执行的确切命令（按顺序，`--repository` 用 `D:/Project/Inkeys/website/media/nh3-remotion/.cache/src`）；你不确定、需要在构建或运行时验证的事项。
