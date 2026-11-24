# 2026-10-25 单片交付：屏幕定格／单摆受力分析

## 状态与范围

本轮 `screen-freeze` 已完成 Remotion 制作、实际渲染、视觉迭代和本地官网接入。用户明确选择了此片。继续原 `09-28-inkeys3-new-homepage` 任务，父任务保持 `in_progress`；其他视频不在本轮范围。未 commit / push，未部署远程网站。

## 交付

- `media/inkeys3-remotion/`：独立 React / Remotion 4.0.534 项目、pnpm lockfile、原生素材准备、构图时间轴、渲染与验收脚本、README。
- `docs/.vuepress/public/feature-media/screen-freeze.mp4`：1440×640、60fps、14s，288616 bytes。
- `screen-freeze-mobile.mp4`：720×720、60fps、14s，232145 bytes。
- 两张 WebP poster、960×426 / 15fps / 14s README GIF，以及逐场景 provenance / verification。
- 本片五个媒体合计 1199967 bytes。两版 MP4 使用静音 H.264、yuv420p、faststart；先 2 倍尺寸渲染再缩采样。
- 只把本场景 manifest 时长改为 14000ms，播放器和官网根依赖保持原样。其他 35 个媒体文件哈希独立核对未变。
- 旧场景五个文件及原 manifest / provenance / verification 位于 ignored `media/inkeys3-remotion/build/previous-public/`，可按 README 恢复。

## 设计与实际视觉迭代

原试片的摆球和受力图占比过小，浏览器中存在大面积空白。新版以大单摆和关联角度曲线建立运动，再在真实按钮 Up 时停止背景，让批注继续发生。最终用跨语言数学关系式收束，不烘焙宣传标题或长句。

1. 第一轮关键帧发现整体推近裁掉主栏和曲线，改为固定浏览器/主栏，只对教学画面与墨迹做后期取景。
2. 修正浏览器锁图标 SVG 相对弧线参数；收紧最终桌面取景，避免 θ 标签被切半。
3. 原 native 箭头从 `(900,260)` 出发，旧背景按另一组单摆参数计算球心。新版以真实交点反推支点，消除球心与箭头错位。
4. 用真实主栏按压像素得到 Freeze / Shape 热点，Down/Up 与序列一致；定格提交126帧、Geometry提交210帧，后者保留冻结。
5. 原生实线/虚线按 60fps 原速播放。mg、T、Fₜ 分步提交后才出现标签；Fₜ 为 mg 切向分量，虚线平行四边形的对角线为 mg。
6. 手机独立取景；最终结果停留超过3秒。初始运动、一次镜头调整、实线、虚线和结果各有清晰节奏，书写阶段不移动镜头。

## 验证证据

- Remotion TypeScript 检查通过；Node、PowerShell、Python 脚本语法通过；独立依赖 frozen-lockfile 离线安装核验通过。项目未配置 lint，不宣称 lint 通过。
- 449 张消费原生 PNG 的 SHA256、RGBA/尺寸、共享画布、事件、exporter/manifest 校验通过；重复准备输出幂等。
- 两版 MP4 均完整解码为840帧／14秒／60fps，无音轨。WebP尺寸、GIF210帧／14000ms／loop0、全部文件hash通过。
- 126→173帧冻结背景平均RGB差：桌面0.0054、手机0.0110；0→72帧运动差分别1.8775、2.5923，证明动态背景确实停止。
- 查看两版实际编码 MP4 的29个代表／动作边界帧、接触表、原尺寸结果与首末帧；观察墨迹起点、提交、虚线、文字、裁切和主栏。
- `verify-feature-media.cjs` 通过：SFC/style、SSR、媒体时钟、暂停/隐藏、ended、换源、失败回退与清理。
- `pnpm docs:build` 通过，exit0，51页；仅既有构建插件耗时提示。
- `scripts/check-site.cjs` 通过：headless Edge，1440/390/320px，系统 reduced-motion 开启，正确60fps媒体尺寸、14秒时长、真实暂停与 ended换幕、无横向溢出。
- 桌面真实连续播放从0到13.983333秒，最终轮833次呈现回调；保存11个实际播放画面并查看镜头、书写中段与结尾。呈现回调计数不是文件帧数，文件840帧已由完整解码单独确认。
- 已查看真实网页桌面与320px卡片截图。结果截图等待 `seeked` 和浏览器绘制，避免误把跳转前画面当成结果。
- Remotion Studio 两个 composition 已注册，使用无窗口浏览器确认 `/ScreenFreeze` 实际预览加载；截图在 `build/studio-check.png`。
- 独立 `trellis-check` 审查无确认缺陷，详见 `remotion-review.md`。

## 环境问题与边界

官网没有新增 Remotion 依赖。Windows ARM64 主机上 Remotion 的 Windows compositor 仅有x64，使用项目 `.cache/` 内经官方 SHA256 核验的便携 x64 Node。没有更改系统 PATH、全局配置或原生仓库。

沙箱曾阻止 npm DNS、本地浏览器 WebSocket 和部分x64子进程；在授权执行环境完成验证。官方空白脚手架模板下载被重置后，使用等价的最小空白项目与锁定版本依赖。Remotion精简FFmpeg没有select/palettegen，验收复用已有剪映FFmpeg；这些是工具环境限制，不是视频或网站源码缺陷。

浏览器壳、单摆、角度曲线、数学符号、输入箭头和后期镜头属于教学/编辑层；真实产品主栏与墨迹来自原生生产渲染器的离屏fixture。Shape样式预设不代表完整设置教程；原生未捕获Shape工具光标，所以绘制期间不伪造PenIcon。数学字体使用Windows Georgia/Times。没有打开普通交互GUI，也未进行真实Office/COM端到端测试。

发布时需同步本片公共资源及相关manifest，若使用123pan外链则更新对应直链。其他七段的后续改进仍留在原任务中。
