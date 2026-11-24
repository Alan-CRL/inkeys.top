# 2026-10-22 功能动态素材交付

> 最新单片续作（2026-10-25）：`screen-freeze` 已通过 Remotion 重制，结果见 [remotion-result.md](./remotion-result.md)。以下保留2026-10-22历史交付。

延续原 `09-28-inkeys3-new-homepage` 任务，完成 `/new-index3` 第一组三张卡片的八幕演示与可重建模板。父任务仍为 `in_progress`，没有创建新任务、commit 或 push。

## 交付

- 屏幕批注：动态批注、穿透操作、定格讲解。
- 课件联动：随页墨迹、动态绑定、开箱即用。
- 多页白板：斜向分隔背景、多页书写。
- 每幕 7 秒；桌面 1440×640 / 30fps、手机 720×720 / 30fps，README GIF 960×426 / 15fps 时间轴。
- 16 个 MP4、16 张 WebP poster、8 个 GIF，共 13,259,035 字节；manifest / provenance / verification 随成品保存。
- 原生素材包含 14 个静态图层、288 帧动画；主栏、PPT / 白板分页、白板纹理与笔迹均由真实 UI3 / Draw3 渲染器导出。

## 可复用位置

- `media/inkeys3-features/storyboard.json`：镜头、动作时序、场景与手机特写范围。
- `media/inkeys3-features/native/`：临时 harness 适配、安装/还原、ARM64 solution 构建与无窗口导出。
- `media/inkeys3-features/sources/`：透明原生 PNG / 帧序列、尺寸、源码版本和哈希。
- `media/inkeys3-features/render.py` / `verify.py`：合成、导出与实际解码核验。
- `docs/.vuepress/public/feature-media/`：网页成品；`readme/` 保存 GIF。
- `media/inkeys3-features/README.md`：完整重建方法。中间帧、接触表、浏览器截图在 ignored `build/` 中。

## 网页与视觉处理

保留三张不透明卡片、交错标题与随机且互不重复的一次入场。镜头采用短促的非线性推近/回拉并保留观察时间；原生控件动画按导出帧率播放。PPT 特写将真实页控居中放大、淡出无关内容，PowerPoint / WPS 身份文字保持稳定。手机屏幕批注展示相关工具的原生局部特写。

媒体静音、无原生控件、临近视口才加载。以真实视频时间和 ended 换幕；离屏、后台、焦点、手动暂停时保持进度。缓冲不会被固定计时器提前截断；失败退回 poster，不循环重试。横竖版本换源保留时间。舞台跟随 9:4 / 1:1 成片比例，避免 contain 留白缩小控件；开箱即用的手机文案为 36px 源字号。

## 验证

- 原生 `InkeysRepo.sln Debug|ARM64` 构建成功，使用已有 ARM64 MSBuild，应用 Codex PATH 规范化。
- 原生离屏导出 `failures=0`，适配安装/精确还原回归通过；302 张 PNG 的哈希、RGBA、尺寸及共享画布独立复核通过。
- 合成模板 4 项测试通过；16 个 MP4 实际完整解码为 210 帧 / 7 秒，8 个 GIF 均为 7000ms，40 个文件哈希和尺寸匹配。
- Vue SFC / 样式编译、SSR、生命周期回归通过，包含缓冲、真实 ended、过期事件、换源续播、异常回退与卸载清理。
- `pnpm docs:build` 通过，渲染 51 页；只有构建插件耗时提示。
- 无窗口 Edge 已验证 1440 / 599 / 390 / 320px、系统 reduced-motion 开启时的实际播放、暂停、自动换幕、匹配舞台比例与无横向溢出；对应截图已查看。最终验收脚本退出码 0，临时浏览器及本地服务均已关闭。
- 首次 headless 启动受 Codex 沙箱限制；无窗口验收在授权环境执行。系统 TEMP 中 Edge 的 LOCK 文件导致 Playwright 自动清理等待，已将验收使用的独立 profile / artifacts 改放项目 ignored build 目录，最终退出码 0；没有改动网站代码或用户浏览器配置来规避环境问题。
- 项目没有独立 lint / type-check 命令，不把 SFC 编译称为完整类型检查。

## 边界与工作区状态

教学图形、文字与镜头由合成模板编排；真实产品像素来自离屏渲染。PPT 状态为 fixture 注入，本次不构成真实 Office / WPS 或损坏 COM 设备的端到端测试。没有打开普通软件或可见浏览器窗口，也没有更改用户 Office / COM 配置。

临时 native harness 源码已按原始字节还原。solution 构建后，原生仓库的 `inkPixelShader.cso` 和 `inkVertexShader.cso` 显示为修改；构建前内容未留存，因此没有擅自还原它们。Debug EXE 包含显式开关控制的导出适配，常规启动路径没有变更；如需原始 Debug 二进制，按 native README 重新构建。

本次未改动既有 `design-drafts/`、`docs.zip`、`NewHome2/` 和 `docs/new-index2.md`。发布时需要同步 `public/feature-media/`，若使用 123pan 外链则上传并更新对应直链。
