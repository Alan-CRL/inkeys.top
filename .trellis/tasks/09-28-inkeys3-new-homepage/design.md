# Design: Inkeys3 新主页

## 路由与外壳

- 页面：`docs/new-index.md`，frontmatter `pageLayout: NewHome`、`sidebar: false`、`aside: false`、`head` 注入 `robots: noindex`。
- Plume 的 `VPContent.vue` 对未知 `pageLayout` 值渲染同名全局组件：`<component :is="frontmatter.pageLayout" />`，因此导航栏、页脚、深浅色切换都保留。
- 不能使用 `pageLayout: custom`：Plume `Layout.vue` 在 `custom` 时整体移除 `.vp-layout`（包括导航栏）。
- `NewHome` 在 `docs/.vuepress/client.ts` 全局注册（Plume 按名称解析，属于必须全局注册的情形），其余子组件在 `NewHome/` 目录内局部导入。

## 组件树

```text
docs/.vuepress/theme/components/NewHome/
|-- NewHome.vue          根组件，设计 token，区块顺序，异步区块
|-- newHome.data.ts      全部文案与媒体槽位（类型 + 数据）
|-- icons.ts             UI3 图标 ?raw 导入映射
|-- icons/*.svg          从 Inkeys3 复制，占位色替换为 currentColor
|-- useReveal.ts         滚动出现（IntersectionObserver）
|-- HeroSection.vue      首屏：标题、展示舞台、主栏、轮播状态机
|-- FeatureStage.vue     展示舞台（功能文案 + MediaSlot，切换过渡）
|-- Ui3Bar.vue           主按钮 + 主栏复刻，指针光
|-- Ui3BarButton.vue     单个按钮（2x2 / 2x1），进度条
|-- MediaSlot.vue        图片 / 视频 / 占位，视频可见时才播放
|-- Ui3Section.vue       UI3 bento（异步）
|-- Draw3Section.vue     Draw3 性能、美化、笔效果（异步）
|-- StrokeDemo.vue       Canvas2D 笔迹演示（原始 / 平滑 / 笔锋）
|-- MoreFeatures.vue     更多功能（异步）
`-- DownloadCta.vue      下载区块（异步）
```

下方区块使用 `defineAsyncComponent`：客户端代码拆分，SSR 仍输出完整 HTML（利于正式替换首页后的 SEO）。真正重的部分（Canvas 动画、视频）按可见性启动。

## 设计 Token

定义在 `.nh-root`，深色覆盖在 `[data-theme='dark'] .nh-root`（Plume 使用 `html[data-theme]`）。

| Token | 浅色 | 深色 | 说明 |
|---|---|---|---|
| `--nh-bg` | `var(--vp-c-bg)` | `var(--vp-c-bg)` | 与导航栏、页脚无缝衔接 |
| `--nh-accent` | `#008C69` | `#58FFEC` | UI3 Accent |
| `--nh-bar-surface` | `rgba(247,248,250,.8)` | `rgba(24,24,24,.8)` | UI3 Surface * 0.8 |
| `--nh-bar-frame` | `rgba(0,0,0,.18)` | `rgba(255,255,255,.18)` | UI3 Frame * 0.18 |
| `--nh-radius-lg` / `xl` | 24 / 32 px | 同 | 大圆角卡片 |
| `--nh-ease-out` | `cubic-bezier(.33,1,.68,1)` | 同 | EaseOutCubic |
| `--nh-ease-back` | `cubic-bezier(.34,1.4,.64,1)` | 同 | EaseOutBack(1.1) 近似 |

卡片层次：半透明 surface + 1px 边框 + 多层柔和阴影，深色下以内高光（inset 顶边）代替阴影。避免使用 `.item` 类名：`custom.css` 对全局 `.item:hover` 施加位移。

## 首屏

- 顺序：状态胶囊（小圆点）→ 大标题 → 副标题 → CTA（下载 / 了解更多）→ 舞台 → 主栏悬浮在舞台底边之上 → 下滑提示。
- 舞台象征“屏幕”：大圆角容器，内含功能文案卡与媒体槽位；主栏像软件一样浮在屏幕底部中央。
- 轮播状态机：`activeId` + `paused`。进度由 CSS `animation`（5 s，scaleX 0→1）驱动，在 `animationend` 时切到下一个；暂停使用 `animation-play-state: paused`，因此计时与进度条天然同步，无需定时器。
- 暂停条件：指针在主栏或舞台内、主栏内有焦点、`document.hidden`、首屏不在视口、`prefers-reduced-motion`。
- 指针光：`pointermove` 经 rAF 合并后写入 CSS 变量 `--lx/--ly`，用于主栏边缘光（mask 只露出 1px 边框）和按钮底层点光源。

## 主栏复刻

- 尺寸：按钮 70 / 32.5，间距 5，按钮圆角 4，主栏高 80、圆角 8，主按钮 80x80 超椭圆（n = 3，SSR 安全的纯函数生成 SVG path，用于 `clip-path` 与边框描边）。
- 按钮组：A1（选择、软笔、形状、橡皮、撤回、清空）| 更多、设置 | A2 白板、定格（2x1 上下叠放）。结束放映仅 PPT 场景出现，不复刻。
- 状态：`selected`（软笔为当前工具，Accent 着色，同软件）；`active`（当前介绍项，悬停底色 + 进度条）。
- 动效：`:active` 缩放 0.95（EaseOutCubic），释放 0.4 s EaseOutBack；悬停 0.24 s。
- 小屏：主栏容器 `overflow-x: auto`，隐藏滚动条，保持原尺寸。

## Draw3 演示

- `StrokeDemo.vue`：预设一条手写曲线；“原始”加入抖动噪声，“平滑”对点做加权滑动平均，“笔锋”按速度与首尾位置计算宽度并以多边形填充。
- 只在可见时逐帧绘制，循环“书写 → 停留 → 淡出”；DPR 感知，`ResizeObserver` 调整尺寸；颜色每帧读取 CSS 变量，主题切换后自动跟随；减少动效时只绘制完整静态帧。
- 笔效果卡用 SVG 表达：软笔（变宽填充）、硬笔（等宽）、激光笔（红色核心 + 光晕 + 淡出动画）、荧光笔（宽半透明扁头）、刷子（虚线轮廓 + “即将推出”）。

## 性能与无障碍

- 动画只用 transform / opacity；`backdrop-filter` 仅用于主栏与舞台文案卡。
- 所有浏览器 API 在 `onMounted` 中使用，并在 `onBeforeUnmount` 清理 observer / 监听 / rAF。
- 媒体：图片 `loading="lazy"` + `decoding="async"`；视频 `preload="none"`、静音循环、可见才播放。
- 主栏按钮：`<button type="button">`、`aria-label`、`aria-pressed`（selected）、`aria-controls` 指向舞台；舞台使用 `aria-live="polite"`。

## 回滚

所有改动为新增文件，外加 `client.ts` 一行注册。删除 `docs/new-index.md`、`NewHome/` 目录和注册行即可完全回滚。
