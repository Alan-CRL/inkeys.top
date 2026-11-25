# Inkeys3 · 定格讲解（Remotion）

仅重制 `screen-freeze`，继续 `.trellis/tasks/09-28-inkeys3-new-homepage/`。官网根目录的 VuePress 依赖、构建方式及播放器不变。

## 成品

| 文件 | 参数 |
| --- | --- |
| `out/screen-freeze.mp4` | 1440×640、60fps、14 秒、约 282 KiB |
| `out/screen-freeze-mobile.mp4` | 720×720、60fps、14 秒、约 227 KiB |
| `out/screen-freeze.webp` / `screen-freeze-mobile.webp` | 第 700 帧结果 poster |
| `out/readme/screen-freeze.gif` | 960×426、15fps、14 秒 |

两版 MP4 均为静音 H.264 / yuv420p / faststart。网页使用 `docs/.vuepress/public/feature-media/` 中对应文件。`out/`、`build/`、依赖和准备后的原生副本均 ignored；公开成品与制作源码是交付内容。

## 安装与预览

以下命令在 `media/inkeys3-remotion/` 执行：

```powershell
pnpm install --frozen-lockfile --ignore-scripts
node scripts/prepare-assets.mjs

# 仅 Windows ARM64 需要：安装到本项目 .cache，不改变系统 Node/PATH。
# Remotion 4.0.534 的 Windows compositor 只提供 x64；脚本校验官方 SHA256。
./scripts/setup-runtime.ps1

pnpm studio --port=3100
```

打开 Studio 输出的本地地址，例如 `http://localhost:3100/ScreenFreeze` 或 `/ScreenFreezeMobile`。命令使用 `--no-open`，不会自动弹出浏览器。结束预览按 Ctrl+C。

本机 Node 原生为 ARM64，`scripts/run.mjs` 自动选择已校验的便携 x64 Node。pnpm 局部配置同时允许安装当前架构与 x64 可选依赖。其他系统可使用自身 Node；渲染器的 `REMOTION_BROWSER` 可指定 Chromium 路径，Windows 默认现有 Edge。视频数学符号使用本机 Georgia / Times New Roman；本次在 Windows Georgia 字体下验收，不额外分发字体。

## 制作与渲染

```powershell
# 只生成代表帧；可额外指定 --frames=126,210,384,700 或 --mobile。
pnpm stills

# 桌面与手机共用动作时间轴，分别构图。
pnpm typecheck
pnpm render
```

`render` 用 Remotion 以 2 倍尺寸渲染到 ignored `build/*-2x.mp4`，随后使用 Remotion 自带 FFmpeg / libx264 缩采样到既有网页尺寸。主控件、单摆、数学符号和原生墨迹始终由同一帧号驱动。没有 CSS transition、实时随机数或壁钟动画。

源码入口：`src/Root.tsx` 注册两种画幅；`ScreenFreeze.tsx` 编排浏览器、镜头与真实主栏；`TeachingScene.tsx` 绘制教学背景并合成真实墨迹；`timeline.ts` 管理事件与几何。

| 时刻 | 动作 |
| --- | --- |
| 0–2.1s | 单摆与角度曲线持续运动；箭头悬停、Down，最高点 Up 定格 |
| 2.1–3.5s | 背景停止，指针切到真实 Geometry 工具，保留 Freeze |
| 3.9–4.5s | 无输入时对教学画面和墨迹做后期取景，主栏保持固定 |
| 4.8–7.8s | 原生 mg / T / Fₜ 预览与提交，提交后才出现标签 |
| 8.3–10.3s | 原生虚线构造逐段展开并闭合 |
| 10.4–14s | 显示 Fₜ = mg sin θ，停留阅读 |

## 完整验证、打包与接入

验证需要 Pillow 和包含 `select` / `palettegen` 的完整 FFmpeg。Remotion 自带 FFmpeg 适合本项目编码，但不包含这些验收滤镜。复用本机已有媒体工具，不需安装 Python 包：

```powershell
$mediaPython = 'C:/Users/alan-/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
$mediaFfmpeg = 'C:/Users/alan-/AppData/Local/JianyingPro/Apps/10.6.0.14092/ffmpeg.exe'

& $mediaPython scripts/verify.py --ffmpeg $mediaFfmpeg

# 查看 build/decoded/、两张 contact.jpg、首末帧及实际 MP4 后，接入本地官网。
& $mediaPython scripts/verify.py --ffmpeg $mediaFfmpeg --publish
```

也可用 `FFMPEG_BIN` / `FFPROBE_BIN` 环境变量。Windows 默认使用 Remotion 自带 ffprobe，其他平台传 `--ffprobe`。校验会实际完整解码，检查 840 帧、14 秒、60fps、尺寸、无音轨、首末帧、hash，以及定格前运动/定格后静止的像素差。生成 poster、GIF、逐场景 provenance 和 verification。

`--publish` 只替换本场景 5 个媒体文件，更新其 14000ms 时长和校验记录；先验证其他 35 个媒体 hash，并把原文件与原 manifest 备份到 `build/previous-public/`。回滚时只恢复此目录对应文件；不要用旧全量渲染脚本覆盖新的单片。

官网集成验证：

```powershell
# 在网站根目录执行
pnpm docs:build
node .trellis/tasks/09-28-inkeys3-new-homepage/verify-feature-media.cjs
node media/inkeys3-remotion/scripts/check-site.cjs
```

浏览器检查复用本机已有 Playwright（可用 `PLAYWRIGHT_MODULE` 指定路径），始终 headless。检查桌面完整自然播放到 ended、暂停、390/320px 独立手机视频、真实比例和 reduced-motion；截图及真实播放帧保存在 `build/site-check/`。沙箱若拦截 localhost WebSocket 或 x64 工具，需在允许这些本机子进程的执行环境运行，不能据此改网站源码。

## 原生与后期边界

原生来源为 `feature/shape@d060e39` 的生产 UI3 / Draw3 离屏 fixture。`prepare-assets.mjs` 验证源 manifest、exporter、事件、共享画布及全部 449 张消费 PNG 的 SHA256，来源变动会明确失败。共享 PNG 不逐帧裁切。

浏览器壳、单摆、角度曲线、数学标签、输入箭头与镜头均为教学/后期层。取景不表示产品有缩放能力。Shape 样式由 fixture 预设；成片用于功能说明，不是完整工具设置教程。原生 Shape 序列未捕获工具光标，因此绘制期间不伪造 PenIcon。mg 是平行四边形对角线，Fₜ 是 mg 的切向分量，T 沿绳指向支点；球心按真实原生箭头交点 `(900,260)` 反推。

没有改动原生仓库、用户软件配置、其他七段视频，也没有执行 commit/push。原父任务保持 `in_progress`；本轮单片结果见 `remotion-result.md`。
