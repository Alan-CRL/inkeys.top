# 执行计划：S1“屏幕批注”卡片的循环视频

依据 [prd.md](./prd.md) 和 [design.md](./design.md)。用户于 2026-11-16 要求开始制作，任务已切到进行中。用户要求先不导出，在 Remotion Studio 里预览。

## 批次

| 批次 | 内容 | 审阅点 | 状态 |
| --- | --- | --- | --- |
| 0 | 规划：调查、创意方向、样张、分镜 | 用户已确认方向、样张、分镜、题材、颜色 | 已完成 |
| 1 | 建立 `media/nh3-remotion/` 工程，复核本机渲染环境 | 能渲染出一帧空白卡片 | 已完成 |
| 2 | 墨迹：软笔模型、荧光笔、三道笔迹的采样点，出墨迹测试片 | **用户单独审阅软笔的笔锋与速度粗细** | 已实现，等用户在 Studio 里审阅（`InkTest-*`） |
| 3 | 主栏：导出六张原生状态图并裁切 | 自查：状态、语言、合并式、锚点一致 | 已完成 |
| 4 | 画面：屏幕框、三种示例内容、内容切换、主栏滑动与状态切换，按分镜合成 | 浅色、深色各出关键帧给用户看 | 已实现，等用户在 Studio 里预览 |
| 5 | 整片渲染、编码、封面；逐帧自查和独立终检 | 用户看成片 | 未开始 |
| 6 | 接入 `/new-index3` 的卡片 | `pnpm docs:build`，24 种组合检查 | 未开始 |
| 7 | 把制作经验补进规范 | — | 持续进行 |

批次 2 和批次 3 互不依赖，可以同时进行：批次 3 的导出适配修改交给 Codex（写补丁、静态核对），构建和运行由 Claude 执行。

## 各批次要点

### 批次 1 工程

- 按 design.md 第 7 节建目录。开工前调用 `remotion:remotion-best-practices` 等技能确认当前版本的写法。
- 复核 Windows ARM64 下的运行方式（便携 x64 Node），把结论写进规范。
- 写一个抽帧脚本：指定帧号输出 PNG，用于每次修改后的自查。

### 批次 2 墨迹（最先给用户看的东西）

- `ink/softPen.ts`：按 design.md 第 5 节实现，输入带时间的采样点和当前时刻，输出带半径的点。
- 采样点手工编排，满足 design.md“笔迹路线的要求”：收笔顺着圆的走向自然重叠，不向外甩。
- 测试片：只有墨迹，放大 2–3 倍，浅色底和深色底各一段，含常速和四分之一速；附上与原生终帧的叠图。
- 按 design.md 第 5 节“四项检查”逐条自查并留下抽帧：对位、笔锋、颜色、速度。笔迹的目标位置从示例内容的布局常量算出，不单独写死。
- 调用 `animate`、`choreograph`、`apple-design` 技能核对节奏；调用 `review-animations` 复查。
- 用户不通过：先按意见调参数或路线；确认做不到再改用硬笔，并更新 design.md。

### 批次 3 主栏

- 以 `media/inkeys3-theme-promo/native/` 为基础，复制到本任务自己的目录再改，不动原适配。
- 状态：Soft Pen、Highlight（笔色 `FFC510`）、Soft Pen＋Freeze；各出浅色、深色。
- 遵守 `native-media-guidelines.md`：独立输出目录、哈希绑定、源码按字节还原、构建用 `InkeysRepo.sln Debug|ARM64`，超时至少 5 分钟。
- 软件仓库是 `D:\Project\Inkeys\Repo\Inkeys`。构建前确认工作区干净；有他人改动时停下来问用户。

### 批次 4–5 合成与成片

- 各段起止帧写在 `Card.tsx` 的时间线节点上，与 design.md 第 4 节一致；有出入时先改文档再改代码。
- 每个镜头先出静帧自查，再整片渲染，用 ffmpeg 抽帧回看循环接缝（第 599 帧与第 0 帧）。
- 交付前派一个干净上下文的子代理按 video-shotcraft 的 `final-review.md` 做独立终检，输入包括成片、关键帧、本任务的 prd 与 design。
- 调用 `animation-performance` 核对网页端播放（同时三个视频时的解码与合成开销）。

### 批次 6 接入

- 改 `SectionAbilities.vue`、`MediaSlot.vue`（或新增视频部件）；遵守前端规范：单引号、无分号、2 空格缩进。
- 进入视口播放、离开暂停；深浅色切换时换文件；减少动态效果时显示封面。
- 窄屏按 design.md 第 8 节“窄屏的比例”实现：三档断点，视频贴底铺满；断点附近的宽度逐个截图检查。

## 进度记录（2026-11-16）

- 工程建好，Studio 可用（预览配置 `remotion-studio`，端口 3123）。Windows ARM64 需要 x64 的 Node 这一条已复核属实。
- 主栏：Codex（gpt-6.1-sol，High）在 `media/nh3-remotion/native/` 写了独立的导出适配，只做了静态核对；Claude 执行构建和导出，一次通过。
  六次捕获 `failures=0`，软件仓库按字节还原、工作区干净；`toolbar-state.json` 记录的实际状态与预期一致（en-US、合并式、Highlight 文案、Freeze 选中）。
- 墨迹：软笔按软件规则实现，书写速度按“弯得越急走得越慢”的人手规律生成；抽帧确认书写途中最前端一直有笔锋，三道墨迹都对在目标上。
- 主栏动画：按下、换内容、水波已实现并抽帧核对，深浅两版无接缝。
- 还没做：成片导出（用户要求先在 Studio 里预览）、独立终检、接入网页。

## 验证命令

```bash
# 网站构建
pnpm docs:build

# Remotion：见 media/nh3-remotion/README.md
node media/nh3-remotion/scripts/run.mjs studio --port=3123
node media/nh3-remotion/scripts/run.mjs still Preview-Light-zh media/nh3-remotion/out/stills/120.png --frame=120
```

## 回退

- Remotion 工程和成片都是新增文件，删除 `media/nh3-remotion/` 与 `public/feature-media/new-index3/s1/` 即可回退。
- 网页接入只改 S1 卡片；回退到当前的占位实现即可。
- 原生导出的临时适配由安装脚本按字节还原；构建产物放在独立目录。

## 留到后面的事

- PPT 演示、自由白板两张卡片：这一张通过后再开。
- S2 的三段场景视频。
