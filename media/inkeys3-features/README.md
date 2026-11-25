# Inkeys3 功能演示 v2 制作模板

本目录保存三组八幕的可重建分镜、真实原生输入和 Python/Pillow + FFmpeg 合成器。当前版本只用于静态审查与低成本预览；不会默认覆盖 `docs/.vuepress/public/feature-media`，也不代表已完成网页或 Office 端到端验收。

## 文件与图层边界

- `storyboard.json`：schemaVersion 2；每幕独立 `durationMs`、60fps 主时间轴、`shots`、`actions`、固定控制锚点、相机与 `/` 斜轴转场。
- `scenekit.py`：完整浏览器/桌面窗口、单摆与受力几何、课件底图、现代光标、共享斜轴合成构件。
- `editorial/cursor-arrow.json`：独立的宣传片圆角箭头矢量路径与配色；不是 Windows 或 Inkeys 系统光标。
- `render.py`：原生层调度、2 倍超采样、桌面/手机重新构图、poster/首尾帧、MP4/GIF 和范围化接触表。
- `verify.py`：实际解码、时长/帧率/尺寸/GIF 循环检查及最终文件 SHA256。
- `native/`：旧适配及本轮真实离屏导出适配；`sources/`：旧真实输入，保留作回滚且本轮不修改。
- `sources-redesign/`：并行 native 导出输入。若存在 `asset-contract.json`，该文件是资产坐标和元数据的权威合同，不由合成器修改。
- `build/redesign-compositor/`：接触表、代表帧和编码日志；`build/redesign-output/`：默认预览成片。两者均被忽略。

产品主栏、分页、白板主题、自由笔、Shape、Laser 和 PenIcon 只能来自生产渲染路径。教学窗口、单摆/波形/原始几何、数学符号、安装禁止/链环符号、现代箭头与斜轴转场是独立的教学或宣传片层。PowerPoint/WPS 窗口是风格化环境，不是 Office、WPS、VSTO 或 COM 兼容性证明。视频不烘焙宣传句段、背景名称或兼容性说明。

## 时间轴

| Scene | 时长 | 核心结果 |
| --- | ---: | --- |
| `screen-dynamic` | 7.0s | 运动单摆上的固定最低点标记与切向箭头 |
| `screen-through` | 7.8s | PenIcon → 箭头 → 穿透 → 下层网页操作，批注不随页面移动 |
| `screen-freeze` | 10.0s | 右侧最高点 Up 定格；`mg`、`T`、`Fₜ` 与真实 Dashed 平行四边形 |
| `slides-ink` | 9.0s | 青蓝实线、橙黄虚线、圆锥后侧弧与返回第 1 页恢复 |
| `slides-binding` | 8.5s | PowerPoint/WPS 双窗口焦点、独立页状态和独立墨迹 |
| `slides-ready` | 7.0s | 禁止安装/插件符号、链环确认后直接第一笔 |
| `board-backgrounds` | 6.8s | 三色斜分、一次 Laser contact、1s Hold + 0.8s Fade，再转场 |
| `board-pages` | 8.5s | 第 1 页书写、第 2 页不同内容、返回恢复原笔迹 |

主栏从首帧就位，不做模板上浮、无关淡入或孤立特写。普通主栏按钮在 Up 提交；课件方向键按 Down、白板方向键按 Up 提交。点击、书写、定格与翻页提交时相机锁定。所有编辑转场使用同一 `/` 轴、短距离和 320–440ms 非线性缓动。

A3 中 `Fₜ = mg sinθ`，方向沿切线指向平衡位置；`T` 独立沿绳指向支点，且最高点 `|T| = |mg cosθ|`。虚线平行四边形以 `mg` 为对角线，径向构造边表示重力的径向分量，不把 `Fₜ` 画成第三种独立力。

## native 输入合同

默认读取 `sources-redesign/manifest.json`。缺少任何所需真实资产、序列、共享画布或声明 hash 不匹配时，`--check` 和渲染都会失败；不会用 Pillow 仿造产品像素。旧 `sources` 只由 `test_render.py` 做真实控件 smoke，不能用于导出 v2 成片。

- 使用约定语义 ID 和权威 `asset-contract.json` 的附加 ID；当前 C1 额外使用 `toolbar-whiteboard-laser`，C2 使用 `toolbar-whiteboard`。每幕 `required` 是实际依赖集合。
- `pendulum-mark`、`force-*`、`cuboid-*`、`cone-*`、`binding-ink`、`ready-ink`、`laser-wave`、`board-page*-ink` 使用 1440×720 逻辑共享画布，可为高倍率同比例 RGBA；所有帧尺寸一致，禁止逐帧 trim。
- 上述绘制资产必须包含真实 Down/Move/Up 或书写序列。静态终帧不能通过遮罩冒充书写。Shape/Laser 的真实工具光标包含在相应原生序列中；合成器不会给它们套 PenIcon。A3 的实线/虚线受力构造均按合同使用 Shape 生产像素。
- `laser-wave` 使用合同中的 192 帧：Active 1.2s、Hold 1.0s、Fade 0.8s、Inactive 0.2s。4.2s 进入 Inactive 后才开始背景转场，序列尾部保留到 4.4s；默认无粒子。
- 主栏/分页保持共享控件裁切锚点。主栏交互动画使用目标状态资产；方向页交互动画使用来源页资产，并按合同 `commitFrame` 对齐 Down/Up，避免提交后错播另一方向的序列。C1 分页只在场景转场中对静态原生资产做 0.3s 宣传片渐显，不借用“下一页”交互序列伪造翻页。
- PenIcon 可声明 `hotspot`：0–1 为裁切后归一化坐标，大于 1 为原图像素坐标。浅底深石墨边和深底浅边属于 harness/宣传片视觉调整，必须写入原生 provenance。
- `provenance` 必须记录源码 revision、分支/状态、渲染器、straight-alpha、输入与视觉调整。应用窗口和后期构图的 provenance 与原生产品像素分开记录。

桌面输出 1440×640/60fps，手机输出 720×720/60fps；profile 使用不同窗口、控制锚点和原生画布取景，不是把桌面主栏整体缩小。README GIF 为 960×426/15fps，直接从同一动作时间采样。所有合成先以 2 倍尺寸绘制再 downsample。

## 检查与低成本预览

使用已有媒体 Python，不安装依赖：

```powershell
$mediaPython = 'C:/Users/alan-/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
$ffmpeg = 'C:/Users/alan-/AppData/Local/JianyingPro/Apps/10.6.0.14092/ffmpeg.exe'

& $mediaPython media/inkeys3-features/test_render.py
& $mediaPython media/inkeys3-features/render.py --check
& $mediaPython media/inkeys3-features/render.py --contacts-only
& $mediaPython media/inkeys3-features/render.py --scene screen-freeze --contacts-only
```

`--contacts-only` 不需要 FFmpeg，在 `build/redesign-compositor/` 写入桌面/手机接触表及每幕 first/poster/last PNG。接触表文件名包含全部或选定 scene 范围，部分导出不会覆盖其他范围的接触表。

FFmpeg 优先读取 `--ffmpeg`、`FFMPEG_BIN`、PATH 和本机已有剪映工具链；支持 `libx264` 或 `h264_mf`，不会下载编码器。`--font` 可替换本机合法 TrueType/OpenType 字体，默认只用于数学符号、应用图标和接触表元数据。

## 预览成片与实际验证

```powershell
& $mediaPython media/inkeys3-features/render.py `
  --scene screen-freeze --scene slides-ink --scene board-backgrounds `
  --output media/inkeys3-features/build/redesign-output `
  --ffmpeg $ffmpeg --skip-gif

& $mediaPython media/inkeys3-features/verify.py `
  --output media/inkeys3-features/build/redesign-output `
  --ffmpeg $ffmpeg
```

`--output` 默认是 ignored `build/redesign-output`。网页 URL 仍写入 `/feature-media/...` 以便验收后整体提升，但预览文件只存在于指定输出目录。`--scene` 可重复，manifest 保留同一输出目录内其他已导出场景。`--skip-gif` 只用于预览。中断后追加 `--resume` 会逐个实际解码已有 MP4，仅复用帧数完整的文件；缺失或不完整的视频自动重做，成功场景仍写入同一 manifest。

`verify.py` 默认验证 manifest 中实际存在的场景并标记 `complete=false`；公开目录或 `--require-complete` 强制八幕、16 个 MP4、poster/首尾帧和 8 个 GIF 完整。每个 MP4 都实际完整解码，不能用进程退出码代替媒体验证。

正式批量 60fps 渲染、浏览器播放/暂停/换幕、完整网站 build 与公开成品提升均不在当前低成本实现阶段自动执行。旧公开成品和旧 `sources/` 保持回滚。
