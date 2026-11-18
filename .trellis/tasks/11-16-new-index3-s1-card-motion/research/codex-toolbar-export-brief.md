# Codex 任务：为 S1 卡片视频准备主栏状态图的离屏导出适配

工作目录是官网仓库 `D:/Project/Inkeys/website`。软件仓库在 `D:/Project/Inkeys/Repo/Inkeys`（`dev` 分支），**只读，不要修改其中任何文件**。
本机的沙箱不能运行 Python、不能构建，所以**不要构建、不要运行导出**；你负责写好适配并做静态核对，构建和导出由 Claude 执行。
报告用简体中文。

## 背景

已有一套能工作的主栏离屏导出：`media/inkeys3-theme-promo/native/`（`HeroExport.inc`、`HeroCommon.inc`、`HeroScene.inc`、`install.py`、`export.py`）和它的 README。
它导出的是“en-US、合并式、Soft Pen 选中、笔色 FF1000、Undo 可用、Redo 不可用”的主栏，浅色和深色各一张，输出透明底 PNG 和 `toolbar-body.json`、`toolbar-state.json`。
约定见 `.trellis/spec/frontend/native-media-guidelines.md`。此前的源码调查见 `.trellis/tasks/11-16-new-index3-s1-card-motion/research/codex-ui-survey-result.md`（第 5 节）。

## 要做的事

在 **新目录 `media/nh3-remotion/native/`** 里建立一套独立的适配（从 `media/inkeys3-theme-promo/native/` 复制后修改；不要改动原目录的任何文件），用于导出下面六张图：

| 状态名 | 主栏状态 |
| --- | --- |
| `soft` | Soft Pen 选中，笔色 `FF1000` |
| `highlight` | 荧光笔选中（主栏文案应为 `Highlight`），荧光笔颜色 `FFC510` |
| `soft-freeze` | Soft Pen 选中（笔色 `FF1000`）并且 Freeze 处于激活（选中）状态 |

每种状态 × 浅色、深色主题。共同条件与现有适配相同：en-US、`SetSelectAndClickThroughMode(0)` 合并式、桌面工作区、Undo 可用、Redo 不可用、`BackgroundOpacity=0`、`ContentOpacity=100`、主栏只导出主按钮与主栏（不需要 PPT / 白板分页）。

要求：

1. 所有状态都通过生产接口设置（例如切换笔型、设置颜色、定格的生产 API），不在导出的图上涂改。Freeze 如果依赖真实的屏幕捕获或放大镜窗口才能进入激活态，请找出只影响主栏按钮显示状态的最小生产路径，并在报告里说明你选了哪条路径、有什么副作用；如果确实无法在离屏环境下进入，写明原因，不要伪造。
2. `export.py`：
   - 参数与现有脚本保持一致的风格：`--repository <软件仓库>`、`--build-only`、`--skip-build`。
   - 输出到 `media/nh3-remotion/native/build/`（构建产物和日志）与 `media/nh3-remotion/native/out/`（最终图层）。私有 OutDir 放在 `media/nh3-remotion/native/build/native-ui-bin/`，不要和其他任务共用。
   - 六次捕获，各自保存原始整幅 PNG、`toolbar-body.json`、`toolbar-state.json`、`capture-manifest.json`（沿用现有的哈希绑定方式）。
3. 另写一个 `crop.py`（只用 Pillow，可选 numpy）：读取六次捕获，按 **各自记录的主体矩形 `body_rect` 外扩相同的 60 原始像素** 裁切，输出
   `media/nh3-remotion/public/toolbar/{light,dark}/{soft,highlight,soft-freeze}.png`，并写出 `media/nh3-remotion/public/toolbar/layout.json`，内容包括：裁切后图片尺寸、主体矩形在裁切图中的位置、每个逻辑单位对应的像素数、九个按钮（Select、pen、Shapes、Erase、Undo、Clear、More、Board、Freeze）在主体内的逻辑坐标矩形。
   六张图必须尺寸相同、主体位置相同；如果某次捕获的主体矩形尺寸与其他不一致，脚本要报错退出。
4. 写 `media/nh3-remotion/native/README.md`：怎么构建、怎么导出、怎么裁切、输出在哪里、还原机制、已知限制。
5. 静态核对：逐一确认适配里用到的软件符号在当前 `dev`（`D:/Project/Inkeys/Repo/Inkeys`）中存在且签名匹配；`install.py` 的锚点在当前源码中各匹配一处。发现不匹配就修正适配（不是修改软件仓库）。

## 约束

- 只在 `media/nh3-remotion/native/` 和 `media/nh3-remotion/public/toolbar/` 下写文件（后者只由 `crop.py` 在运行时写，你不需要创建图片）。
- Python 脚本保持 UTF-8、LF；沿用现有脚本的写法和安全检查（按字节还原、拒绝覆盖他人改动、失败即退出）。
- 不升级依赖、不改构建配置。

## 最终报告

列出：新建和修改的文件；三种状态各自使用的生产 API 与依据（软件仓库的文件与行号）；静态核对的结果；Claude 接下来要执行的确切命令（按顺序）；你不确定、需要在构建或运行时验证的事项。
